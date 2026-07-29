# Japan 2026 trip site

A static Astro site presenting our trip as browse-first city guides: each
city is a section with a sticky panel (photo, dates, lodging, and a linked
map preview card) on the left and a filterable two-column list of ideas
scrolling on the right. Each city also has its own full-screen map page at
`/map/<city>/` — list beside a big map, the way you'd browse a saved list in
Google Maps. Deployed to GitHub Pages automatically on every push to `main`.

## Current state: blank slate

**Only the destination and the dates are settled** — Japan, Oct 13–27 2026,
in [`src/lib/trip.ts`](src/lib/trip.ts). There are no segments and no stops
yet; `src/content/segments/` and `src/content/stops/` hold nothing but a
`.gitkeep`. The site builds to a hero, an honest "No cities yet", and a 404.

Everything below describes machinery that is written, tested, and dormant —
it wakes up as soon as you add the first file. The first thing to add is a
segment (a city), because stops attach to one; a stop whose `city` matches no
segment lands in the "Not on the itinerary yet" strip instead of a city list.

`src/lib/trip.ts` is the one place the trip's own facts live. It's a code
constant rather than content because the dates have to survive an entirely
empty itinerary — they used to be derived from the first and last segment,
which meant deleting the cities erased the dates too. Segments are legs
carved out of that window, and the build warns if one falls outside it.

## How to add a trip stop (the most common task)

One markdown file in `src/content/stops/` per place. Copy this template,
delete the optional lines you don't need, and run `npm run build` to
validate:

```markdown
---
title: Blue Bottle Kiyosumi          # required
city: Tokyo                          # required — must exactly match a segment's city
category: coffee                     # required — see valid keys below
date: 2026-10-15                     # optional — ONLY for booked reservations
time: "19:00"                        # optional — 24h "HH:MM", quotes required
link: https://example.com/           # optional — official site / booking page
lat: 35.6812                         # optional — see "Coordinates" below
lng: 139.7671                        # optional — pairs with lat
---

One or two short sentences. Rendered in handwriting under the title —
keep it to a margin note, not a paragraph. **No markdown links in the body**
(see the rules below).
```

Rules:

- **No `date` → the stop is an idea**: it appears in the city's filterable
  list, to be wandered into at leisure. This is the default and the norm.
- **With `date` → the stop is a scheduled event**: it appears only in the
  collapsible "Scheduled" section at the top of its city, never in the
  ideas list. Only use `date` for actual bookings (dinner reservations,
  timed tickets).
- **Dated stops attach by date, not by city.** A booked stop lands in
  whichever segment its `date` falls inside; its `city` is only checked so
  the build can warn you when the two disagree. Read the build output.
- Stops whose `city`/`date` match no segment show up in a **"Not on the
  itinerary yet"** strip at the bottom of the page, and warn at build time,
  rather than silently vanishing.
- **No markdown links in a stop's body.** The whole row is an `<a>`, and a
  nested link is invalid HTML — the parser unnests it, which lifts the row
  out of its city section and silently kills that row's map-pin highlighting
  and filtering. Put the URL in `link:` instead.
- Do NOT add frontmatter fields beyond the template — the schema in
  `src/content.config.ts` is intentionally minimal and every field is
  rendered. Extra keys are silently ignored.

### Coordinates are what light up the maps

`lat`/`lng` are optional, but they're the single highest-value thing you can
add to a stop. With them, the stop gets a pin on the city chart, its city
gets a preview card in the sticky panel linking to `/map/<city>/`, and its
row opens Google Maps.

A city with **no** coordinates anywhere deliberately hides its preview card
and its mobile map link, and `/map/<city>/` shows an empty chart — a blank
card linking to a blank page is worse than no card. All of it reappears on
its own as soon as one coordinate lands.

To get a coordinate: right-click the spot in Google Maps and the `lat, lng`
is the first item in the menu — click to copy.

### What a row links to

One target per row, in this order:

1. `lat`/`lng` → Google Maps at that coordinate (new tab)
2. otherwise `link` → that URL (new tab)
3. otherwise the row isn't a link at all

So a stop with **both** coordinates and a `link` opens Maps, not the site —
on the day, "where is it" beats "what are its hours", and the venue's site
is one tap away inside Maps. Booked stops keep their `link` in the Scheduled
block regardless.

