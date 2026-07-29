# Japan 2026 trip site

A static Astro site presenting our trip as browse-first city guides: each
city is a section with a sticky panel (photo + map) on the left and a flat,
filterable list of ideas scrolling on the right. Deployed to GitHub Pages
automatically on every push to `main`.

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
image: ../../assets/stops/blue-bottle.jpg   # optional — see photo workflow
imageAlt: Counter seats at the roastery     # optional — pairs with image
lat: 35.6812                         # optional — plots a pin on the city map
lng: 139.7671                        # optional — pairs with lat
---

One or two short sentences. Rendered in handwriting under the title —
keep it to a margin note, not a paragraph.
```

Rules:

- **No `date` → the stop is an idea**: it appears in the city's filterable
  list, to be wandered into at leisure. This is the default and the norm.
- **With `date` → the stop is a scheduled event**: it appears only in the
  collapsible "Scheduled" section at the top of its city, never in the
  ideas list. Only use `date` for actual bookings (dinner reservations,
  timed tickets).
- Stops whose `city`/`date` match no segment are collected in a warning at
  build time instead of disappearing.
- Do NOT add frontmatter fields beyond the template — the schema in
  `src/content.config.ts` is intentionally minimal and every field is
  rendered. Extra keys are silently ignored.

Valid `category` keys (defined in `src/lib/categories.ts`):
`coffee food bar market shop temple shrine museum view walk hike onsen
sight activity stay travel`

The category picks the map-pin glyph and which filter button matches the
stop: **Coffee** = coffee · **Food** = food, bar, market · **Sights** =
temple, shrine, museum, view, walk, hike, onsen, sight, activity ·
**Shops** = shop. (`travel` and `stay` only appear under "All".)

### Photo workflow

1. Put the image file in `src/assets/stops/` (jpg/png/webp, any reasonable
   size — Astro resizes and optimizes at build time).
2. Reference it from the stop's frontmatter **relative to the markdown
   file**: `image: ../../assets/stops/<file>.jpg` from `src/content/stops/`,
   or `../../../assets/stops/<file>.jpg` from a subfolder like
   `placeholders/`.
3. It renders as a small tilted polaroid thumbnail on the row. Rows without
   an image are simply slimmer — no placeholder is shown.

Worked example: `src/content/stops/placeholders/tokyo-coffee-shop-1.md`
uses `src/assets/stops/placeholder-coffee.png`.

### Placeholder content

Everything in `src/content/stops/placeholders/` is fake layout-testing
content ("Coffee Shop 1"). Replace it with real finds over time; the whole
folder can be deleted in one move (`rm -r src/content/stops/placeholders`).

## Trip segments (one file per contiguous stay)

Each leg is one markdown file in `src/content/segments/` (e.g.
`01-tokyo.md`). Segments drive the page: one city section per segment,
date ranges shown in the panel, stops attach by `city` (ideas) or `date`
(scheduled).

```markdown
---
city: Tokyo
cityJa: "東京"          # optional — brush kanji on the mobile hero; its glyphs
                        # MUST be in the subset font URL in src/layouts/Base.astro
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

## Structure

- `src/pages/index.astro` — the only page: hero + one `SegmentAreas` per segment
- `src/content.config.ts` — frontmatter schemas (build fails on bad entries)
- `src/lib/loadTrip.ts` — loads collections, pre-renders markdown bodies,
  assigns per-city accent colors, warns on kanji missing from the subset font
- `src/lib/itinerary.ts` — splits stops into `ideas` (undated) / `booked`
  (dated) per segment; `stopSlug`/`stopDomId` sanitize collection ids for DOM
  use (ids can contain slashes); `mapPoints` serializes stops for the map island
- `src/lib/categories.ts` — category keys + the four filter groups
- `src/components/segment/SegmentShell.astro` — **owns the entire
  parallax/sticky spine** (sticky panel, scroll-driven photo pan, the mobile
  100svh pinned hero + paper sheet). Do not add `filter`, `transform`,
  `contain`, or `will-change` to its structural elements — see the comment
  block in its styles. `--pin-min` on the scroll column keeps the panel
  pinned even when filters hide most rows.
- `src/components/segment/SegmentAreas.astro` — the city section: collapsed
  Scheduled details, count + filter row (sticky), flat idea list
- `src/components/IdeaCard.astro` — one row: optional polaroid thumb, serif
  title, handwritten note
- `src/components/Filters.tsx` — React island; toggles `hidden` on the
  Astro-rendered rows (never owns their markup)
- `src/components/map/` — `MapPanel.astro` + `MapSlot.tsx`: the city map in
  the sticky panel. Hovering a row highlights its pin and clicking a pin
  scrolls to the row. Degrades in three steps, all usable: no JS or no API
  key → a paper pin scatter plotted from each stop's real `lat`/`lng`;
  Google fails to load → same scatter; Google loads → real basemap with the
  same paper-disc pins. Never let a dead map break the page.
- `src/assets/segments/` — city hero photos; `src/assets/stops/` — stop photos
- `.github/workflows/deploy.yml` — GitHub Pages deployment

## Architectural rules

- The parallax is pure CSS scroll-driven animation behind
  `@supports (animation-timeline: view())`, fully disabled under
  `prefers-reduced-motion`. React islands (`Filters`, `MapSlot`) are leaves:
  they orchestrate static Astro DOM via data attributes and never render
  stop content, because markdown bodies can only be rendered by Astro's
  `render()` in frontmatter.
- With JS disabled the page must stay complete and readable — islands only
  add filtering/highlighting on top of fully server-rendered HTML.
