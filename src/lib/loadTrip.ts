import { getCollection, render } from 'astro:content';
import { buildItinerary, dateKey, formatRange } from './itinerary';
import type { Itinerary } from './itinerary';
import { TRIP } from './trip';

/**
 * One warm, ink-friendly accent per city, cycled if the trip grows.
 * Positional, not per-city — reordering segments reassigns colours.
 */
export const ACCENTS = ['#c3423f', '#3f7059', '#b06f2e', '#8c5a74'];

export interface TripData {
  itinerary: Itinerary;
  /** Pre-rendered markdown bodies, keyed by collection entry id */
  stopContent: Map<string, any>;
  segmentContent: Map<string, any>;
  /** "Oct 13 – Oct 27" — the booked trip window, not a derived span */
  dateRange: string;
  cities: string[];
  /**
   * Every distinct glyph used by a segment's `cityJa`, for the subset brush
   * font. Derived rather than hardcoded so the font request and the content
   * can never disagree — the old constant had to be edited by hand and
   * silently rendered the wrong face when someone forgot.
   */
  kanjiSubset: string;
  accentFor: (index: number) => string;
}

/**
 * Every page loads the trip the same way. Astro layouts can't return data,
 * so this is a plain function rather than a layout.
 *
 * A build calls this six times — once in the map route's getStaticPaths, once
 * per generated city page, and once for the index — each rendering every
 * markdown body and re-emitting the warnings below. Cached so a real content
 * warning prints once and reads as one problem.
 */
let cached: Promise<TripData> | null = null;

export function loadTrip(): Promise<TripData> {
  // Not in dev: the module outlives a request there, so a cache would keep
  // serving the previous render after a content edit Vite invalidated.
  if (import.meta.env.DEV) return build();
  if (!cached) cached = build();
  return cached;
}

async function build(): Promise<TripData> {
  const segments = await getCollection('segments');
  const stops = await getCollection('stops');
  const itinerary = buildItinerary(segments, stops);

  // Markdown bodies must be rendered in a frontmatter context (render() is
  // async), so every body is rendered once here and the Content components
  // are handed down as props.
  const stopContent = new Map(
    await Promise.all(
      stops.map(async (s) => [s.id, (await render(s)).Content] as const)
    )
  );
  const segmentContent = new Map(
    await Promise.all(
      segments.map(async (s) => [s.id, (await render(s)).Content] as const)
    )
  );

  // Segments are legs carved out of the booked window. One that falls outside
  // it is either a typo or a trip that got rebooked — say so either way.
  for (const { segment } of itinerary.segments) {
    const { city, start, end } = segment.data;
    if (start < TRIP.start || end > TRIP.end) {
      console.warn(
        `[itinerary] segment "${city}" (${dateKey(start)} – ${dateKey(end)}) ` +
          `falls outside the trip window ${dateKey(TRIP.start)} – ` +
          `${dateKey(TRIP.end)} — fix the segment, or the dates in src/lib/trip.ts`
      );
    }
  }

  const kanjiSubset = [
    ...new Set(
      itinerary.segments.flatMap((si) => [...(si.segment.data.cityJa ?? '')])
    ),
  ].join('');

  return {
    itinerary,
    stopContent,
    segmentContent,
    // From the booked window, not from the segments: the dates are settled
    // even when no city has been picked yet.
    dateRange: formatRange(TRIP.start, TRIP.end),
    cities: itinerary.segments.map((si) => si.segment.data.city),
    kanjiSubset,
    accentFor: (index) => ACCENTS[index % ACCENTS.length],
  };
}
