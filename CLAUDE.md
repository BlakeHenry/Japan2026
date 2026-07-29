# Japan 2026 trip site

A static Astro site in three layers:

- **`/`** — the cover. One viewport, no scroll: the dates, the title, a taped
  photo, and a single washi-tape button into the plan. It loads no map and
  nothing below the fold, because it is a cover and not a page.
- **`/plan/`** — the itinerary. A sticky route rail on the left, and one
  section per city beside it: a header, then the stay on the left (photo,
  where we're sleeping, how we get there) and what we do with it on the right
  (day by day, then ideas as tappable chips).
- **`/map/<city>/`** — one full-screen map page per city: rows on the left,
  big map on the right, the way you'd browse a saved list in Google Maps.

Deployed to GitHub Pages automatically on every push to `main`.

## Current state

**Nothing is booked.** Two cities are pencilled in, back to back, covering
the whole window: **Tokyo** Oct 13–16 (checkout the 17th) and **Osaka**
Oct 17–26 (checkout the 27th). Osaka only runs that long because there's
nothing between it and Tokyo yet — Hakone and Kyoto will be carved out of
that stretch, shortening it.

Neither city has lodging, and no segment has `arrive` or `depart` legs, so
every one of those blocks is showing its empty state. That is the honest
picture, not a gap to paper over: **don't invent lodging, flights, transit,
or reservations to make the page look fuller.** Everything on the site should
be something a person actually chose.

The only stops that exist are the five Jameson added (`addedBy: Jameson`) —
three Pokémon / TCG stops in Osaka, two in Kyoto. The Kyoto pair sits in the
**"Not on the itinerary yet"** strip at the bottom of `/plan/` and warns at
build time. That's the designed behaviour, not a bug — add a Kyoto segment
and they attach themselves, exactly as the Osaka three did. Tokyo has no
stops at all, so its Ideas block shows its empty state too.

The trip window (Japan, Oct 13–27 2026) lives in
[`src/lib/trip.ts`](src/lib/trip.ts), as a code constant rather than content
so the dates survive an entirely empty itinerary. Segments are legs carved
out of that window, and the build warns if one falls outside it.

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

One or two short sentences. **No markdown links in the body** (see the rules
below).
```

Rules:

- **No `date` → the stop is an idea**: it becomes a chip in its city's Ideas
  block. This is the default and the norm.
- **With `date` → the stop is a scheduled event**: it appears on its day in
  **Day by day**, never among the idea chips. Only use `date` for actual
  bookings (dinner reservations, timed tickets).
- **Dated stops attach by date, not by city.** A booked stop lands in
  whichever segment its `date` falls inside; its `city` is only checked so
  the build can warn you when the two disagree. Read the build output.
- Stops whose `city`/`date` match no segment show up in the **"Not on the
  itinerary yet"** strip, and warn at build time, rather than silently
  vanishing.
- **A stop's body text does not appear on `/plan/`.** The idea chips are
  name-and-glyph only, by design. Bodies render on `/map/<city>/` and in the
  unscheduled strip, both of which use `IdeaCard`. Write the body as a note
  to your future self, not as the thing that sells the stop.
- **No markdown links in a stop's body.** Wherever a body renders, the whole
  row is an `<a>`, and a nested link is invalid HTML — the parser unnests it,
  which lifts the row out of its city section and silently kills that row's
  map-pin highlighting and filtering. Put the URL in `link:` instead.
- Do NOT add frontmatter fields beyond the template — the schema in
  `src/content.config.ts` is intentionally minimal and every field is
  rendered. Extra keys are silently ignored.

### Coordinates are what light up the maps

`lat`/`lng` are optional, but they're the single highest-value thing you can
add to a stop: the stop gets a pin on the city's map page, and its chip opens
Google Maps instead of the venue's website.

To get a coordinate: right-click the spot in Google Maps and the `lat, lng`
is the first item in the menu — click to copy.

### What a chip or row links to

One target, in this order:

1. `lat`/`lng` → Google Maps at that coordinate (new tab)
2. otherwise `link` → that URL (new tab)
3. otherwise it isn't a link at all

So a stop with **both** coordinates and a `link` opens Maps, not the site —
on the day, "where is it" beats "what are its hours", and the venue's site is
one tap away inside Maps. Booked stops keep their `link` on their Day-by-day
row regardless.

Valid `category` keys (defined in `src/lib/categories.ts`):
`coffee food bar market shop temple shrine museum view walk hike onsen
sight activity stay travel`

The category picks the chip glyph, the map-pin glyph, and — on
`/map/<city>/` only — which filter button matches the stop: **Coffee** =
coffee · **Food** = food, bar, market · **Sights** = temple, shrine, museum,
view, walk, hike, onsen, sight, activity · **Shops** = shop. (`travel` and
`stay` only appear under "All".)

Stops have no photo of their own. Only segments carry an image (their
`heroImage`).

## Trip segments (one file per contiguous stay)

Each leg is one markdown file in `src/content/segments/` (e.g.
`01-tokyo.md`). Segments drive `/plan/`: one city section per segment, and
stops attach by `city` (ideas) or `date` (booked).

```markdown
---
city: Tokyo
cityJa: "東京"          # optional — set beside the city name in Yuji Syuku.
                        # The subset font URL is derived from these, so
                        # there's nothing to keep in sync; with no cityJa
                        # anywhere the font isn't requested at all.
start: 2026-10-13
end: 2026-10-16         # inclusive LAST FULL DAY; ranges must not overlap.
                        # The header shows checkout (end + 1), so this reads
                        # as "Oct 13–17 · 4 nights".
lodging:                # optional in full — a stay with nowhere booked yet
  name: Hotel Gracery Shinjuku
  area: Shinjuku, by the station        # optional — orientation, not an address
  link: https://shinjuku.gracery.com/   # optional
arrive:                 # optional — how we get here
  - mode: flight        # flight train local bus ferry car walk
    text: Blake · SFO → Haneda · lands 3:05 pm
depart:                 # optional — how we leave
  - mode: train
    text: Romancecar · Shinjuku → Hakone-Yumoto · 1h 25m
heroImage: ../../assets/segments/tokyo.jpg
heroAlt: Shibuya scramble crossing lit up at night
tagline: Neon, backstreets, and the best breakfast on earth   # optional
---

Free-form notes about this leg, shown at the end of its section.
```

`mode` picks the glyph; `src/lib/travel.ts` owns the emoji so none ever lands
in frontmatter. **There is deliberately no booked / not-booked field** on legs
or on lodging: a leg is added once it's actually booked, so "not booked yet"
is spelled by its absence, and a status that only ever reads "booked" is a
label rather than information. `arrive` also fills the first Day-by-day row,
which is the one day of a stay whose shape is already decided, and `depart`
is what the route rail draws between this city and the next — so the leg
joining two cities gets written on the departing side.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build; **this is the validation step** for
  all frontmatter. Run it after any content change.

Astro's content layer caches aggressively. After deleting or renaming a
content file, `rm -rf .astro node_modules/.astro` before rebuilding, or the
build will keep generating pages for content that no longer exists.

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

**Only `/map/<city>/` may load a map**, and only one per page. Neither `/`
nor `/plan/` instantiates Google at all — putting a live map back on `/plan/`
would cost a load per city on every single visit, which is what blows the
daily cap. Verify with `grep -c MapSlot dist/index.html dist/plan/index.html`
(both must be 0) or a devtools network filter on `maps.googleapis.com`.

In CI the values live on the **github-pages environment** (not repo scope),
as secret `PUBLIC_GOOGLE_MAPS_API_KEY` and variable `PUBLIC_GOOGLE_MAPS_ID`.
The build job in `.github/workflows/deploy.yml` must therefore declare
`environment: github-pages` — environment secrets are invisible to jobs that
don't, and they fail by resolving to an empty string rather than erroring,
which looks exactly like "no map configured".

## Structure

### Pages

- `src/pages/index.astro` — the cover. `Hero` and nothing else: no footer, no
  segments, no scroll.
- `src/pages/plan.astro` — the itinerary: a `RouteRail` beside one
  `SegmentAreas` per segment, then the "Not on the itinerary yet" strip and
  `Footer`. Its `h1` is `sr-only` — the visible headings are the city names.
  Astro emits it as `plan/index.html`, so **always link it with a trailing
  slash** (`/plan/`) or GitHub Pages answers with a 301 first.
- `src/components/RouteRail.astro` — the route, start to finish, as a column
  of taped photo cards linking to the sections already on the page. Plain
  anchors, no island. The connector between two cards is the **departing**
  city's `depart` — read off one side so the rail can't contradict itself,
  and the last city has none because there's nowhere after it. "You are here"
  is `:target` plus a `:has()` rule generated per city at build time (CSS
  can't hop from a targeted section to its rail card on its own); browsers
  without `:has()` keep the hover treatment. Below 900px it drops the photos
  and legs and becomes a horizontal jump bar — the legs are already in each
  city's own "Getting here & onward" card, so nothing is lost.
- `src/pages/map/[city].astro` — one full-screen map page per segment: rows on
  the left (booked first, then ideas), big map on the right, back link to
  `/plan/#<city>`. `getStaticPaths` passes only the trip-wide segment index,
  which is also what `accentFor()` keys off so the accent matches `/plan/`.
  **Nothing currently links here** — the plan page's map preview card was
  dropped in the redesign. The pages still build and are the only place a
  stop's body text and the category filters appear.
- `src/pages/404.astro` — GitHub Pages serves this for unmatched paths

### Lib

- `src/lib/trip.ts` — the trip's own facts (name, year, date window). The one
  thing not derived from content, so it survives an empty itinerary.
- `src/lib/loadTrip.ts` — loads collections, pre-renders markdown bodies,
  assigns per-city accent colors, derives the kanji subset for the Japanese
  face, and warns when a segment falls outside the trip window
- `src/lib/itinerary.ts` — splits stops into `ideas` (undated) / `booked`
  (dated) per segment; `stopSlug`/`stopDomId` sanitize collection ids for DOM
  use (ids can contain slashes); `mapPoints` serializes stops for the map
  island. `citySlug` is the single source for a city's anchor, `<section id>`,
  island `segmentId`, and `/map/<city>/` route param — they must all agree.
  `formatStay` renders a stay as arrival→checkout ("Oct 13–17"); `formatRange`
  renders days-in-city ("Oct 13 – Oct 16") and is what the map pages use.
- `src/lib/travel.ts` — travel modes and their glyphs, same shape as
  `categories.ts`: content names a mode, code owns the emoji.
- `src/lib/categories.ts` — category keys, the four filter groups, and
  `filterGroupsFor()` (pass the categories a list actually renders, not every
  category in the city — a button that hides everything on screen is broken)
- `src/lib/scatter.ts` — normalizes lat/lng into the unit square for the paper
  chart. Dependency-free on purpose.
- `src/lib/compass.ts` — the compass rose SVG as a string, injected into the
  React island (an Astro component can't render inside one).

### The city section (`src/components/segment/`)

- `SegmentShell.astro` — the frame: city header (highlighter chip + `cityJa` +
  stay range) and a two-column grid with `stay` and `plan` slots. Plain flow
  — no sticky, no scroll-driven animation. Owns the alternating `--seg-bg`,
  which is the only thing separating one city from the next on a long page.
  Its one-column switch is a **container query**, not a media query: the
  route rail takes a fifth of the viewport out from under the section, so
  viewport width says nothing useful about how much room the columns have.
  That needs `container-type: inline-size` on `.segment`, which is only safe
  because this component no longer owns a sticky pin or a view-timeline.
- `SegmentAreas.astro` — composes the two columns and nothing else.
- `CityPhoto.astro` — the taped polaroid, tilt alternating with the segment.
- `StayCard.astro` — "Staying at". **Always renders**, booked or not.
- `TravelCard.astro` — "Getting here & onward", Arrive and Depart. Always
  renders; each half says "Nothing booked yet" on its own.
- `DayByDay.astro` — every day of the stay, booked or not. Free days say
  "Free"; the first day also carries the `arrive` legs.
- `IdeaChips.astro` — the undated stops as paper tags. Name and glyph only;
  no body text (see the stop rules above).

### Shared components

- `src/components/Hero.astro` — the cover page's entire contents.
- `src/components/StopList.astro` + `IdeaCard.astro` — the ruled row list.
  Used by `/map/<city>/` (`layout="column"`) and the unscheduled strip
  (`layout="grid"`). `StopList` owns the `stopContent` lookup and the empty
  state. The row element **is** the `<a>`; non-linking rows are an
  `<article tabindex="-1">` so the map can still focus them.
- `src/components/Filters.tsx` / `FilterBar.astro` — React island filtering
  `IdeaCard` rows, used only on `/map/<city>/`. `FilterBar` carries the
  island's CSS in an `is:global` block, because island DOM sits outside
  Astro's style scoping.
- `src/components/map/MapPanel.astro` + `MapSlot.tsx` — the live map, only on
  `/map/<city>/`. Hovering a row highlights its pin and clicking a pin scrolls
  to the row. Degrades in three steps, all usable: no JS or no API key → a
  paper pin scatter plotted from each stop's real `lat`/`lng`; Google fails to
  load → same scatter; Google loads → real basemap with the same paper-disc
  pins. Never let a dead map break the page.
- `src/styles/map-paper.css` — all the parchment styling (deckled mat, sepia
  tiles, aged wash, compass, paper pins). Two sizes via
  `.mapslot[data-variant]`: default and `page`.
- `src/assets/segments/` — city hero photos (stops have no images)
- `.github/workflows/deploy.yml` — GitHub Pages deployment

## Type and colour

Three webfonts from one Google Fonts request in `Base.astro`, all variable so
it's one file per family: **EB Garamond** (`--font-display`), **Caveat**
(`--font-hand`), **Karla** (`--font`). System stacks sit behind each as
`display=swap` fallbacks.

**Caveat runs small for its em box.** Anything wearing `.hand` needs roughly
1.2–1.3× the size a sans note would take; every current consumer has already
been tuned, so match them rather than the raw default.

**Yuji Syuku** (`--font-ja`) is requested separately and subset via `text=` to
exactly the glyphs the segments' `cityJa` values use — a couple of KB. With no
`cityJa` anywhere the request doesn't happen at all.

## Architectural rules

- **Empty states are load-bearing, not placeholders.** Content arrives one
  place at a time, so every block has to read as intentional while it's still
  nearly empty. `StayCard` and `TravelCard` render even with nothing in them,
  because a stay with nowhere booked that quietly hides its lodging card reads
  as a settled one. `DayByDay` lists every day so free time is stated rather
  than left as a gap. `IdeaChips`, `StopList`, and `.mapslot-blank` each say
  when they're empty. Copy on the page stays user-facing — authoring guidance
  lives here instead.
- Shared marks (`.hand`, `.swash`, `.tape`, `.pill`, `.note-strip`,
  `.rise-in`) are defined once in `Base.astro`'s global block. Scoped rules
  are (0,2,0) and always win, so a component can still tune one locally — see
  `.hero-cta`, which is `.tape` at button size.
- React islands (`Filters`, `MapSlot`) are leaves: they orchestrate static
  Astro DOM via data attributes and never render stop content, because
  markdown bodies can only be rendered by Astro's `render()` in frontmatter.
  Their DOM contract is `#<citySlug>` ⊃ `.idea[data-id][data-group]`.
- With JS disabled every page must stay complete and readable — islands only
  add filtering and highlighting on top of fully server-rendered HTML.
- Any CSS animation needs a matching `prefers-reduced-motion` reset.
