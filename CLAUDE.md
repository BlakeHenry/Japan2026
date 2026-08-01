# Japan 2026 trip site

A static Astro site in three layers:

- **`/`** — the cover. One viewport, no scroll: the dates, the title, a taped
  photo, and a single washi-tape button into the plan. It loads no map and
  nothing below the fold, because it is a cover and not a page.
- **`/plan/`** — the itinerary. A route rail on the left, and **one section at
  a time** beside it: the page never scrolls between sections — the rail is
  the only way to move, and the open panel scrolls by itself. A city section
  is a header, then the stay on the left (photo, where we're sleeping, how we
  get there) and what we do with it on the right (day by day, then ideas as
  tappable chips). Day trips are **sub-locations**: they hang off their base's
  rail card as smaller tags and open their own panel — same frame as a base,
  minus lodging and Day by day.
- **`/map/<city>/`** — one full-screen map page per city: rows on the left,
  big map on the right, the way you'd browse a saved list in Google Maps.

Deployed to GitHub Pages automatically on every push to `main`.

## Current state

**Nothing is booked.** Four cities are pencilled in, back to back, tiling
the whole window: **Tokyo** Oct 13–16 (checkout the 17th), **Kawaguchiko**
Oct 17–18 (checkout the 19th), **Kyoto** Oct 19–22 (checkout the 23rd), and
**Osaka** Oct 23–26 (checkout the 27th). Day trips are pencilled in too, as
their own collection (`src/content/daytrips/`): Ito on Kawaguchiko (a
stop-off on the travel day down from Tokyo), Nara and Uji on Kyoto, and
Himeji + Kobe on Osaka (one combined outing, one file). None has a photo or
legs yet, so their panels show the same empty frames the bases do.

No city has lodging, and no segment has `arrive` or `depart` legs, so every
one of those blocks is showing its empty state. Kawaguchiko has no photo
yet either — its segment has no `heroImage`, so its polaroid says "No photo
yet" and its rail card renders photo-less. That is the honest picture, not
a gap to paper over: **don't invent lodging, flights, transit, or
reservations to make the page look fuller.** Everything on the site should
be something a person actually chose.

The only stops that exist are the five Jameson added (`addedBy: Jameson`) —
three Pokémon / TCG stops in Osaka, two in Kyoto — and all five now attach
to their city's segment, so the **"Not on the itinerary yet"** strip is
empty and doesn't render. It's still there in the code (and must stay): a
stop whose `city`/`date` matches no segment lands in it and warns at build
time rather than silently vanishing. Tokyo and Kawaguchiko have no stops,
so their Ideas blocks show their empty state.

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
heroImage: ../../assets/segments/tokyo.jpg   # optional — see below
heroAlt: Shibuya scramble crossing lit up at night   # required WITH heroImage
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

`heroImage` is optional so a city can join the itinerary before anyone has
a picture of it: without one, the city's polaroid renders as an empty frame
saying "No photo yet" and its rail card goes photo-less (the shape the
mobile jump bar always uses). `heroAlt` is required whenever `heroImage` is
set — the schema enforces it.

## Day trips (one file per outing)

A day trip is a **sub-location of a base**: one markdown file in
`src/content/daytrips/`, rendered as a smaller tag hanging off its parent's
rail card and — when selected — a panel of its own. The panel is the base
frame minus what a day trip doesn't have: **no lodging** (we sleep at the
base) and **no Day by day** (which day is still unchosen). Both are absent
by design, not fields waiting to be added.

```markdown
---
name: Himeji + Kobe     # display name — also becomes the section slug
parent: Osaka           # required — must exactly match a segment's city
cityJa: "姫路・神戸"     # optional — joins the same derived font subset
note: one day, castle then harbour   # optional — renders where a base shows dates
cities:                 # optional — stop-matching keys for a combined outing;
  - Himeji              # defaults to [name], so single-town trips omit it
  - Kobe
there:                  # optional — how we get there, same leg shape as arrive
  - mode: train
    text: Shinkansen · Shin-Osaka → Himeji · 30m
back:                   # optional — how we get back
heroImage: ../../assets/segments/nara.jpg    # optional
heroAlt: ...            # required WITH heroImage
tagline: ...            # optional
---

Free-form notes, shown at the end of the panel.
```

Rules:

- An undated stop whose `city` matches one of the trip's matching keys
  (`cities`, else `name`) becomes an idea chip on the day-trip panel instead
  of the unscheduled strip. Don't use a segment's city as a matching key —
  the segment claims those stops first, and the build warns if you try.
