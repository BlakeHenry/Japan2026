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
      // Official site or booking page. The row links here when the stop has
      // no coordinates — see the row-link priority in CLAUDE.md.
      link: z.string().url().optional(),
      // Coordinates are what light up the maps: a pin on the city chart, the
      // preview card in the panel, and a row that opens Google Maps.
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      // Optional chip thumbnail (src/assets/stops/). Decorative — the chip's
      // title is the label, so there's no alt field; a stop without one falls
      // back to its category glyph in the same tile.
      image: image().optional(),
    }),
});

// One markdown file per contiguous stay (city + lodging + date range) in
// src/content/segments/. Segments must not overlap; `end` is the last full
// day in that city, and `city` must exactly match the stops' `city` values.
// One leg of getting somewhere. `mode` picks the glyph (src/lib/travel.ts);
// `text` is the whole human-readable line. No status field on purpose — legs
// are the pencilled route (added once a route is chosen, updated when it's
// actually booked), and an empty list is what "nothing planned yet" looks
// like.
const leg = z
  .object({
    mode: z.enum(TRAVEL_MODE_KEYS),
    text: z.string(),
    // The short label for this leg: a flight number once there is one
    // ("AA 190"), otherwise the service ("Nozomi", "Ltd Exp Azusa") or the
    // airline. NOTHING RENDERS THIS TODAY — the overview grid printed it and
    // the row became unreadable. Kept because it's a fact a human chose and
    // it's what a real booking carries; keep filling it in.
    service: z.string().optional(),
    // Approximate door-to-door hours. Rough on purpose; omit when nobody has
    // an estimate yet. This is what the overview grid's Travel row shows,
    // and the only part of a leg it shows.
    hours: z.number().positive().max(24).optional(),
    // Which calendar day(s) the leg occupies on the overview grid, when the
    // default is wrong (an arrive leg defaults to its segment's start day, a
    // depart leg to the day after its segment's end). Date-only values —
    // NEVER a datetime, which zod would coerce in the build machine's local
    // zone and shift the day. Clock time rides `lands` instead.
    departs: z.coerce.date().optional(),
    // Only when the leg lands on a different day than it leaves (the
    // overnight transpacific flights). The grid paints every day it spans.
    arrives: z.coerce.date().optional(),
    // Local clock times, 24h "HH:MM" — quotes required on both, or YAML
    // reads 15:00 as the sexagesimal number 900 (same trap as a stop's
    // `time`). `leaves` is when we set off, `lands` when we get in. Like
    // `service`, both are authored and currently rendered nowhere — the grid
    // shows a leg's hours, not its clock.
    leaves: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    lands: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
  })
  .refine((l) => !(l.departs && l.arrives) || l.arrives >= l.departs, {
    message: 'arrives must be >= departs',
  });

const segments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/segments' }),
  schema: ({ image }) =>
    z
      .object({
        city: z.string(),
        start: z.coerce.date(),
        end: z.coerce.date(),
        // Door-to-door hours to get HERE from the previous stop — the one
        // transit fact /overview/ draws (a pill at the stay's start boundary,
        // plus the per-schedule totals). Decimal hours, authored BARE and in
        // JS canonical number form (0.5, 2.5, 3) — export emits `String(n)`,
        // so any other spelling fails the round-trip assertion. Never on the
        // first segment (that arrival is the international flight, which
        // stays on `arrive`); omit while the route between two cities is
        // still unchosen and the timeline shows a dashed placeholder.
        travelHours: z.number().positive().max(24).optional(),
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
        // Transportation. Authored on the ARRIVING side: each city's `arrive`
        // says how we get to it. Only the last city carries `depart` (the
        // flight home) — everything else's onward travel is the next city's
        // arrival.
        arrive: z.array(leg).optional(),
        depart: z.array(leg).optional(),
        // NOTE: there is deliberately no per-day "this day is travel" field.
        // A day eaten by travel is its own stop with no segment file — the
        // hatched TRAVEL bars on /overview/ — not a flag on a stay. The
        // earlier `arrivalIsTransit` / `transitDays` fields said it the other
        // way and were removed; don't reintroduce them.
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
        // Which day of the trip this outing is pencilled for. Optional
        // because "we'll fit it in somewhere" is a real state — an undated
        // trip hangs off the middle of its base as a dashed pill. Date-only,
        // never a datetime (zod would coerce it in the build machine's local
        // zone and shift the day), and it must fall inside the parent's stay.
        date: z.coerce.date().optional(),
        cityJa: z.string().optional(),
        // The handwritten aside — renders where a base shows its dates.
        note: z.string().optional(),
        // Stop-matching keys for a combined outing ("Himeji + Kobe" claims
        // stops in either town). Defaults to [name], so single-town trips
        // don't set it.
        cities: z.array(z.string()).optional(),
        // Getting there and back from the base — pencilled routes, same
        // shape as a segment's legs. NOTHING RENDERS THESE: a day trip has no
        // date, so it has no column on the overview grid, and the grid is the
        // only place legs show. Authored anyway, for when it does.
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
