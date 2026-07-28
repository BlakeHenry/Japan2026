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
    // Optional until the itinerary firms up
    date: z.coerce.date().optional(),
    link: z.string().url().optional(),
    addedBy: z.string().optional(),
  }),
});

export const collections = { stops };
