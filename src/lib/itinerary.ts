import type { CollectionEntry } from 'astro:content';
import type { TravelMode } from './travel';

type Segment = CollectionEntry<'segments'>;
type Stop = CollectionEntry<'stops'>;
type DayTrip = CollectionEntry<'daytrips'>;
type SegmentLeg = NonNullable<Segment['data']['arrive']>[number];

export interface Day {
  date: Date;
  /** 1-based day number across the whole trip */
  tripDayNumber: number;
  reservations: Stop[];
}

export interface DayTripItinerary {
  trip: DayTrip;
  /** citySlug(name) — the section id and the rail sub-entry's anchor */
  slug: string;
  /** Undated stops whose `city` matches one of the trip's matching keys */
  ideas: Stop[];
}

export interface SegmentItinerary {
  segment: Segment;
  /**
   * The section id, rail anchor, and /map/ route param for this stay.
   * Usually `citySlug(city)` — but a city visited twice gets `-2` on the
   * return stay, so every stay has its own anchor.
   */
  slug: string;
  days: Day[];
  /** Undated stops — the free-roaming ideas that are most of this trip */
  ideas: Stop[];
  /** Dated stops in this segment, flattened and sorted by date then time */
  booked: Stop[];
  /** ideas ∪ booked — everything in this city (feeds the map pins) */
  all: Stop[];
  counts: { ideas: number; booked: number; total: number };
  /** Day trips out of this base, in collection-id order */
  dayTrips: DayTripItinerary[];
}

export interface Itinerary {
  segments: SegmentItinerary[];
  /** Stops that matched no segment day / city — rendered so nothing is lost */
  unscheduled: Stop[];
}

// All frontmatter dates are parsed by zod as UTC midnight, so matching and
// day arithmetic must stay in UTC to avoid off-by-one days in other timezones.
const DAY_MS = 24 * 60 * 60 * 1000;

export const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Collection ids can contain slashes (`placeholders/coffee-shop-1`). That is
 * legal in an HTML id but breaks `querySelector('#…')` and CSS selectors, so
 * every id that becomes a DOM id or a JS key goes through here first.
 */
export const stopSlug = (id: string): string =>
  id.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');

/** The DOM id a stop's card carries, so anything can scroll to it */
export const stopDomId = (id: string): string => `stop-${stopSlug(id)}`;

/**
 * The slug for a city or day-trip name. The `#tokyo` hero pill, the
 * `<section id>`, the `segmentId` both islands scope themselves to, and the
 * `/map/<city>/` route param all have to agree, so they all come from here.
 * Strips punctuation, not just spaces — "Himeji + Kobe" must not put a `+`
 * (a CSS combinator) into the build-time-generated `:has(#…:target)` rules.
 */
export const citySlug = (city: string): string =>
  city
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Deep link into Google Maps, for directions and hours on the day.
 *
 * Queries the coordinate rather than the title: a name search can resolve to
 * a same-named place in the wrong city, and the coordinate is the one thing
 * we know is right. Uses the documented Maps URLs API.
 */
export const googleMapsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;

export function expandDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    days.push(new Date(t));
  }
  return days;
}

const byTitle = (a: Stop, b: Stop) => a.data.title.localeCompare(b.data.title);

const byDateThenTime = (a: Stop, b: Stop) => {
  const d = dateKey(a.data.date!).localeCompare(dateKey(b.data.date!));
  if (d !== 0) return d;
  return (a.data.time ?? '99:99').localeCompare(b.data.time ?? '99:99');
};

/**
 * JSON-serializable stop data for client components (the map island).
 * Deliberately contains no markdown — islands can't render Astro <Content />.
 */
export interface MapPoint {
  id: string;
  slug: string;
  domId: string;
  title: string;
  category: string;
  lat?: number;
  lng?: number;
  dated: boolean;
}

export const mapPoints = (si: SegmentItinerary): MapPoint[] =>
  si.all.map((s) => ({
    id: s.id,
    slug: stopSlug(s.id),
    domId: stopDomId(s.id),
    title: s.data.title,
    category: s.data.category,
    lat: s.data.lat,
    lng: s.data.lng,
    dated: Boolean(s.data.date),
  }));

