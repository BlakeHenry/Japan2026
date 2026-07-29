import { getCollection, render } from 'astro:content';
import { buildItinerary, formatRange } from './itinerary';
import type { Itinerary } from './itinerary';

/**
 * One warm, ink-friendly accent per city, cycled if the trip grows.
 * Positional, not per-city — reordering segments reassigns colours.
 */
export const ACCENTS = ['#c3423f', '#3f7059', '#b06f2e', '#8c5a74'];

/**
 * The exact glyphs in the subset Reggae One face loaded by Base.astro.
 * A cityJa glyph missing from here does NOT fail loudly — it silently falls
 * back to a generic serif that usually *has* the glyph, so it renders wrong
 * rather than absent. Hence the build-time warning below.
 */
export const KANJI_SUBSET = '東京箱根都大阪';

export interface TripData {
  itinerary: Itinerary;
  /** Pre-rendered markdown bodies, keyed by collection entry id */
  stopContent: Map<string, any>;
  segmentContent: Map<string, any>;
  /** "Oct 13 – Oct 27" across the whole trip */
  dateRange: string;
  cities: string[];
  accentFor: (index: number) => string;
}

/**
 * Every page loads the trip the same way. Astro layouts can't return data,
 * so this is a plain function rather than a layout.
 */
export async function loadTrip(): Promise<TripData> {
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

  for (const { segment } of itinerary.segments) {
    const ja = segment.data.cityJa;
    if (!ja) continue;
    const missing = [...ja].filter((g) => !KANJI_SUBSET.includes(g));
    if (missing.length > 0) {
      console.warn(
        `[fonts] cityJa "${ja}" uses ${missing.join('')} which is not in the ` +
          `Reggae One subset — extend the text= param in src/layouts/Base.astro`
      );
    }
  }

  const first = itinerary.segments[0].segment.data;
  const last = itinerary.segments[itinerary.segments.length - 1].segment.data;

  return {
    itinerary,
    stopContent,
    segmentContent,
    dateRange: formatRange(first.start, last.end),
    cities: itinerary.segments.map((si) => si.segment.data.city),
    accentFor: (index) => ACCENTS[index % ACCENTS.length],
  };
}
