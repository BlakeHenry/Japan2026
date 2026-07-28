# Japan 2026 🇯🇵

Our itinerary for the 2026 Japan trip, as a site instead of a shared doc.
Scroll through it here: **https://japantrip2026.io**

It's a scrollytelling page — a sticky city panel on the left, day-by-day
cards scrolling past on the right — built with [Astro](https://astro.build)
and deployed automatically to GitHub Pages on every push to `main`.

## Adding or editing a stop

This is the thing you'll do most: add a restaurant, sight, activity, or
booking to the trip. Each stop is one markdown file in
[`src/content/stops/`](src/content/stops/) — no code changes required.

Create a new file, e.g. `src/content/stops/teamlab-planets.md`:

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

Fields:

| Field      | Required | Notes                                                                                                     |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `title`    | yes      | Name of the place/event                                                                                      |
| `city`     | yes      | Must exactly match a segment's `city` to show up on the page                                                 |
| `category` | yes      | One of `food`, `sight`, `activity`, `stay`, `travel`                                                         |
| `date`     | no       | `YYYY-MM-DD`. **With** a date, it's a reservation card pinned to that day. **Without** one, it lands in the city's "While in {city}" list — use this for things that span the whole stay |
| `time`     | no       | `"HH:MM"` (quoted) — orders same-day reservations                                                            |
| `link`     | no       | Booking page, website, map, etc.                                                                             |
| `addedBy`  | no       | Who suggested it                                                                                              |

The markdown body is a short free-form description — tips, booking notes,
whatever's useful.

If a stop's `date` or `city` doesn't match any trip segment (see below),
it still shows up — in a "Not on the itinerary yet" strip at the bottom of
the page — and `npm run build` will warn about it. Nothing silently
disappears.

## Trip segments (the legs of the trip)

Each contiguous stay in one city is a file in
[`src/content/segments/`](src/content/segments/), e.g. `01-tokyo.md`.
Segments are what actually drive the page: their date ranges generate the
day cards, and stops attach to a day by `date`, or to the segment generally
by `city`.

```markdown
---
city: Tokyo
start: 2026-11-06
end: 2026-11-09
lodging:
  name: Hotel Gracery Shinjuku
  link: https://shinjuku.gracery.com/
heroImage: ../../assets/segments/tokyo.jpg
heroAlt: Shibuya scramble crossing lit up at night
tagline: Neon, backstreets, and the best breakfast on earth
---

Free-form notes about this leg, shown at the end of its section.
```

`end` is the inclusive last full day of the stay, and segment date ranges
must not overlap. You'd only add a new segment file if the trip itself
changes (a new city, a split stay, etc.) — most contributions are stops,
not segments.

To swap in a real photo for a placeholder, drop an image into
`src/assets/segments/` and point `heroImage` at it — Astro resizes and
optimizes it at build time. The current placeholders are openly licensed;
each segment file has a comment noting the source/license.

## Running it locally

```bash
npm install
npm run dev
```

Before pushing content changes, run a production build once to make sure
nothing broke (this also validates all the frontmatter above):

```bash
npm run build
```

## Contributing

1. Branch off `main`.
2. Add/edit stop or segment files as above.
3. Run `npm run build` to catch schema errors and typos.
4. Open a PR into `main`.

No build step is required to review content changes — the frontmatter is
plain markdown and reads fine in a diff.

## Deployment

Every push to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the Astro site and deploys it to GitHub Pages, served at the
custom domain **japantrip2026.io** (configured via [`public/CNAME`](public/CNAME)
and DNS). There's no separate deploy step to run — merging is publishing.

## Project structure

```
src/
  pages/index.astro       homepage: hero + segment sections
  content/segments/*.md   one file per contiguous stay (city, lodging, dates)
  content/stops/*.md      one file per trip stop
  content.config.ts       frontmatter schemas for both collections
  lib/itinerary.ts        build-time helper: expands segments into days, attaches stops
  layouts/Base.astro      HTML shell + global design tokens
  components/             Hero, SegmentSection, DayCard, StopCard, Footer
  assets/segments/        city photos (processed via astro:assets)
.github/workflows/deploy.yml   GitHub Pages deployment
```

The scroll/parallax effects are pure CSS (`animation-timeline: view()`) —
no JavaScript. Reduced-motion users and older browsers get the same page
without the motion.
