import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every stop on the trip is one markdown file in src/content/stops/.
// The schema below is validated at build time, so a bad entry fails the
// build instead of silently breaking the site.
const stops = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stops' }),
  schema: z.object({
    title: z.string(),
    city: z.string(),
    category: z.enum(['food', 'sight', 'activity', 'stay', 'travel']),
    // Optional until the itinerary firms up. A stop WITH a date shows as a
    // reservation on that day; without one it shows in the city's
    // "While in {city}" list.
    date: z.coerce.date().optional(),
    // 24h "HH:MM" — orders reservations within a day
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    link: z.string().url().optional(),
    addedBy: z.string().optional(),
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
      })
      .refine((s) => s.end >= s.start, { message: 'end must be >= start' }),
});

export const collections = { stops, segments };
