import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_KEYS } from './lib/categories';
import { TRAVEL_MODE_KEYS } from './lib/travel';

// Every stop on the trip is one markdown file in src/content/stops/.
// The schema below is validated at build time, so a bad entry fails the
// build instead of silently breaking the site. Every field here is rendered
// somewhere — don't add fields the UI doesn't show.
const stops = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stops' }),
  schema: () =>
    z.object({
      title: z.string(),
      city: z.string(),
      // Picks the filter bucket (Coffee / Food / Sights / Shops) via
      // src/lib/categories.ts and the map-pin glyph.
      category: z.enum(CATEGORY_KEYS),
      // A stop WITH a date is a scheduled event (collapsible "Scheduled"
      // section); without one it's a free-roaming idea, which is what most
      // of this trip is.
      date: z.coerce.date().optional(),
      // 24h "HH:MM" — orders scheduled events within a day
      time: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      // Official site or booking page. The row links here when the stop has
      // no coordinates — see the row-link priority in CLAUDE.md.
      link: z.string().url().optional(),
      // Coordinates are what light up the maps: a pin on the city chart, the
      // preview card in the panel, and a row that opens Google Maps.
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    }),
});

// One markdown file per contiguous stay (city + lodging + date range) in
// src/content/segments/. Segments must not overlap; `end` is the last full
// day in that city, and `city` must exactly match the stops' `city` values.
// One leg of getting somewhere. `mode` picks the glyph (src/lib/travel.ts);
// `text` is the whole human-readable line. No status field on purpose — a leg
// only exists once it's booked, so its absence is what "not booked yet" looks
// like.
const leg = z.object({
  mode: z.enum(TRAVEL_MODE_KEYS),
  text: z.string(),
});

const segments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/segments' }),
  schema: ({ image }) =>
    z
      .object({
        city: z.string(),
        start: z.coerce.date(),
        end: z.coerce.date(),
        // Optional: a stay with nowhere booked yet still belongs on the
        // itinerary, and the card says so rather than disappearing.
        lodging: z
          .object({
            name: z.string(),
            // Neighbourhood or one-line orientation — "Shinjuku, by the
            // station". Not an address.
            area: z.string().optional(),
            link: z.string().url().optional(),
          })
          .optional(),
        // How we get here and how we leave. Both optional and both filled in
        // as things are booked.
        arrive: z.array(leg).optional(),
        depart: z.array(leg).optional(),
        // Optional so a city can join the itinerary before anyone has a
        // photo of it — CityPhoto and the route rail each render a designed
        // "no photo yet" state instead. Alt text stays mandatory whenever
        // there IS a photo (see the refine below).
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        tagline: z.string().optional(),
        // Native-script city name, drawn as brush calligraphy behind the
        // Latin name on the mobile hero. Any glyph used here must also be
        // in the subset font <link> in src/layouts/Base.astro — loadTrip()
        // warns at build time if one is missing.
        cityJa: z.string().optional(),
      })
      .refine((s) => s.end >= s.start, { message: 'end must be >= start' })
      .refine((s) => !s.heroImage || !!s.heroAlt, {
        message: 'heroAlt is required when heroImage is set',
      }),
});

// One markdown file per day trip in src/content/daytrips/. A day trip is a
// sub-location of a base: it gets its own panel and rail entry, but no dates
// (which day is still unchosen) and no lodging (we sleep at the base) — both
// absences are by design, not fields waiting to be filled in.
const daytrips = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/daytrips' }),
  schema: ({ image }) =>
    z
      .object({
        // Display name — also the section slug, so "Himeji + Kobe" and any
        // future name must slug uniquely against the segment cities
        // (buildItinerary fails the build on a collision).
        name: z.string(),
        // Must exactly match a segment's `city`, the same way stops do.
        parent: z.string(),
        cityJa: z.string().optional(),
        // The handwritten aside — renders where a base shows its dates.
        note: z.string().optional(),
        // Stop-matching keys for a combined outing ("Himeji + Kobe" claims
        // stops in either town). Defaults to [name], so single-town trips
        // don't set it.
        cities: z.array(z.string()).optional(),
        // Getting there and back from the base. Same rule as segment legs:
        // a leg exists once it's booked, absence reads "Nothing booked yet."
        there: z.array(leg).optional(),
        back: z.array(leg).optional(),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        tagline: z.string().optional(),
      })
      .refine((d) => !d.heroImage || !!d.heroAlt, {
        message: 'heroAlt is required when heroImage is set',
      }),
});

export const collections = { stops, segments, daytrips };
