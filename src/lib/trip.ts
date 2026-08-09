/**
 * The parts of the trip that are settled.
 *
 * Everything else — cities, lodging, places — is content under
 * `src/content/`, and the site derives itself from whatever is there. This is
 * the exception: the destination and the dates are booked, and they have to
 * survive a completely empty itinerary, so they can't be derived from
 * segments the way they used to be.
 *
 * Dates are UTC midnight to match the rest of the date handling (see the note
 * at the top of itinerary.ts). Month is 0-indexed: 9 is October.
 */
export const TRIP = {
  name: 'Japan',
  year: 2026,
  // The day we leave home (and PTO starts), not the day we land in Japan —
  // Oct 12 is spent in the air and the overview grid says so.
  start: new Date(Date.UTC(2026, 9, 12)),
  end: new Date(Date.UTC(2026, 9, 27)),
} as const;

/** "Japan 2026" — the site title, used for <title> and the hero */
export const TRIP_TITLE = `${TRIP.name} ${TRIP.year}`;
