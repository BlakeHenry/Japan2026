import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_KEYS } from './lib/categories';

// Every stop on the trip is one markdown file in src/content/stops/.
// The schema below is validated at build time, so a bad entry fails the
// build instead of silently breaking the site. Every field here is rendered
// somewhere — don't add fields the UI doesn't show.
const stops = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stops' }),
  schema: ({ image }) =>
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
      link: z.string().url().optional(),
      // Small photo shown as a mini polaroid on the row. Drop the file in
      // src/assets/stops/ and reference it relative to the markdown file,
      // e.g. ../../assets/stops/blue-bottle.jpg
      image: image().optional(),
      imageAlt: z.string().optional(),
      // Plots the stop in the map panel (basemap integration is tabled,
      // pins already render)
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    }),
});

// One markdown file per contiguous stay (city + lodging + date range) in
// src/content/segments/. Segments must not overlap; `end` is the last full
// day in that city, and `city` must exactly match the stops' `city` values.
const segments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/segments' }),
  schema: ({ image }) =>
    z
      .object({
        city: z.string(),
        start: z.coerce.date(),
        end: z.coerce.date(),
        lodging: z.object({
          name: z.string(),
          link: z.string().url().optional(),
        }),
        heroImage: image(),
        heroAlt: z.string(),
        tagline: z.string().optional(),
        // Native-script city name, drawn as brush calligraphy behind the
        // Latin name on the mobile hero. Any glyph used here must also be
        // in the subset font <link> in src/layouts/Base.astro — loadTrip()
        // warns at build time if one is missing.
        cityJa: z.string().optional(),
      })
      .refine((s) => s.end >= s.start, { message: 'end must be >= start' }),
});

export const collections = { stops, segments };