Valid `category` keys (defined in `src/lib/categories.ts`):
`coffee food bar market shop temple shrine museum view walk hike onsen
sight activity stay travel`

The category picks the map-pin glyph and which filter button matches the
stop: **Coffee** = coffee · **Food** = food, bar, market · **Sights** =
temple, shrine, museum, view, walk, hike, onsen, sight, activity ·
**Shops** = shop. (`travel` and `stay` only appear under "All".)

Stops have no photo of their own — the rows are a dense two-column list and a
thumbnail that small earned nothing. Only segments carry an image (their
`heroImage`).

## Trip segments (one file per contiguous stay)

Each leg is one markdown file in `src/content/segments/` (e.g.
`01-tokyo.md`). Segments drive the page: one city section per segment,
date ranges shown in the panel, stops attach by `city` (ideas) or `date`
(scheduled).

```markdown
---
city: Tokyo
cityJa: "東京"          # optional — brush kanji behind the mobile hero. The
                        # subset font URL is derived from these, so nothing
                        # to keep in sync; with no cityJa anywhere the font
                        # isn't requested at all.
start: 2026-10-13
end: 2026-10-16         # inclusive last full day; ranges must not overlap
lodging:
  name: Hotel Gracery Shinjuku
  link: https://shinjuku.gracery.com/   # optional
heroImage: ../../assets/segments/tokyo.jpg
heroAlt: Shibuya scramble crossing lit up at night
tagline: Neon, backstreets, and the best breakfast on earth   # optional
---

Free-form notes about this leg, shown at the end of its section.
```

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build; **this is the validation step** for
  all frontmatter. Run it after any content change.

## Environment variables

Copy `.env.example` to `.env` (gitignored) and fill in. Both are `PUBLIC_`
and therefore inlined into the shipped bundle — the Maps JS SDK runs in the
browser, so the key is visible to anyone who views source. That is Google's
intended model; abuse is bounded by a daily quota cap (~300 loads, keeping
usage under the 10,000/month free tier) and by restricting the key to the
Maps JavaScript API only. Use a localhost-restricted key locally and a
domain-restricted one in CI — never put localhost on the production key.
The build works fine without either variable; the map falls back to the
paper pin scatter.

**The front page must never load a map.** It draws its previews with
`MapPreview.astro`, which is static Astro — no island, no SDK. Only
`/map/<city>/` instantiates Google, and only one map per page. Putting a live
map back on the index would cost a load per city on every single visit, which
is what blows the daily cap. Verify with `grep -c MapSlot dist/index.html`
(must be 0) or a devtools network filter on `maps.googleapis.com`.

In CI the values live on the **github-pages environment** (not repo scope),
as secret `PUBLIC_GOOGLE_MAPS_API_KEY` and variable `PUBLIC_GOOGLE_MAPS_ID`.
The build job in `.github/workflows/deploy.yml` must therefore declare
`environment: github-pages` — environment secrets are invisible to jobs that
don't, and they fail by resolving to an empty string rather than erroring,
which looks exactly like "no map configured".

## Structure

- `src/pages/index.astro` — the front page: hero + one `SegmentAreas` per segment
- `src/pages/map/[city].astro` — one full-screen map page per segment: rows on
  the left (booked stops first, then ideas), big map on the right, back link to
  `/#<city>`. `getStaticPaths` passes only the trip-wide segment index, which is
  also what `accentFor()` keys off so the accent matches the index page.
- `src/pages/404.astro` — GitHub Pages serves this for unmatched paths
- `src/content.config.ts` — frontmatter schemas (build fails on bad entries)
- `src/lib/trip.ts` — the trip's own facts (name, year, date window). The one
  thing not derived from content, so it survives an empty itinerary.
- `src/lib/loadTrip.ts` — loads collections, pre-renders markdown bodies,
  assigns per-city accent colors, derives the brush-font kanji subset, and
  warns when a segment falls outside the trip window
- `src/lib/itinerary.ts` — splits stops into `ideas` (undated) / `booked`
  (dated) per segment; `stopSlug`/`stopDomId` sanitize collection ids for DOM
  use (ids can contain slashes); `mapPoints` serializes stops for the map island
  `citySlug` is the single source for a city's anchor, `<section id>`, island
  `segmentId`, and `/map/<city>/` route param — they must all agree
