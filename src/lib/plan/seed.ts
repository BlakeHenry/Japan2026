/**
 * The committed plan, as a TripDoc.
 *
 * Runs at build time and gets serialized into /overview/ as the island's
 * starting point: the plan you see in a fresh browser is whatever is in
 * `src/content/` right now. Everything after that is localStorage.
 *
 * Two things here are load-bearing:
 *
 *   1. Every node keeps the RAW text of its file (`import.meta.glob('?raw')`),
 *      not a projection of the validated data — see frontmatter.ts for why.
 *   2. Runs of days no segment claims become real `kind: 'gap'` nodes, so the
 *      timeline tiles the whole window. That is how the fly-out day, the
 *      fly-home day and the open Oct 17–18 stretch get a bar to drag.
 */

import type { Itinerary } from '../itinerary';
import { dateKey } from '../itinerary';
import { TRIP } from '../trip';
import type { PlanDayTrip, PlanStop, SourceFile, TripDoc } from './doc';
import { fromDayNumber, hashDoc, toDayNumber } from './doc';
import { roundTripDiff } from './export';
import { splitMarkdown } from './frontmatter';

/**
 * Fixed rather than random (the mockup randomizes): the colours must be the
 * same on every build, or a rebuild would look like a content change to
 * `hashDoc` and every stop would shift hue for no reason.
 */
const BASE_HUE = 12;
const GOLDEN_ANGLE = 137.508;
const hueAt = (k: number): number => (BASE_HUE + k * GOLDEN_ANGLE) % 360;

/**
 * Every content file's raw text, keyed by repo-relative path. Eager because
 * the seed is built in a page's frontmatter, where a dynamic import can't be
 * awaited per-entry without serializing the whole build.
 */
const RAW_FILES = import.meta.glob<string>('/src/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function sourceFor(collection: string, id: string): SourceFile | undefined {
  const path = `src/content/${collection}/${id}.md`;
  const raw = RAW_FILES[`/${path}`];
  if (raw === undefined) {
    console.warn(`[plan] no raw source for ${path} — edits to it can't be exported`);
    return undefined;
  }
  const { frontmatter, body } = splitMarkdown(raw);
  return { path, frontmatter, body };
}

export function seedDoc(itinerary: Itinerary): TripDoc {
  const windowStart = toDayNumber(dateKey(TRIP.start));
  const windowEnd = toDayNumber(dateKey(TRIP.end));

  // Where each segment sits in the window, in order.
  const placed = itinerary.segments
    .map((si) => ({
      si,
      from: toDayNumber(dateKey(si.segment.data.start)) - windowStart,
      to: toDayNumber(dateKey(si.segment.data.end)) - windowStart,
    }))
    .filter((p) => p.to >= 0 && p.from <= windowEnd - windowStart)
    .sort((a, b) => a.from - b.from);

  const stops: PlanStop[] = [];
  let cursor = 0;
  let hueIndex = 0;

  const pushGap = (days: number, name: string) => {
    if (days <= 0) return;
    stops.push({
      id: `gap-${cursor}`,
      kind: 'gap',
      name,
      days,
      hue: 0,
      trips: [],
    });
  };

  for (const { si, from, to } of placed) {
    pushGap(from - cursor, cursor === 0 ? 'In transit' : 'Open');
    cursor = Math.max(cursor, from);
    const days = to - from + 1;
    const { data } = si.segment;

    const trips: PlanDayTrip[] = si.dayTrips.map((dt) => {
      const on = dt.trip.data.date
        ? toDayNumber(dateKey(dt.trip.data.date)) - windowStart - from
        : null;
      return {
        id: dt.trip.id,
        source: sourceFor('daytrips', dt.trip.id),
        name: dt.trip.data.name,
        // A date outside the parent's stay is authored wrong; treat it as
        // unpinned rather than drawing a pill past the end of the bar.
        day: on !== null && on >= 0 && on < days ? on : null,
        matchKeys: dt.trip.data.cities ?? [dt.trip.data.name],
        explicitCities: dt.trip.data.cities !== undefined,
      };
    });

    stops.push({
      id: si.slug,
      kind: 'stay',
      source: sourceFor('segments', si.segment.id),
      name: data.city,
      cityJa: data.cityJa,
      days,
      travelHours: data.travelHours,
      hue: hueAt(hueIndex++),
      trips,
    });
    cursor = to + 1;
  }

  // The tail of the window is the way home, unless nothing was placed at all.
  pushGap(windowEnd - windowStart + 1 - cursor, cursor === 0 ? 'In transit' : 'Heading home');

  const doc: TripDoc = {
    version: 1,
    baseHash: '',
    window: { start: fromDayNumber(windowStart), end: fromDayNumber(windowEnd) },
    baseHue: BASE_HUE,
    hueCount: hueIndex,
    stops,
  };
  doc.baseHash = hashDoc(doc);

  // The export has to be lossless, and the cheapest place to prove it is here,
  // on every build, against the real content: seed the committed plan, export
  // it untouched, and require the files to come back byte-identical. A
  // mismatch means EXPORT would silently rewrite something nobody edited, so
  // it fails the build the way a duplicate slug does rather than warning.
  const problems = roundTripDiff(doc);
  if (problems.length > 0) {
    throw new Error(
      `[plan] export is not lossless — the committed plan does not survive a ` +
        `round trip:\n  - ${problems.join('\n  - ')}`
    );
  }

  return doc;
}
