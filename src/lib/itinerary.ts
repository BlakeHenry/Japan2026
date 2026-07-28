import type { CollectionEntry } from 'astro:content';

type Segment = CollectionEntry<'segments'>;
type Stop = CollectionEntry<'stops'>;

export interface Day {
  date: Date;
  /** 1-based day number across the whole trip */
  tripDayNumber: number;
  reservations: Stop[];
}

export interface SegmentItinerary {
  segment: Segment;
  days: Day[];
  /** Undated stops for this city, shown once per segment */
  pool: Stop[];
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

export function expandDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    days.push(new Date(t));
  }
  return days;
}

export function buildItinerary(segments: Segment[], stops: Stop[]): Itinerary {
  const ordered = [...segments].sort(
    (a, b) => a.data.start.getTime() - b.data.start.getTime()
  );

  const dated = stops.filter((s) => s.data.date);
  const undated = stops.filter((s) => !s.data.date);
  const placed = new Set<string>();

  let tripDayNumber = 0;
  const result = ordered.map((segment) => {
    const days = expandDays(segment.data.start, segment.data.end).map((date) => {
      tripDayNumber += 1;
      const reservations = dated
        .filter((s) => dateKey(s.data.date!) === dateKey(date))
        .sort((a, b) => (a.data.time ?? '99:99').localeCompare(b.data.time ?? '99:99'));
      reservations.forEach((s) => placed.add(s.id));
      return { date, tripDayNumber, reservations };
    });

    const pool = undated
      .filter((s) => s.data.city === segment.data.city)
      .sort((a, b) => a.data.title.localeCompare(b.data.title));
    pool.forEach((s) => placed.add(s.id));

    return { segment, days, pool };
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
