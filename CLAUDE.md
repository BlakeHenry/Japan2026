# Japan 2026 trip site

A static Astro site presenting our trip itinerary as a scrollytelling page
(sticky city panel on the left, day cards scrolling on the right), deployed
to GitHub Pages automatically on every push to `main`.

## How to add or edit a trip stop (the most common task)

Each stop is one markdown file in `src/content/stops/`. To add a place or
event, create a new file there — no layout or code changes needed. Example:

```markdown
---
title: teamLab Planets
city: Tokyo
category: activity
date: 2026-11-07
time: "10:00"
link: https://www.teamlab.art/e/planets/
addedBy: Blake
---

Digital art museum in Toyosu. Book tickets ~2 weeks ahead; go on a weekday.
```

Frontmatter fields (validated by `src/content.config.ts`):

- `title` (required)
- `city` (required) — must exactly match a segment's `city` to appear on the page
- `category` (required) — one of `food`, `sight`, `activity`, `stay`, `travel`
- `date` (optional, YYYY-MM-DD) — WITH a date the stop renders as a
  reservation card pinned to that day; WITHOUT one it renders once in the
  city's "While in {city}" list (use this for things that span the stay)
- `time` (optional, "HH:MM" in quotes) — orders reservations within a day
- `link` (optional, full URL)
- `addedBy` (optional) — who suggested it

The markdown body is a short free-form description. Stops whose date or
city matches no segment are listed in an "Not on the itinerary yet" strip
at the bottom (and warned about at build time) instead of disappearing.

## Trip segments (one file per contiguous stay)

Each leg of the trip is one markdown file in `src/content/segments/`
(e.g. `01-tokyo.md`). Segments drive the page: their date ranges generate
the day cards, and stops attach to them by `date` or `city`.

```markdown
---
city: Tokyo
start: 2026-11-06
end: 2026-11-09        # inclusive last full day; ranges must not overlap
lodging:
  name: Hotel Gracery Shinjuku
  link: https://shinjuku.gracery.com/   # optional
heroImage: ../../assets/segments/tokyo.jpg
heroAlt: Shibuya scramble crossing lit up at night
tagline: Neon, backstreets, and the best breakfast on earth   # optional
---

Free-form notes about this leg, shown at the end of its section.
```

To replace a placeholder photo, drop your own image into
`src/assets/segments/` and point `heroImage` at it (Astro resizes and
optimizes at build time). Current placeholders are openly licensed
(source/license noted in an HTML comment in each segment file).

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (also validates all frontmatter)

Run `npm run build` after content changes to confirm nothing broke.

## Structure

- `src/pages/index.astro` — the homepage, composes hero + segment sections
- `src/content/segments/*.md` — one file per contiguous stay (city + lodging + dates)
- `src/content/stops/*.md` — one file per trip stop
- `src/content.config.ts` — frontmatter schemas for both collections
- `src/lib/itinerary.ts` — build-time helper: expands segment date ranges
  into days and attaches stops (all date math in UTC)
- `src/layouts/Base.astro` — HTML shell and global design tokens
- `src/components/` — `Hero`, `SegmentSection` (sticky panel + scroll
  column), `DayCard`, `StopCard`, `Footer`
- `src/assets/segments/` — city photos, processed via `astro:assets`
- `.github/workflows/deploy.yml` — GitHub Pages deployment

The parallax/scroll effects are pure CSS scroll-driven animations behind
`@supports (animation-timeline: view())` — no JavaScript. Reduced-motion
users and older browsers get the same page without motion.
