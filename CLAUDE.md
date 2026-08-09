# Japan 2026 trip site

A static Astro site in three layers:

- **`/`** — the cover. One viewport, no scroll: the dates, the title, a taped
  photo, and a single washi-tape button into the plan. It loads no map and
  nothing below the fold, because it is a cover and not a page.
- **`/overview/`** — the plan, and the whole of it. The top of the page is the
  trip as a spreadsheet: one column per calendar day of the trip window,
  labelled rows (City / Sleeping / Travel / Day trips), the full viewport
  wide. That grid is also **the only navigation** — every city band and
  day-trip pill is a same-page hash that opens that place's panel below it,
  **one at a time**. A city panel is a header, then the stay on the left
  (photo, where we're sleeping, how we get there) and what we do with it on
  the right (day by day, then ideas as tappable chips). Day trips are
  **sub-locations**: they hang off their base's columns as dashed pills and
  open their own panel — same frame as a base, minus lodging and Day by day.
  On desktop the page is locked to the viewport so the grid never moves and
  the panel scrolls in its own row; below 900px the lock comes off and the
  document scrolls, because a grid that eats a third of a phone screen would
  leave the panel a letterbox. The whole page is one flat register — paper,
  hairlines, accent tints — and deliberately not the cover's scrapbook: this
  is the functional view, and two registers on one page read as two pages.
- **`/map/<city>/`** — one full-screen map page per city: rows on the left,
  big map on the right, the way you'd browse a saved list in Google Maps.

Deployed to GitHub Pages automatically on every push to `main`.

## Current state

**Nothing is booked**, but the route is pencilled. Four stays in three
cities: **Tokyo** Oct 13–16 (checkout the 17th), **Kyoto** Oct 19–22
(checkout the 23rd), **Osaka** Oct 23–25 (checkout the 26th), and **Tokyo
again** for the single night of the 26th (`05-tokyo-return.md`) — the ride
back up is the 26th and the flights home leave Haneda on the 27th. That
return stay is the site's one **repeat city**: it slugs `tokyo-2`, and the
ideas and day trips all stay with the first Tokyo (see "Coming back to a
city" below).

**Oct 17–18 is an open gap, not a segment.** Kiso Valley was pencilled
there and got pulled off the itinerary — no replacement is decided, so
those two days simply have no segment, and the overview grid
shows them as "In transit" until something is chosen. `03-kyoto.md` lost the
`arrive` legs that used to route through it (Nagiso, on the old Kiso Valley
line) for the same reason: the actual path from Tokyo to Kyoto is unchosen
again, so its Transportation card reads "Nothing booked yet." **Kawaguchiko
is one candidate**, pencilled as a plain undated-but-dated stop
(`src/content/stops/kawaguchiko.md`, `date: 2026-10-18`) rather than a
segment — it has no city to attach to, so it (and the five orphaned Kiso
Valley ideas below) surface in the **"Not on the itinerary yet"** strip and
warn at build time. That is the intended behavior, not a bug: a pencilled
idea without a committed segment is supposed to be visible, not silently
dropped.

**Tokyo's first day is marked `arrivalIsTransit: true`** — Blake lands at
3pm and the day is spoken for by getting to the hotel and dinner, so the
overview's City row shows Oct 13 as a small "Arriving" ghost cell instead of
joining Tokyo's tinted strip, even though the Sleeping row still (correctly)
counts that night. Day trips are pencilled in too, as
their own collection (`src/content/daytrips/`): Ito on Tokyo (an onsen day
on the Izu coast), Nara and Uji on Kyoto, and Himeji + Kobe on Osaka (one
combined outing, one file). Each day trip carries pencilled `there`/`back`
train legs; none has a photo yet, so their polaroids still show the empty
frame.

No city has lodging, so every Staying-at card shows its empty state. Every
segment now carries pencilled `arrive` legs (the trains between cities, and
placeholder flights into Tokyo from Austin and Denver); Osaka also carries
`depart` (placeholder flights home from KIX). The two Tokyo flights are a
**split arrival**: Blake's (Austin) departs Oct 12 and lands Oct 13 at
15:00; James's (Denver) departs Oct 13 and lands Oct 14, landing time not
yet known. Legs are **pencilled routes chosen by the humans** — researched
and plausible, but not bookings — and they get updated when something is
actually booked. The rule stands in adjusted form: **don't invent lodging
or reservations to make the page look fuller, and don't add or change
transit legs nobody chose.** Everything on the site should be something a
person actually chose.

The stops that exist are the five Jameson added (`addedBy: Jameson`) —
three Pokémon / TCG stops in Osaka, two in Kyoto — plus five researched
Kiso Valley ideas (the Magome→Tsumago Nakasendo walk, Tsumago-juku,
Narai-juku, Nezame-no-toko gorge, Kozenji's rock garden) and the pencilled
Kawaguchiko stop. The five Kiso Valley ideas and Kawaguchiko currently
**render only in the "Not on the itinerary yet" strip**, since Kiso Valley
has no segment right now — that strip is not empty at the moment. The
Jameson stops still attach to their city's segment normally. Tokyo has no
stops, so its Ideas block shows its empty state. Every current stop has a
thumbnail in `src/assets/stops/` except Kawaguchiko. The unused
`src/assets/segments/kiso-valley.jpg` hero photo is left in place in case a
Kiso Valley (or similar) segment comes back.

The trip window (Oct 12–27 2026) lives in
[`src/lib/trip.ts`](src/lib/trip.ts), as a code constant rather than content
so the dates survive an entirely empty itinerary. It starts the day we
**leave home** (and PTO starts), not the day we land in Japan: Oct 12 and
Oct 27 belong to no segment on purpose — they're pure travel days, and the
overview grid derives them from the flight legs ("In transit" / "Heading
home"). Segments are legs carved out of that window, and the build warns if
one falls outside it.

## How to add a trip stop (the most common task)

One markdown file in `src/content/stops/` per place. Copy this template,
delete the optional lines you don't need, and run `pnpm build` to
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
image: ../../assets/stops/foo.jpg    # optional — chip thumbnail, ~640px source
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
- **A stop's body text does not appear on its city panel.** An idea chip is a
  thumbnail tile (the stop's `image`, or its category glyph when there's no
  photo) plus the name — no body text, by design. Bodies render on
  `/map/<city>/` and in the unscheduled strip, both of which use `IdeaCard`.
  Write the body as a note to your future self, not as the thing that sells
  the stop.
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

A stop may carry an optional `image` — a small thumbnail (~640px source in
`src/assets/stops/`) rendered only on its idea chip. Segments still own the
hero photo (`heroImage`).

## Trip segments (one file per contiguous stay)

Each leg is one markdown file in `src/content/segments/` (e.g.
`01-tokyo.md`). Segments drive `/overview/`: one city panel per segment, and
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
    service: AA 190     # optional — the short label the overview grid shows:
                        # flight number, train service, or airline
    hours: 16           # optional — approx. door-to-door hours
    departs: 2026-10-12 # optional — the day the leg starts, when that isn't
                        # the day it attaches to. DATE ONLY, never a datetime
    arrives: 2026-10-13 # optional — only when it lands a different day
    leaves: "07:15"     # optional — local departure time, same rules as lands
    lands: "15:00"      # optional — local landing time, 24h "HH:MM",
                        # QUOTES REQUIRED (YAML reads 15:00 as a number)
depart:                 # optional — how we leave
  - mode: train
    text: Romancecar · Shinjuku → Hakone-Yumoto · 1h 25m
arrivalIsTransit: true  # optional — marks this stay's FIRST day as an
                        # arrival/transit day on the overview grid (a long
                        # landing that eats the day) instead of a normal
                        # city day. Doesn't touch lodging — the night still
                        # starts then. Overview-grid-only, like the leg
                        # timing fields below.
heroImage: ../../assets/segments/tokyo.jpg   # optional — see below
heroAlt: Shibuya scramble crossing lit up at night   # required WITH heroImage
tagline: Neon, backstreets, and the best breakfast on earth   # optional
---

Free-form notes about this leg, shown at the end of its section.
```

`mode` picks the glyph; `src/lib/travel.ts` owns the emoji so none ever lands
in frontmatter. **There is deliberately no booked / not-booked field** on legs
or on lodging: legs are the pencilled route (updated in place when something
is actually booked), and lodging is added only once it's real. Legs are
authored on the **arriving** side — each city's `arrive` says how we get to
it — and only the last city carries `depart` (the flight home); everything
else's onward travel is simply the next city's arrival. They render in the
city's **Transportation** card: a single unlabelled list of the arrival legs,
plus a "Heading home" block only when `depart` legs exist. `arrive` also
fills the first Day-by-day row, which is the one day of a stay whose shape is
already decided.

The overview fields (`service` / `hours` / `departs` / `arrives` / `leaves` /
`lands`) exist for the overview grid and nothing else. Defaults when omitted:
an `arrive` leg sits on its segment's `start` day, a `depart` leg on the day
after its segment's `end`. `departs`/`arrives` are **date-only** — a datetime
string would be coerced in the build machine's local timezone and shift the
day; clock time only ever rides `leaves`/`lands` (quoted, or YAML parses
`15:00` as the sexagesimal number 900). `service` is the short label the grid
puts on the leg — keep it to a couple of words, since it sits in one day's
column; the full line stays in `text` and becomes the cell's tooltip.
Day-trip `there`/`back` legs share the schema so the fields are legal there,
but nothing reads them — day trips have no date to hang a column on.

`heroImage` is optional so a city can join the itinerary before anyone has
a picture of it: without one, the city's polaroid renders as an empty frame
saying "No photo yet". `heroAlt` is required whenever `heroImage` is
set — the schema enforces it.

### Coming back to a city

A route can return to a city it already stayed in — the last night before a
flight home is the usual reason. That's just **another segment file with the
same `city`**, and two rules make it work:

- **Slugs get numbered.** The first stay keeps `citySlug(city)`; later ones
  get `-2`, `-3`. That slug lives on `SegmentItinerary.slug`, which is what
  the section id, the overview's bands, and the `/map/<city>/`
  route param all read — **never call `citySlug(segment.data.city)` for a
  stay**, or two stays collide on one anchor and Astro fails on duplicate
  map routes.
- **Only the first stay in a city claims its stuff.** Ideas and day trips
  attach there; a return stay renders with empty Ideas and no day-trip tags
  on purpose. Otherwise every chip would exist twice and the duplicated
  day-trip panels would collide on their own slugs.

Dated stops still attach by date, so a booked stop on the return night lands
in the return stay, which is correct.

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
  shares one `:target` namespace on `/overview/` — a collision fails the build.
- Day-trip stops appear on **no `/map/` page** (those are per-segment).
  Accepted for now; fold them into the parent's map if that ever matters.

## Commands

- `pnpm dev` — local dev server
- `pnpm build` — production build; **this is the validation step** for
  all frontmatter. Run it after any content change.

The package manager is **pnpm**, pinned by the `packageManager` field
(run through corepack if it isn't installed). `pnpm-workspace.yaml` carries
the supply-chain settings and the reasoning behind each; three behaviors to
know about rather than fight:

- **`minimumReleaseAge` quarantines versions younger than 7 days.** If a
  just-released package version won't resolve, that's the policy working —
  wait it out rather than override it.
- **Dependency install scripts are blocked** (pnpm's default). esbuild and
  sharp run fine from their prebuilt binaries; `allowBuilds` records that
  decision. If a future dependency genuinely needs its build script, add it
  there explicitly.
- **`overrides` redirects `@astrojs/react`'s own `vite: ^8.0.13` dependency
  down to astro core's `vite@6.4.3`.** Without it `pnpm dev` 500s on every
  request ("Missing field `moduleType`" from `builtin:vite-react-refresh-
  wrapper") — astro core still runs classic (rollup) vite@6, but
  `@astrojs/react`'s own vite@8 (rolldown) pulls in a react-refresh plugin
  that only works on rolldown-vite, and pnpm's strict isolation resolves it
  correctly rather than accidentally colliding the two like npm's flat
  hoisting would. `astro build` is unaffected either way — that plugin only
  runs in dev. Upstream: https://github.com/withastro/astro/issues/16229
  ("Astro does not currently support Vite 8"). Remove once `@astrojs/react`
  drops its vite@8 dependency or astro core moves to vite@8.

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
nor `/overview/` instantiates Google at all — putting a live map back on
`/overview/` would cost a load per city on every single visit, which is what
blows the daily cap. Verify with
`grep -c MapSlot dist/index.html dist/overview/index.html` (both must be 0)
or a devtools network filter on `maps.googleapis.com`.

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
- `src/pages/overview.astro` — the plan. `.ov-layout` holds two things: a
  `.ov-top` with the one-line header (back link to the cover, `h1`, dates)
  and `TripOverview`, then a `<main>` of one `SegmentAreas` per segment
  (each followed by its `DayTripPanel`s — the Fragment flattens, so every
  panel is a **direct child of `<main>`**, which the tab CSS requires),
  the "Not on the itinerary yet" strip, and `Footer` (inside `<main>` —
  on desktop the page doesn't scroll, so outside it the footer would be
  unreachable). Capped at 110rem because spending the full width on the day
  columns is the point of the grid. Astro emits it as `overview/index.html`,
  so **always link it with a trailing slash** (`/overview/`) or GitHub Pages
  answers with a 301 first.
  **The tab mechanism lives here**, in an `is:global` style block: `.segment`s
  are `display: none` except the `:target` one, and a `:not(:has(...))` rule
  shows the first city on a hashless load. `:target` is scoped to `.segment`
  so targeting `#unscheduled` or a stop id falls back to the first city
  instead of hiding everything. Above 900px the same block locks `.ov-layout`
  to `100svh` and makes `<main>` the scroll container (the map page's
  `min-height: 0` + `overflow-y: auto` pattern), so the grid holds row one;
  below that only the display-swap applies and the document scrolls. The row
  is `minmax(18rem, 1fr)`, not `minmax(0, 1fr)`: on a very short window the
  wrapper overflows the viewport and the root scrolls a little rather than
  crushing the panel to nothing.
  Two ordering traps. `.segment:first-of-type` means the first `<section>`
  child of `<main>`, so **the grid lives in `.ov-top`, outside `<main>`** —
  a sectioning element above the panels would silently steal that rule and
  the page would open blank. And the first panel must stay a base city.
  Because it's all `:target`, it works with JS off, deep links
  (`/overview/#kyoto`) and the map pages' back links open the right city,
  and Back/Forward walk through cities. The whole block is gated behind
  `@supports selector(main:has(...))` — browsers without `:has()` get the
  older shape instead: the grid, then every city stacked on one long
  scrolling page. Don't ungate it; without the gate those browsers would
  open to a blank panel.
  **The "you are here" rules are generated here too**, in frontmatter and
  emitted into `<head>` as an `is:inline` style: CSS can't walk from a
  targeted panel back up to the band that opened it, so there's one
  `.ov-layout:has(#slug:target) .band[href="#slug"]` rule per city, a pair
  per day trip (its own pill lit, its base's band washed — "you are here,
  roughly"), and one `:not(:has(.segment:target))` rule lighting the first
  city's band to match the panel the tab CSS shows. Interpolating slugs raw
  is safe because `citySlug` strips punctuation and `buildItinerary` throws
  on a duplicate. No `@supports` gate needed — browsers without `:has()`
  simply drop the selectors.
- `src/pages/map/[city].astro` — one full-screen map page per segment: rows on
  the left (booked first, then ideas), big map on the right, back link to
  `/overview/#<city>`. `getStaticPaths` passes only the trip-wide segment
  index, which is also what `accentFor()` keys off so the accent matches the
  panel. **Nothing currently links here** — the map preview card was dropped
  in an earlier redesign. The pages still build and are the only place a
  stop's body text and the category filters appear. The back link to
  `/overview/#<city>` doubles as tab selection: it opens that city's panel.
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
  `buildItinerary` fails the build on a slug collision (`overview` and
  `unscheduled` are reserved slugs in that same namespace). **For a stay,
  read `SegmentItinerary.slug`, not `citySlug(city)`** — a repeat city is
  numbered there (see "Coming back to a city").
  `formatStay` renders a stay as arrival→checkout ("Oct 13–17"); `formatRange`
  renders days-in-city ("Oct 13 – Oct 16") and is what the map pages use;
  `formatWindow` is the inclusive compact window ("Oct 12–27", no checkout
  +1) for the page header; `formatHours` is the grid's "~16h" /
  "~30m" shorthand. `buildTripCalendar(itinerary, start, end)` flattens the
  itinerary onto the trip window for the overview grid: one `TripDay` per
  calendar day (city membership, that day's slice of each leg, and the
  `travelSpan` its travel block may spread across — itself plus the
  following travel-free days, capped at 4), plus **two** sets of column
  spans. `bands` is the Sleeping-row/floats grouping — one span per stay,
  unbroken, since a hotel is still needed on the arrival night regardless of
  anything else. `cityBands` is the City-row grouping: identical to `bands`
  except a stay's `arrivalIsTransit` day splits off as its own `'arriving'`
  ghost cell (rendered the same as "In transit" / "Heading home"), so a long
  landing reads as travel-eaten even though the city and the night's lodging
  are already decided. Both are `CalendarBand[]`; only `cityBands` ever
  carries the `'arriving'` kind. `CalendarFloat`s (undated day trips) key off
  `bands`, not `cityBands` — a day trip is offered across the whole stay, not
  just its non-arrival days.
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
  header (title + `titleJa` + subline) and a two-column grid with `stay` and
  `plan` slots, plus an optional `badge` slot above the header (the day-trip
  marker). The header **is the grid's band** at panel scale — the same
  `color-mix(… 20% …)` tint over a 3px accent left key — so the band you
  clicked and the panel that answers read as one object; that echo is also
  why the title wears no highlighter chip. `.segment-inner` is capped at
  74rem but **left-aligned, not centred**, so the panel's left edge lands on
  the sheet's. A day-trip panel passes its **parent's** `alt` so the pair
  reads as one tinted band in the no-`:has()` fallback. Plain flow — no
  sticky, no scroll-driven animation. Owns the alternating `--seg-bg` — a
  gentle tint now that one city shows at a time, but in the no-`:has()`
  fallback the cities stack on one long page again and it's the only thing
  separating them, which is why it stays.
  Its one-column switch is a **container query**, not a media query: the
  panel sits inside a page frame that caps its own width, so viewport width
  says nothing useful about how much room the columns have. That needs
  `container-type: inline-size` on `.segment`, which is only safe because
  this component owns no sticky pin or view-timeline. It carries no inline
  padding — the page frame already insets it, and a second inset would push
  it off the grid's left edge.
- `SegmentAreas.astro` — composes a base's two columns and nothing else.
- `DayTripPanel.astro` — a day trip's panel: badge (a dashed pill, the same
  mark the trip wears in the grid — "🎒 Day trip from <parent>" — that
  doubles as the way back up, since one tap re-targets the parent's
  section), hero photo, "Getting there & back", and Ideas. No `StayCard`,
  no `DayByDay` — structurally absent.
- `CityPhoto.astro` — the hero photo in a paper-and-hairline frame, or an
  empty one saying "No photo yet".
- `StayCard.astro` — "Staying at". **Always renders**, booked or not.
- `TravelCard.astro` — "Transportation". Always renders. For a base it's one
  unlabelled list of the `arrive` legs (empty state: "Nothing booked yet"),
  plus a "Heading home" block only when `depart` legs exist (Osaka's flight
  out). Passing `firstLabel` switches back to the labelled two-half layout —
  `DayTripPanel` passes "Getting there & back" with There/Back.
- `DayByDay.astro` — every day of the stay, booked or not. Free days say
  "Free"; the first day also carries the `arrive` legs.
- `IdeaChips.astro` — the undated stops as flat tiles, each led by a 56px
  matted thumbnail (the stop's `image`, or its category glyph on a
  tinted tile when there's no photo). Name and tile only; no body text (see
  the stop rules above). Day-trip panels reuse it with the trip's claimed
  stops.

### Shared components

- `src/components/Hero.astro` — the cover page's entire contents.
- `src/components/TripOverview.astro` — the overview table, used only by
  `/overview/`: one paper sheet, a sticky label rail, and one column per
  calendar day, fed by `buildTripCalendar`. Pure static Astro — no island,
  no JS. **It is also the page's navigation** — the city bands and day-trip
  pills are same-page hashes that select the panels below, and which one is
  open is drawn by the `:has()` rules `overview.astro` generates. The rows,
  top to bottom: dates; **City** — reads `cityBands`, not `bands` — flat
  accent-tinted strips (the colour is the data, so no tape and no tilt out
  here), each an `<a>` into `#<city>` on the same page, with dashed
  ghosts on segment-less days ("In transit" / "Heading home") and on a
  stay's `arrivalIsTransit` day ("Arriving" — same ghost styling, different
  label, still inside the stay's date range); **Sleeping** — reads `bands`
  — one cell per stay spanning its full days including any arrival-transit
  one, the lodging name (linked when there's a booking page) or "Not
  booked"; **Travel** — the leg's `service` led by its mode glyph,
  then the day's detail ("~16h →" leaving, "→ 15:00" landing), full leg
  text as tooltip + sr-only; **Day trips** — the undated trips as dashed
  pills spanning their parent's columns, linking to their panels.
  **Quiet days draw nothing at all** — no cell, no rule, no column line:
  the marks on the sheet are the things that happen, which is also what
  buys the Travel row its room, since a travel block spans into the empty
  days after it (`travelSpan`). Row hairlines therefore come from a
  dedicated `.rule` element spanning `2 / -1`, not from per-cell borders.
  Day cells are deliberately **not** links — only bands, lodging, and
  pills are, so nothing nests. Two hard-won invariants: the grid element
  itself is the horizontal scroll container (sticky grid items only engage
  against their own grid's scrollport, so a wrapper div breaks the rail —
  and each label spans the full row, because a sticky item can't slide
  inside a one-column grid area), and `.leg` is `position: relative` so its
  sr-only text can't push the page root wider (invisible on desktop, real
  sideways scroll on mobile). That second one is a **general rule, not a
  local fix**: any `.sr-only` needs a positioned ancestor, or it belongs to
  the page root and its static position inside a scroll container becomes
  root overflow — `.chip` and `.idea` are anchored for the same reason,
  after an unanchored one scrolled the grid off screen on a `#hash` load. **Booked reservations don't appear here** —
  dated stops live in the city panels' Day by day.
- `src/components/StopList.astro` + `IdeaCard.astro` — the ruled row list.
  Used by `/map/<city>/` (`layout="column"`) and `/overview/`'s unscheduled
  strip (`layout="grid"`). These two keep the handwritten body line, because
  the map pages are their main home and the strip is a build-warning surface
  rather than part of the panel frame. `StopList` owns the `stopContent` lookup and the empty
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
- `src/assets/segments/` — city hero photos
- `src/assets/stops/` — stop chip thumbnails (~640px sources)
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
- **Two registers, and they don't mix.** The cover is the scrapbook — tape,
  tilt, handwriting, the taped photo. `/overview/` is the instrument — paper
  sheets, hairlines, uppercase micro-labels, accent tints, dashed for
  anything pencilled. The panels used to be scrapbook because they lived a
  click away from the grid; now they sit under it, and two registers on one
  page read as two pages. Keep new marks on the side of the page they're for.
- Shared marks (`.hand`, `.swash`, `.tape`, `.sheet-label`, `.label-icon`,
  `.pill`, `.note-strip`, `.rise-in`) are defined once in `Base.astro`'s
  global block. Scoped rules are (0,2,0) and always win, so a component can
  still tune one locally — see `.hero-cta`, which is `.tape` at button size.
  `.sheet-label` is the flat counterpart to `.tape` — the grid's row-label
  voice, worn by every card header on `/overview/` — and `.label-icon` is the
  emoji leading one (🏨 Staying at, 🚄 travel, 🗓️ Day by day, 💡 Ideas):
  always `aria-hidden`, and **sections wear icons, buttons don't** (the cover
  CTA stays bare, which is why `.tape` has no icon variant).
- React islands (`Filters`, `MapSlot`) are leaves: they orchestrate static
  Astro DOM via data attributes and never render stop content, because
  markdown bodies can only be rendered by Astro's `render()` in frontmatter.
  Their DOM contract is `#<citySlug>` ⊃ `.idea[data-id][data-group]`.
- With JS disabled every page must stay complete and readable — islands only
  add filtering and highlighting on top of fully server-rendered HTML.
- Any CSS animation needs a matching `prefers-reduced-motion` reset.