- A combined outing ("Himeji + Kobe") is **one file**, because it's one
  pencilled day — `cities` is how both towns' stops find it.
- Deliberately no dates and no lodging. When a day trip grows an actual
  booking, that's a dated stop, not a day-trip field.
- Every section slug (`citySlug` of segment cities and day-trip names)
  shares one `:target` namespace on `/plan/` — a collision fails the build.
- Day-trip stops appear on **no `/map/` page** (those are per-segment).
  Accepted for now; fold them into the parent's map if that ever matters.

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
  `SegmentAreas` per segment (each followed by its `DayTripPanel`s — the
  Fragment flattens, so every panel is a **direct child of `<main>`**, which
  the tab CSS requires, and the first child must stay a base city for the
  hashless-load `:first-of-type` rule), then the "Not on the itinerary yet"
  strip and `Footer` (inside `<main>` — the page doesn't scroll, so outside
  the layout it would be unreachable). Its `h1` is `sr-only` — the visible
  headings are the city names. Astro emits it as `plan/index.html`, so
  **always link it with a trailing slash** (`/plan/`) or GitHub Pages
  answers with a 301 first.
  **The tab mechanism lives here**, in an `is:global` style block: the
  layout is locked to `100svh`, `<main>` is the scroll container (the map
  page's `min-height: 0` + `overflow-y: auto` pattern), `.segment`s are
  `display: none` except the `:target` one, and a `:not(:has(...))` rule
  shows the first city on a hashless load. `:target` is scoped to
  `.segment` so targeting `#unscheduled` or a stop id falls back to the
  first city instead of hiding everything. Because it's all `:target`, it
  works with JS off, deep links (`/plan/#kyoto`) and the map pages' back
  links open the right city, and Back/Forward walk through cities. The
  whole block is gated behind `@supports selector(main:has(...))` —
  browsers without `:has()` get the old design instead: every city stacked
  on one long scrolling page. Don't ungate it; without the gate those
  browsers would open to a blank page.
- `src/components/RouteRail.astro` — the route, start to finish, as a column
  of taped photo cards, and **the only way to move between cities**. Plain
  anchors, no island — each card selects its city's panel via `:target`.
  The connector between two cards is the **departing** city's `depart` —
  read off one side so the rail can't contradict itself, and the last city
  has none because there's nowhere after it. "You are here" is `:target`
  plus a `:has()` rule generated per city at build time (CSS can't hop from
  a targeted section to its rail card on its own), with one extra generated
  rule highlighting the first city on a hashless load to match the panel
  the tab CSS shows; browsers without `:has()` keep the hover treatment.
  Day trips render as `.subtrip` tags under their base's card, on a dashed
  spine that continues the leg-line language; each gets a generated rule
  pair — full highlight on its own tag plus a washed-out one on the parent's
  card ("you are here, roughly"). A segment without `heroImage` renders its
  card photo-less. Below 900px it drops the photos, legs, and spine and
  becomes a horizontal jump bar pinned in its own grid row above the
  scrolling panel — day trips flatten to dashed-outline pills after their
  base, because the jump bar is the only navigation on mobile.
- `src/pages/map/[city].astro` — one full-screen map page per segment: rows on
  the left (booked first, then ideas), big map on the right, back link to
  `/plan/#<city>`. `getStaticPaths` passes only the trip-wide segment index,
  which is also what `accentFor()` keys off so the accent matches `/plan/`.
  **Nothing currently links here** — the plan page's map preview card was
  dropped in the redesign. The pages still build and are the only place a
  stop's body text and the category filters appear. The back link to
  `/plan/#<city>` doubles as tab selection: it opens that city's panel.
- `src/pages/404.astro` — GitHub Pages serves this for unmatched paths

### Lib

- `src/lib/trip.ts` — the trip's own facts (name, year, date window). The one
  thing not derived from content, so it survives an empty itinerary.
- `src/lib/loadTrip.ts` — loads collections, pre-renders markdown bodies,
  assigns per-city accent colors, derives the kanji subset for the Japanese
  face, and warns when a segment falls outside the trip window
- `src/lib/itinerary.ts` — splits stops into `ideas` (undated) / `booked`
  (dated) per segment, and attaches day trips to their parent (each with its
  own claimed ideas); `stopSlug`/`stopDomId` sanitize collection ids for DOM
  use (ids can contain slashes); `mapPoints` serializes stops for the map
  island. `citySlug` is the single source for a city's or day trip's anchor,
  `<section id>`, island `segmentId`, and `/map/<city>/` route param — they
  must all agree. It strips punctuation ("Himeji + Kobe" → `himeji-kobe`)
  because a `+` in an id would break the generated `:has()` CSS, and
  `buildItinerary` fails the build on a slug collision.
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

- `SegmentShell.astro` — the frame, shared by base and day-trip panels:
  header (highlighter chip + `titleJa` + subline) and a two-column grid with
  `stay` and `plan` slots, plus an optional `badge` slot above the header
  (the day-trip marker). A day-trip panel passes its **parent's** `alt` so
  the pair reads as one tinted band in the no-`:has()` fallback. Plain flow
  — no sticky, no scroll-driven animation. Owns the alternating `--seg-bg` —
  a gentle tint now that one city shows at a time, but in the no-`:has()`
  fallback the cities stack on one long page again and it's the only thing
  separating them, which is why it stays.
  Its one-column switch is a **container query**, not a media query: the
  route rail takes a fifth of the viewport out from under the section, so
  viewport width says nothing useful about how much room the columns have.
  That needs `container-type: inline-size` on `.segment`, which is only safe
  because this component no longer owns a sticky pin or a view-timeline.
- `SegmentAreas.astro` — composes a base's two columns and nothing else.
- `DayTripPanel.astro` — a day trip's panel: badge (a `.tape` anchor —
  "🎒 Day trip from <parent>" — that doubles as the way back up, since one
  tap re-targets the parent's section), hero polaroid, "Getting there &
  back", and Ideas. No `StayCard`, no `DayByDay` — structurally absent.
- `CityPhoto.astro` — the taped polaroid, tilt alternating with the segment.
- `StayCard.astro` — "Staying at". **Always renders**, booked or not.
- `TravelCard.astro` — "Getting here & onward", Arrive and Depart. Always
  renders; each half says "Nothing booked yet" on its own. Heading and the
  two labels are props with those defaults — `DayTripPanel` passes "Getting
  there & back" with There/Back.
- `DayByDay.astro` — every day of the stay, booked or not. Free days say
  "Free"; the first day also carries the `arrive` legs.
- `IdeaChips.astro` — the undated stops as paper tags. Name and glyph only;
  no body text (see the stop rules above). Day-trip panels reuse it with the
  trip's claimed stops.

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
exactly the glyphs the segments' and day trips' `cityJa` values use — a couple
of KB. With no `cityJa` anywhere the request doesn't happen at all.

The favicon (`public/favicon.svg`) is the Japan flag redrawn in the site's
palette — paper field, accent-red sun, tan hairline. SVG only; there's no
raster tooling in the repo, so no apple-touch-icon (Safari falls back to its
default) — a deliberate omission, not a gap.

## Architectural rules

- **Empty states are load-bearing, not placeholders.** Content arrives one
  place at a time, so every block has to read as intentional while it's still
  nearly empty. `StayCard` and `TravelCard` render even with nothing in them,
  because a stay with nowhere booked that quietly hides its lodging card reads
  as a settled one. `DayByDay` lists every day so free time is stated rather
  than left as a gap. `IdeaChips`, `StopList`, and `.mapslot-blank` each say
  when they're empty. Copy on the page stays user-facing — authoring guidance
  lives here instead.
- Shared marks (`.hand`, `.swash`, `.tape`, `.tape-icon`, `.pill`,
  `.note-strip`, `.rise-in`) are defined once in `Base.astro`'s global block.
  Scoped rules are (0,2,0) and always win, so a component can still tune one
  locally — see `.hero-cta`, which is `.tape` at button size. `.tape-icon` is
  the emoji leading a section tape (🏨 Staying at, 🚄 travel, 🗓️ Day by day,
  💡 Ideas, 🎒 the day-trip badge) — always `aria-hidden`, and **sections
  wear icons, buttons don't** (the cover CTA and footer tapes stay bare).
- React islands (`Filters`, `MapSlot`) are leaves: they orchestrate static
  Astro DOM via data attributes and never render stop content, because
  markdown bodies can only be rendered by Astro's `render()` in frontmatter.
  Their DOM contract is `#<citySlug>` ⊃ `.idea[data-id][data-group]`.
- With JS disabled every page must stay complete and readable — islands only
  add filtering and highlighting on top of fully server-rendered HTML.
- Any CSS animation needs a matching `prefers-reduced-motion` reset.