/** A day trip claims stops by these `city` values — `cities` when set (a
    combined outing like "Himeji + Kobe" spans two towns), else its name. */
const dayTripKeys = (t: DayTrip): string[] => t.data.cities ?? [t.data.name];

export function buildItinerary(
  segments: Segment[],
  stops: Stop[],
  daytrips: DayTrip[] = []
): Itinerary {
  const ordered = [...segments].sort(
    (a, b) => a.data.start.getTime() - b.data.start.getTime()
  );

  const segmentCities = new Set(ordered.map((s) => s.data.city));
  for (const t of daytrips) {
    if (!segmentCities.has(t.data.parent)) {
      console.warn(
        `[itinerary] day trip "${t.data.name}" (${t.id}) names parent ` +
          `"${t.data.parent}" which matches no segment city — it renders nowhere`
      );
    }
    for (const key of dayTripKeys(t)) {
      if (segmentCities.has(key)) {
        console.warn(
          `[itinerary] day trip "${t.data.name}" matches stops by "${key}", ` +
            `but that's a segment city — the segment claims those stops first, ` +
            `so they'll never reach the day trip`
        );
      }
    }
  }

  // A route can come back to a city it already visited — the last night
  // before a flight home is the usual reason — so the same `city` may carry
  // more than one segment. They still need distinct anchors, so the second
  // and later stays get a numbered slug (`tokyo`, `tokyo-2`). Only the FIRST
  // stay in a city claims that city's ideas and day trips (see below): a
  // one-night stopover isn't a second copy of everything there is to do.
  const seenCities = new Map<string, number>();
  const segmentSlugs = ordered.map((s) => {
    const base = citySlug(s.data.city);
    const nth = (seenCities.get(base) ?? 0) + 1;
    seenCities.set(base, nth);
    return nth === 1 ? base : `${base}-${nth}`;
  });

  // Every section slug shares one `:target` namespace on /overview/. A
  // collision doesn't error anywhere on its own — it just quietly breaks
  // navigation and the generated band-highlight CSS — so it fails the build
  // the way a bad frontmatter field would.
  const slugs = [
    ...segmentSlugs,
    ...daytrips.map((t) => citySlug(t.data.name)),
    'overview',
    'unscheduled',
  ];
  const dupes = [...new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))];
  if (dupes.length > 0) {
    throw new Error(
      `[itinerary] duplicate section slug(s): ${dupes.join(', ')} — every ` +
        `segment city and day-trip name must slug uniquely`
    );
  }

  const dated = stops.filter((s) => s.data.date);
  const undated = stops.filter((s) => !s.data.date);
  const placed = new Set<string>();
  // The first stay in each city is the one that owns its ideas and day trips
  const claimedCities = new Set<string>();

  let tripDayNumber = 0;
  const result = ordered.map((segment, segmentIndex) => {
    const booked: Stop[] = [];
    const days = expandDays(segment.data.start, segment.data.end).map((date) => {
      tripDayNumber += 1;
      const reservations = dated
        .filter((s) => dateKey(s.data.date!) === dateKey(date))
        .sort((a, b) => (a.data.time ?? '99:99').localeCompare(b.data.time ?? '99:99'));
      reservations.forEach((s) => {
        // Dated stops attach by date alone, so a wrong `city` is otherwise
        // completely invisible — the stop just quietly shows up under another
        // city and never appears in `unscheduled`.
        if (s.data.city !== segment.data.city) {
          console.warn(
            `[itinerary] booked stop "${s.data.title}" says city ` +
              `"${s.data.city}" but its date lands in ${segment.data.city} — ` +
              `dated stops attach by date, so check which one is wrong`
          );
        }
        placed.add(s.id);
        booked.push(s);
      });
      return { date, tripDayNumber, reservations };
    });

    // A return stay leaves the ideas and day trips with the first one —
    // otherwise every chip and every day-trip panel would exist twice, and
    // the duplicated panels would collide on their slugs.
    const firstStay = !claimedCities.has(segment.data.city);
    claimedCities.add(segment.data.city);

    const ideas = firstStay
      ? undated.filter((s) => s.data.city === segment.data.city).sort(byTitle)
      : [];
    ideas.forEach((s) => placed.add(s.id));

    const dayTrips = (firstStay ? daytrips : [])
      .filter((t) => t.data.parent === segment.data.city)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((t) => {
        const keys = dayTripKeys(t);
        const tripIdeas = undated
          .filter((s) => keys.includes(s.data.city))
          .sort(byTitle);
        tripIdeas.forEach((s) => placed.add(s.id));
        return { trip: t, slug: citySlug(t.data.name), ideas: tripIdeas };
      });

    booked.sort(byDateThenTime);
    const all = [...ideas, ...booked];

    return {
      segment,
      slug: segmentSlugs[segmentIndex],
      days,
      ideas,
      booked,
      all,
      counts: { ideas: ideas.length, booked: booked.length, total: all.length },
      dayTrips,
    };
  });

  const unscheduled = stops.filter((s) => !placed.has(s.id));
  for (const s of unscheduled) {
    console.warn(
      `[itinerary] stop "${s.data.title}" (${s.id}) matched no segment` +
        (s.data.date ? ` day ${dateKey(s.data.date)}` : ` city "${s.data.city}"`)
    );
  }

  return { segments: result, unscheduled };
}

