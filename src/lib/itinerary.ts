import type { CollectionEntry } from 'astro:content';

type Segment = CollectionEntry<'segments'>;
type Stop = CollectionEntry<'stops'>;
type DayTrip = CollectionEntry<'daytrips'>;

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

  // Every section slug shares one `:target` namespace on /plan/. A collision
  // doesn't error anywhere on its own — it just quietly breaks navigation and
  // the generated rail-highlight CSS — so it fails the build the way a bad
  // frontmatter field would.
  const slugs = [
    ...ordered.map((s) => citySlug(s.data.city)),
    ...daytrips.map((t) => citySlug(t.data.name)),
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

  let tripDayNumber = 0;
  const result = ordered.map((segment) => {
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

    const ideas = undated
      .filter((s) => s.data.city === segment.data.city)
      .sort(byTitle);
    ideas.forEach((s) => placed.add(s.id));

    const dayTrips = daytrips
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