- `src/lib/scatter.ts` — normalizes lat/lng into the unit square for the paper
  chart. Dependency-free on purpose: both Astro frontmatter and the React
  island import it.
- `src/lib/categories.ts` — category keys, the four filter groups, and
  `filterGroupsFor()` (pass the categories a list actually renders, not every
  category in the city — a button that hides everything on screen is broken)
- `src/lib/compass.ts` — the compass rose SVG, shared by the Astro preview card
  and the React island. A string, not a component: Astro can't render inside a
  React island.
- `src/components/segment/SegmentShell.astro` — **owns the entire
  parallax/sticky spine** (sticky panel, scroll-driven photo pan, the mobile
  100svh pinned hero + paper sheet). Do not add `filter`, `transform`,
  `contain`, or `will-change` to its structural elements — see the comment
  block in its styles. `--pin-min` on the scroll column keeps the panel
  pinned even when filters hide most rows.
- `src/components/segment/SegmentAreas.astro` — the city section: map preview
  card in the panel (only when the city has coordinates), `ScheduledList`,
  count + filter row (sticky), then a `StopList`
- `src/components/segment/ScheduledList.astro` — the collapsed "Scheduled"
  disclosure; renders nothing when a city has no bookings
- `src/components/StopList.astro` — the row list, used by both the index
  (`layout="grid"`, animated) and `/map/<city>/` (`layout="column"`). Owns the
  `stopContent` lookup and the **empty state** — the one place that knows a
  list is empty, so the one place that says so.
- `src/components/IdeaCard.astro` — one row: serif title, handwritten note, a
  date pill for booked stops, and an `↗` when the row links somewhere. The row
  element **is** the `<a>` (see "What a row links to"); non-linking rows are an
  `<article tabindex="-1">` so the map can still focus them.
- `src/components/Filters.tsx` — React island; toggles `hidden` on the
  Astro-rendered rows (never owns their markup). `FilterBar.astro` wraps it
  and carries its CSS, so both pages style the pills from one source.
- `src/components/map/` — two components drawing the same parchment chart:
  - `MapPreview.astro` — **no island, no Google.** The small linked card in
    the index panel. The index page must cost zero Maps loads (see the quota
    note under Environment variables), so this is pure static Astro.
  - `MapPanel.astro` + `MapSlot.tsx` — the live map, used only on
    `/map/<city>/`. Hovering a row highlights its pin and clicking a pin
    scrolls to the row. Degrades in three steps, all usable: no JS or no API
    key → a paper pin scatter plotted from each stop's real `lat`/`lng`;
    Google fails to load → same scatter; Google loads → real basemap with the
    same paper-disc pins. Never let a dead map break the page.
- `src/styles/map-paper.css` — all the parchment styling (deckled mat, sepia
  tiles, aged wash, compass, paper pins), shared by both map components.
  Three sizes via `.mapslot[data-variant]`: default, `preview`, `page`.
- `src/styles/map-paper.css` — all the parchment styling (deckled mat, sepia
  tiles, aged wash, compass, paper pins). Three sizes via
  `.mapslot[data-variant]`: default, `preview`, `page`.
- `src/assets/segments/` — city hero photos (stops have no images)
- `.github/workflows/deploy.yml` — GitHub Pages deployment

## Architectural rules

- **Empty states are load-bearing, not placeholders.** Content arrives one
  place at a time, so every list, chart, and control has to read as
  intentional while it's still nearly empty: `StopList`'s `emptyNote`,
  `FilterBar`'s two-group threshold (one group means "All" and that group
  select the same rows), the suppressed preview card, and `.mapslot-blank`.
  Copy on the page stays user-facing — authoring guidance lives here instead.
- Shared marks (`.hand`, `.swash`, `.pill`, `.note-strip`, `.rise-in`) are
  defined once in `Base.astro`'s global block. Scoped rules are (0,2,0) and
  always win, so a component can still tune one locally.
- The parallax is pure CSS scroll-driven animation behind
  `@supports (animation-timeline: view())`, fully disabled under
  `prefers-reduced-motion`. React islands (`Filters`, `MapSlot`) are leaves:
  they orchestrate static Astro DOM via data attributes and never render
  stop content, because markdown bodies can only be rendered by Astro's
  `render()` in frontmatter.
- With JS disabled the page must stay complete and readable — islands only
  add filtering/highlighting on top of fully server-rendered HTML.