const utc = { timeZone: 'UTC' } as const;

export const formatDay = (d: Date): string =>
  d.toLocaleDateString('en-US', { ...utc, weekday: 'short', month: 'short', day: 'numeric' });

export const formatShort = (d: Date): string =>
  d.toLocaleDateString('en-US', { ...utc, month: 'short', day: 'numeric' });

export function formatRange(start: Date, end: Date): string {
  return `${formatShort(start)} – ${formatShort(end)}`;
}

/**
 * A stay reads the way a hotel booking does: arrival day through checkout
 * morning. `end` is the last full day we're in the city, so checkout is the
 * day after — "Oct 13–17" for a stay whose last full day is the 16th.
 * formatRange() stays as-is for the map pages, which are listing days we're
 * in the city rather than describing a booking.
 */
export function formatStay(start: Date, end: Date): string {
  const checkout = new Date(end);
  checkout.setUTCDate(checkout.getUTCDate() + 1);
  const sameMonth = start.getUTCMonth() === checkout.getUTCMonth();
  const tail = sameMonth
    ? checkout.toLocaleDateString('en-US', { ...utc, day: 'numeric' })
    : formatShort(checkout);
  return `${formatShort(start)}–${tail}`;
}

/**
 * A compact inclusive window — "Oct 12–27", month shown once when shared.
 * Not formatStay: the window's end IS the last day, no checkout +1. The
 * rail's overview card wears this.
 */
export function formatWindow(start: Date, end: Date): string {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const tail = sameMonth
    ? end.toLocaleDateString('en-US', { ...utc, day: 'numeric' })
    : formatShort(end);
  return `${formatShort(start)}–${tail}`;
}

/** "~16h", "~2.5h", "~30m" — the overview grid's shorthand for a leg's hours */
export function formatHours(h: number): string {
  if (h < 1) return `~${Math.round(h * 60)}m`;
  return `~${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

// --- The whole-trip calendar ------------------------------------------------
// buildTripCalendar() flattens an itinerary onto the trip window for the
// overview grid: one entry per calendar day — including the days no
// segment claims, which is exactly how the fly-out and fly-home days get onto
// the page — plus the column spans the grid draws as city bands and day-trip
// floats.

/** One leg's slice of one calendar day */
export interface TripDayTravel {
  mode: TravelMode;
  /** The full human-readable leg line — tooltip / sr context on the chip */
  text: string;
  /** Short label — flight number or service name ("AA 190", "Nozomi") */
  service?: string;
  hours?: number;
  /** Departure clock time — set only on the entry for the leg's first day */
  leaves?: string;
  /** Landing clock time — set only on the entry for the leg's arrival day */
  lands?: string;
  /** Which slice of the leg this day holds */
  role: 'only' | 'depart' | 'arrive' | 'via';
}

export interface TripDay {
  date: Date;
  key: string;
  /** Preformatted UTC labels — "Mon", 12 */
  weekday: string;
  monthDay: number;
  /** Index into itinerary.segments; undefined on segment-less travel days */
  segmentIndex?: number;
  travel: TripDayTravel[];
  /**
   * Columns this day's travel block may spread across: itself plus the
   * following days that have no travel of their own. The overview draws
   * nothing on empty days, so a leg gets that room for its service name
   * instead of being squeezed into one day's width.
   */
  travelSpan: number;
}

export interface CalendarBand {
  kind: 'city' | 'transit' | 'home' | 'arriving';
  label: string;
  labelJa?: string;
  /** City bands only — the #<city> anchor */
  slug?: string;
  /** City bands only — feeds accentFor() */
  segmentIndex?: number;
  /** City bands only — the stay's lodging, for the overview's Sleeping row */
  lodging?: { name: string; area?: string; link?: string };
  /** 0-based column and column count */
  start: number;
  span: number;
}

/** An undated day trip, floating under its parent city's columns */
export interface CalendarFloat {
  name: string;
  /** The day trip's own panel anchor — the float links there */
  slug: string;
  parentSlug: string;
  start: number;
  span: number;
  /** 0-based stacking row within the parent, so Nara and Uji don't overlap */
  row: number;
}

export interface TripCalendar {
  days: TripDay[];
  /** Stay spans — one per segment, unbroken by `arrivalIsTransit`. Feeds the
      Sleeping row (a hotel is still needed on the arrival night) and floats. */
  bands: CalendarBand[];
  /** The City row's spans — a stay's `arrivalIsTransit` day splits off as
      its own 'arriving' band instead of joining the city's strip. */
  cityBands: CalendarBand[];
  floats: CalendarFloat[];
}

/** How far a travel block may spread when the days after it are empty */
const MAX_TRAVEL_SPAN = 4;

export function buildTripCalendar(
  itinerary: Itinerary,
  start: Date,
  end: Date
): TripCalendar {
  const dates = expandDays(start, end);
  const indexByKey = new Map(dates.map((d, i) => [dateKey(d), i] as const));

  const days: TripDay[] = dates.map((date) => ({
    date,
    key: dateKey(date),
    weekday: date.toLocaleDateString('en-US', { ...utc, weekday: 'short' }),
    monthDay: date.getUTCDate(),
    segmentIndex: undefined,
    travel: [],
    travelSpan: 1,
  }));

  const placeLeg = (leg: SegmentLeg, defaultDay: Date) => {
    const from = leg.departs ?? leg.arrives ?? defaultDay;
    const to = leg.arrives ?? leg.departs ?? defaultDay;
    const span = expandDays(from, to);
    const n = span.length;

    let clamped = false;
    span.forEach((d, i) => {
      const at = indexByKey.get(dateKey(d));
      if (at === undefined) {
        clamped = true;
        return;
      }
      const role =
        n === 1 ? 'only' : i === 0 ? 'depart' : i === n - 1 ? 'arrive' : 'via';
      days[at].travel.push({
        mode: leg.mode,
        text: leg.text,
        service: leg.service,
        hours: leg.hours,
        leaves: role === 'depart' || role === 'only' ? leg.leaves : undefined,
        lands: role === 'arrive' || role === 'only' ? leg.lands : undefined,
        role,
      });
    });
    if (clamped) {
      console.warn(
        `[itinerary] leg "${leg.text}" spans days outside the trip window — ` +
          `clamped to the days that fit`
      );
    }
  };

  // A stay's first day, when `arrivalIsTransit` says a long landing eats it —
  // used only to split the City row below; the Sleeping row and floats stay
  // on the untouched `bands` grouping, since the night's lodging still
  // starts on arrival regardless.
  const arrivalTransit: boolean[] = days.map(() => false);

  itinerary.segments.forEach((si, segmentIndex) => {
    for (const day of si.days) {
      const at = indexByKey.get(dateKey(day.date));
      if (at === undefined) continue; // outside the window — loadTrip warns
      days[at].segmentIndex = segmentIndex;
    }

    const { data } = si.segment;
    const checkout = new Date(data.end);
    checkout.setUTCDate(checkout.getUTCDate() + 1);
    for (const leg of data.arrive ?? []) placeLeg(leg, data.start);
    for (const leg of data.depart ?? []) placeLeg(leg, checkout);

    if (data.arrivalIsTransit) {
      const at = indexByKey.get(dateKey(data.start));
      if (at !== undefined) arrivalTransit[at] = true;
    }
  });

  // Empty days draw nothing, so a travel day's block may spread into the
  // quiet days after it — that's the room the service names live in.
  days.forEach((day, i) => {
    if (day.travel.length === 0) return;
    let span = 1;
    while (
      span < MAX_TRAVEL_SPAN &&
      i + span < days.length &&
      days[i + span].travel.length === 0
    ) {
      span += 1;
    }
    day.travelSpan = span;
  });

  // Contiguous runs of days become bands: each city one tinted strip, the
  // leading segment-less days "In transit", the trailing ones "Heading home".
  const bands: CalendarBand[] = [];
  for (let i = 0; i < days.length; ) {
    const seg = days[i].segmentIndex;
    let j = i;
    while (j < days.length && days[j].segmentIndex === seg) j += 1;
    if (seg !== undefined) {
      const si = itinerary.segments[seg];
      const { city, cityJa, lodging } = si.segment.data;
      bands.push({
        kind: 'city',
        label: city,
        labelJa: cityJa,
        slug: si.slug,
        segmentIndex: seg,
        lodging,
        start: i,
        span: j - i,
      });
    } else {
      bands.push({
        kind: j === days.length ? 'home' : 'transit',
        label: j === days.length ? 'Heading home' : 'In transit',
        start: i,
        span: j - i,
      });
    }
    i = j;
  }

  // The City row's own grouping: identical to `bands` except an
  // `arrivalIsTransit` day breaks off its city's strip into its own
  // 'arriving' ghost, matching the "In transit" / "Heading home" treatment
  // of the segment-less edge days.
  const cityBands: CalendarBand[] = [];
  for (let i = 0; i < days.length; ) {
    const seg = days[i].segmentIndex;
    const arriving = seg !== undefined && arrivalTransit[i];
    let j = i;
    while (
      j < days.length &&
      days[j].segmentIndex === seg &&
      (seg === undefined || arrivalTransit[j] === arriving)
    ) {
      j += 1;
    }
    if (seg !== undefined && arriving) {
      cityBands.push({ kind: 'arriving', label: 'Arriving', segmentIndex: seg, start: i, span: j - i });
    } else if (seg !== undefined) {
      const si = itinerary.segments[seg];
      const { city, cityJa } = si.segment.data;
      cityBands.push({
        kind: 'city',
        label: city,
        labelJa: cityJa,
        slug: si.slug,
        segmentIndex: seg,
        start: i,
        span: j - i,
      });
    } else {
      cityBands.push({
        kind: j === days.length ? 'home' : 'transit',
        label: j === days.length ? 'Heading home' : 'In transit',
        start: i,
        span: j - i,
      });
    }
    i = j;
  }

  const floats: CalendarFloat[] = [];
  for (const band of bands) {
    if (band.kind !== 'city') continue;
    const si = itinerary.segments[band.segmentIndex!];
    si.dayTrips.forEach((dt, row) => {
      floats.push({
        name: dt.trip.data.name,
        slug: dt.slug,
        parentSlug: band.slug!,
        start: band.start,
        span: band.span,
        row,
      });
    });
  }

  return { days, bands, cityBands, floats };
}
