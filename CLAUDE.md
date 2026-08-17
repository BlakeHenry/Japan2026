# Japan 2026 trip site

A static Astro site in three layers:

- **`/`** — the cover. One viewport, no scroll: the dates, the title, a taped
  photo, and a single washi-tape button into the plan. It loads no map and
  nothing below the fold, because it is a cover and not a page.
- **`/overview/`** — the plan, and the whole of it. A horizontal timeline of
  the trip window: one column per calendar day, and the stops as draggable
  bars that tile it end to end. Drag a bar to reorder it, drag the handle
  between two bars to move a day across, double-click to rename, `+` to insert
  a stop or hang a day trip off a day. Below the timeline, the selected stop's
  pane: name, dates, a travel toggle, and its day trips.
  **There can be several schedules.** The PLAN | COMPARE toggle in the header
  flips to a compare view: one read-only row per proposed schedule, `+ NEW
  PROPOSAL` to branch the one being edited, MAKE MAIN PLAN to switch which
  one PLAN mode edits and EXPORT writes. Proposals are localStorage-only
  working state — only the active schedule ever exports, and a fresh browser
  has exactly one, seeded from the committed content.
  **The track fills the window**, so a wide screen gets fat day columns; below
  about 1070px it stops shrinking and scrolls sideways instead.
  **A travel day is a stop, not a flag on a day.** Insert one and mark it as
  travel; it draws hatched and exports no segment file. There is deliberately
  no per-day toggle — one way to say a thing. The first and last days of the
  trip are travel stops like any other, not a special case.
  **The site plans SCHEDULED things only** — which city we're in each day, the
  day trips out of it, and reservations when there are any. There is no place
  to keep loose ideas, by design.
  **The trip's dates are fixed.** The stops tile a settled window, so a
  boundary drag moves a day between neighbours and nothing changes the trip's
  length. Nothing on this page writes outside `src/content/`.
  **This page is editable, and the edits are the point.** The site is static
  on GitHub Pages, so there is no backend: the working state lives in
  `localStorage`, and **EXPORT downloads the regenerated `src/content/`
  markdown** to bring back and commit (see "The plan document and the export
  loop"). A fresh browser shows whatever is committed.
  It is **JS-owned** — the only page that is — and it is its own visual
  register: Sora, Space Mono, a blue accent, light-grey app chrome. The cover
  and the map pages keep the paper register, and the two never mix; every
  planner rule is namespaced `.pl-`.
  Deliberately **not** here: lodging, the arrive/depart legs, hero photos.
  Those fields still live in the markdown and still survive export — nothing
  draws them.
- **`/map/<city>/`** — one full-screen map page per city: rows on the left,
  big map on the right, the way you'd browse a saved list in Google Maps.
  It renders the `stops` collection, which is **empty right now** — see
  "Reservations" below — so every one of these pages currently shows its empty
  state. That is correct, not broken.

Deployed to GitHub Pages automatically on every push to `main`.

## Current state

**Nothing is booked**, but the route is pencilled. Four stays in three
cities: **Tokyo** Oct 13–16 (checkout the 17th), **Kyoto** Oct 19–22
(checkout the 23rd), **Osaka** Oct 23–25 (checkout the 26th), and **Tokyo
again** for the single night of the 26th (`05-tokyo-return.md`) — the ride
back up is the 26th and the flights home leave Haneda on the 27th. That
return stay is the site's one **repeat city**: it slugs `tokyo-2`, and the
day trips all stay with the first Tokyo (see "Coming back to a city" below).

**Oct 17–18 is an open gap, not a segment.** Kiso Valley was pencilled
there and got pulled off the itinerary — no replacement is decided, so
those two days simply have no segment, and the timeline
shows them as a hatched travel bar until something is chosen. `03-kyoto.md`
lost the
`arrive` legs that used to route through it (Nagiso, on the old Kiso Valley
line) for the same reason: the actual path from Tokyo to Kyoto is unchosen
again. **Kawaguchiko is one candidate**, and it is currently written down
nowhere — it used to be a pencilled stop file, which went when ideas did.
When it's chosen it becomes what any decided place is: a stop on the
timeline over those two days, named on the bar and exported as a segment.

**Blake lands at 3pm on Oct 13**, so that day is largely spoken for by
getting to the hotel and dinner. Nothing on the site says so right now: it
used to be `arrivalIsTransit` / `transitDays` on the Tokyo segment, and both
went when the per-day toggle did. Saying it in the current model means making
Oct 13 its own travel stop — which would take that day out of Tokyo and leave
that night without a city, so it hasn't been done. Day trips are pencilled in too, as
their own collection (`src/content/daytrips/`): Ito on Tokyo (an onsen day
on the Izu coast), Nara and Uji on Kyoto, and Himeji + Kobe on Osaka (one
combined outing, one file). None has a `date` yet, so they all hang off the
middle of their base as dashed pills — drag one onto a day to pin it. Each
carries pencilled `there`/`back` train legs, **authored and rendered
nowhere**; none has a photo yet, and the planner draws no photos anyway.

No city has lodging. Nothing on the site says so any more — the planner
doesn't draw lodging at all — but the field is still in the schema and still
survives export. Every segment carries pencilled `arrive` legs (the trains between
cities, and placeholder flights into Tokyo from Austin and Denver); the
Tokyo return stay also carries `depart` (placeholder flights home from
Haneda). The two Tokyo flights are a
**split arrival**: Blake's (Austin) departs Oct 12 and lands Oct 13 at
15:00; James's (Denver) departs Oct 13 and lands Oct 14, landing time not
yet known. Legs are **pencilled routes chosen by the humans** — researched
and plausible, but not bookings — and they get updated when something is
actually booked. The rule stands in adjusted form: **don't invent lodging
or reservations to make the page look fuller, and don't add or change
transit legs nobody chose.** Everything on the site should be something a
person actually chose.

**`src/content/stops/` is empty.** It used to hold eleven pencilled places —
five Jameson added (`addedBy: Jameson`; three Pokémon / TCG stops in Osaka,
two in Kyoto), five researched Kiso Valley ideas (the Magome→Tsumago
Nakasendo walk, Tsumago-juku, Narai-juku, Nezame-no-toko gorge, Kozenji's
rock garden), and the pencilled Kawaguchiko stop. All eleven were deleted
when the site narrowed to scheduled things only; `git log` has them, and
their thumbnails are still in `src/assets/stops/`. **Nothing renders those
thumbnails** — the planner drew photos out of the panel long before this —
and the same is true of the segment hero photos and the unused
`src/assets/segments/kiso-valley.jpg`. All of it is kept because the fields
and the files are still right and a photo view may come back.

The trip window (Oct 12–27 2026) lives in
[`src/lib/trip.ts`](src/lib/trip.ts), as a code constant rather than content
so the dates survive an entirely empty itinerary. It starts the day we
**leave home** (and PTO starts), not the day we land in Japan: Oct 12 and
Oct 27 belong to no segment on purpose — they're pure travel days, and the
timeline seeds them as `gap` bars ("In transit" / "Heading home"). Segments
are legs carved out of that window, and the build warns if one falls outside
it.

**The window is fixed, and only a human editing `trip.ts` changes it.** The
timeline's stops tile it exactly, so dragging a boundary moves a day between
neighbours and never changes the trip's length. There used to be
**← DAY AT START / DAY AT END →** controls that grew the window, and an
export path that rewrote the two `Date.UTC(...)` calls to match; both are
gone, along with `trip.ts` from `pnpm plan:apply`'s allowlist. **No export
touches code any more** — a plan bundle names `src/content/**.md` and
nothing else. If the dates ever do move, edit `trip.ts`, and the stops at
whichever end has to absorb the change are the travel gaps.

## Reservations

There are none yet, and there is no other kind of stop. `src/content/stops/`
holds **dated reservations only** — a dinner booking, a timed ticket — and it
is empty, so `pnpm build` warns twice about an empty collection. That warning
is the honest state of things, not a fault to fix.

Undated stops ("ideas") were how most of this site's content used to work.
They are gone on purpose: the site plans where we'll be each day, the day
trips out of each base, and reservations. A place nobody has committed to
belongs in a notes app, not here.

When the first reservation lands, one markdown file in `src/content/stops/`:

```markdown
---
title: Den                           # required
city: Tokyo                          # required — must match the segment's city
category: food                       # required — see valid keys below
date: 2026-10-15                     # REQUIRED — this is what makes it a reservation
time: "19:00"                        # optional — 24h "HH:MM", quotes required
link: https://example.com/           # optional — booking page
lat: 35.6812                         # optional — see "Coordinates" below
lng: 139.7671                        # optional — pairs with lat
image: ../../assets/stops/foo.jpg    # optional — ~640px source
---

One or two short sentences. **No markdown links in the body** (see below).
```

Rules:

- **Always set `date`.** A stop without one is an idea, and ideas have no home
  on this site — it would land in the unscheduled residue, warn at build time,
  and render nowhere anybody looks.
- **Dated stops attach by date, not by city.** A reservation lands in
  whichever segment its `date` falls inside; its `city` is only checked so
  the build can warn you when the two disagree. Read the build output.
- **The planner does not draw reservations yet.** They round-trip through
  nothing — `TripDoc` has no node for them — so the planner's EXPORT neither
  writes nor deletes a stop file. Edit these by hand. Wiring them into the
  pane is the obvious next piece of work.
- **They do render on `/map/<city>/`**, which is the only page that reads the
  `stops` collection at all.
- **No markdown links in a stop's body.** Wherever a body renders, the whole
  row is an `<a>`, and a nested link is invalid HTML — the parser unnests it,
  which lifts the row out of its city section and silently kills that row's
  map-pin highlighting and filtering. Put the URL in `link:` instead.
- Do NOT add frontmatter fields beyond the template — the schema in
  `src/content.config.ts` is intentionally minimal, and extra keys are
  **stripped by zod**, so nothing reads them.

### Coordinates are what light up the maps

`lat`/`lng` are optional, but they're the single highest-value thing you can
add to a stop: the stop gets a pin on the city's map page, and its row opens
Google Maps instead of the venue's website.

To get a coordinate: right-click the spot in Google Maps and the `lat, lng`
is the first item in the menu — click to copy.

### What a row links to

One target, in this order:

1. `lat`/`lng` → Google Maps at that coordinate (new tab)
2. otherwise `link` → that URL (new tab)
3. otherwise it isn't a link at all

So a stop with **both** coordinates and a `link` opens Maps, not the site —
on the day, "where is it" beats "what are its hours", and the venue's site is
one tap away inside Maps.

Valid `category` keys (defined in `src/lib/categories.ts`):
`coffee food bar market shop temple shrine museum view walk hike onsen
sight activity stay travel`

The category picks the map-pin glyph and — on `/map/<city>/`, the only page
that draws a stop — which filter button matches it: **Coffee** = coffee ·
**Food** = food, bar, market · **Sights** = temple, shrine, museum, view,
walk, hike, onsen, sight, activity · **Shops** = shop. (`travel` and `stay`
only appear under "All".)

A stop may carry an optional `image` (~640px source in `src/assets/stops/`).
**Nothing renders it today**, the same as segment `heroImage`.

## Trip segments (one file per contiguous stay)

Each leg is one markdown file in `src/content/segments/` (e.g.
`01-tokyo.md`). Segments drive `/overview/`: one bar on the timeline per
segment, and one pane per bar.

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
    service: AA 190     # optional — the short label for this leg: flight
                        # number, train service, or airline
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
                        # NOTE: there is no per-day "this day is travel"
                        # field, on purpose. A day eaten by travel is its own
                        # stop with no segment file (the hatched TRAVEL bars),
                        # not a flag on a stay. `arrivalIsTransit` and
                        # `transitDays` both said it the other way and were
                        # removed — don't reintroduce them.
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
else's onward travel is simply the next city's arrival.

**No leg renders anywhere today.** The overview grid's Travel row was the one
place they showed, and the timeline replaced it — a leg is now the same kind
of authored-but-undrawn fact `service`, `leaves` and `lands` already were.
Every leg field is still legal, still validated, and still round-trips
through export, so **keep filling them in**: they're facts a human chose and
they're what a real booking carries. Just don't expect to see them.
Day-trip `there`/`back` legs are in the same position.

The rules that still bind if legs come back: `departs`/`arrives` are
**date-only** — a datetime string would be coerced in the build machine's
local timezone and shift the day — and clock time only ever rides
`leaves`/`lands`, quoted, or YAML parses `15:00` as the sexagesimal number
900. The zod refine on `arrives >= departs` still fails the build.

`heroImage` is optional so a city can join the itinerary before anyone has
a picture of it. `heroAlt` is required whenever `heroImage` is set — the
schema enforces it. **Neither renders today**: the planner draws no photos.
Both are kept, and both survive export.

### Coming back to a city

A route can return to a city it already stayed in — the last night before a
flight home is the usual reason. That's just **another segment file with the
same `city`**, and two rules make it work:

- **Slugs get numbered.** The first stay keeps `citySlug(city)`; later ones
  get `-2`, `-3`. That slug lives on `SegmentItinerary.slug`, which is what
  the plan document's stop id and the `/map/<city>/`
  route param both read — **never call `citySlug(segment.data.city)` for a
  stay**, or two stays collide on one anchor and Astro fails on duplicate
  map routes. (The planner's own `#hash` is `citySlug(name)`, so two Tokyos
  share one hash and a deep link opens the first — acceptable, since the hash
  exists for the map pages' back links.)
- **Only the first stay in a city claims its stuff.** Day trips attach there;
  a return stay shows none on purpose, or the duplicated trips would collide
  on their own slugs. The planner lets you drag a day trip onto a return stay
  anyway — export **warns** that it will render on the first stay instead,
  rather than silently moving it.

Reservations still attach by date, so one booked on the return night lands
in the return stay, which is correct.

## Day trips (one file per outing)

A day trip is a **sub-location of a base**: one markdown file in
`src/content/daytrips/`, drawn on the timeline as a pill hanging off a day of
its parent by a connector, and — when selected — a pane of its own: name and
the day it's pencilled for. Solid connector when it has a `date`, dashed when
it doesn't. Drag the pill to another day to re-date it, or onto another
city's days to re-parent it; both are written on export.

```markdown
---
name: Himeji + Kobe     # display name — also becomes the section slug
parent: Osaka           # required — must exactly match a segment's city
date: 2026-10-24        # optional — the day this outing is pencilled for.
                        # Omit for "we'll fit it in somewhere": the pill hangs
                        # off the middle of the base, dashed. Date-only, and
                        # it must fall inside the parent's stay — a date
                        # outside it is treated as unpinned. Dragging the pill
                        # on /overview/ sets this.
cityJa: "姫路・神戸"     # optional — joins the same derived font subset
note: one day, castle then harbour   # optional — renders where a base shows dates
cities:                 # optional — the towns a combined outing covers, and
  - Himeji              # the keys its stops match on. Defaults to [name], so
  - Kobe                # single-town trips omit it
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

- A combined outing ("Himeji + Kobe") is **one file**, because it's one
  pencilled day. Renaming such a trip does **not** rewrite `cities`; renaming
  one without `cities` does retarget it, since its name is what stops match
  on. Don't use a segment's city as a matching key — the segment claims those
  stops first, and the build warns if you try.
- Deliberately no lodging — we sleep at the base. `date` is the day it's
  pencilled for, not a booking; an actual reservation is still a dated stop.
- Every section slug (`citySlug` of segment cities and day-trip names)
  shares one anchor namespace — a collision fails the build.
- Day-trip stops appear on **no `/map/` page** (those are per-segment).
  Accepted for now; fold them into the parent's map if that ever matters.

## The plan document and the export loop

`/overview/` is editable, and the site has no backend. The loop that closes
that gap:

1. **Seed.** `seedDoc(itinerary)` turns the committed content into a `TripDoc`
   at build time and serializes it into the page. A fresh browser sees exactly
   what is in `src/content/`.
2. **Edit.** The island writes every change to
   `localStorage['japan2026-plan-v3']`. Nothing is uploaded anywhere.
3. **Export.** EXPORT downloads `japan2026-content.txt` — a delimited bundle
   of regenerated markdown, one `===== FILE: <path> =====` section each, plus
   `===== DELETED: <path> =====` lines and any warnings. Only the **active**
   schedule exports; proposals on the compare view are drafts and never touch
   a bundle.
4. **Apply.** `pnpm plan:apply <file>` writes the bundle back onto disk.
   Then `pnpm build` to validate. It refuses any path outside
   `src/content/**.md`, because the bundle is a downloaded file.

The allowlist used to include `src/lib/trip.ts`, for the one edit that
lengthened the trip. The dates are fixed now, so **no bundle names a code
file** and the allowlist is content-only.

The plan document covers **segments and day trips**. Reservations
(`src/content/stops/`) are not in it, so a bundle never writes or deletes
one — which also means the round-trip assertion below has nothing to say
about them.

Three things hold this together, and breaking any of them loses data:

- **The document carries raw file text, not parsed values.** Each node keeps
  its source file's frontmatter block and body verbatim, and export re-sets
  only the handful of keys the editor owns. Re-emitting frontmatter from
  `entry.data` would silently drop unknown keys — **zod strips** anything
  outside the schema — along with comments and authored formatting. Lodging,
  the arrive/depart legs and the hero photo all survive this way, and none of
  them is drawn.
- **A key set to the value it already has is a byte-level no-op**, so an
  untouched file exports identical. Which means dates must be written bare
  (`start: 2026-10-13`) the way they're authored, not quoted the way
  `yamlScalar` would quote a leading digit.
- **The round trip is asserted on every build.** `seedDoc` exports the
  committed plan immediately and requires the files back byte-identical,
  throwing like a duplicate slug does if not. A mismatch means EXPORT would
  rewrite something nobody edited. If it fires after a content edit, the
  emitter and the authored form have diverged — fix the emitter, don't
  reformat the content to match it. If it fires with a stale-looking value,
  restart the dev server: its content layer caches, and clearing `.astro`
  while it is running corrupts the store.

**A `gap` node exports nothing.** Gaps are the days no segment claims, which
is what "In transit" and the open Oct 17–18 stretch already mean in the
content model. The pane's travel toggle flips a stay to a gap and back; a stay
that becomes a gap has its segment file deleted.

Day trips name their base by **city name**, so renaming a stop re-parents its
day trips on export.

**`localStorage` is versioned** (`japan2026-plan-v3`, the `STORE_KEY` in
`variants.ts`). Bump the suffix whenever `TripDoc`'s shape — or the store's —
changes, or a stored document restores edits the current editor can't
express: v1 carried loose ideas and a movable window, v2 was a single
document with no proposals. A v2 payload still migrates in as the one main
variant; anything older is refused. The island also refuses a store whose
window doesn't match the committed one, so a `trip.ts` edit can't be masked
by old local state — and since every proposal branched under the same window,
one bad variant condemns the whole store.

## Commands

- `pnpm dev` — local dev server
- `pnpm build` — production build; **this is the validation step** for
  all frontmatter, and it runs the export round-trip assertion. Run it after
  any content change.
- `pnpm plan:apply <bundle.txt>` — write an exported plan back into
  `src/content/`. `--dry-run` to see what it would touch.

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
**Stop the dev server first.** Clearing `.astro` underneath a running server
corrupts its data store, and the symptom is confusing: it keeps serving the
pre-delete content, so the round-trip assertion fires against a file that no
longer says what the loader thinks it says. Restarting the server fixes it —
`pnpm build` in a clean checkout is the honest answer either way.

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
- `src/pages/overview.astro` — the plan. Almost nothing: it seeds the plan
  document from the committed content (`seedDoc(itinerary)`), requests the two
  planner fonts into `Base`'s `head` slot, and hands the seed to `PlanBoard`.
  Astro emits it as `overview/index.html`, so **always link it with a trailing
  slash** (`/overview/`) or GitHub Pages answers with a 301 first.
  The fonts are requested **here, not in `Base`** — Sora and Space Mono belong
  to this page only, and the cover must not pay for them.
  This page used to be a `:target`-driven CSS tab system over a spreadsheet
  grid, with per-segment `:has()` rules generated into `<head>`. All of that
  is gone: the timeline is a React island and owns selection itself. What
  survived is the **hash contract** — `/map/<city>/` still links back to
  `/overview/#<city>`, and the island honours an incoming hash on mount and
  keeps it current with `history.replaceState`. Don't break it.
- `src/pages/map/[city].astro` — one full-screen map page per segment: stop
  rows on the left, big map on the right, back link to `/overview/#<city>`.
  `getStaticPaths` passes only the trip-wide segment index, which is also what
  `accentFor()` keys off so the accent matches the panel. **Nothing currently
  links here** — the map preview card was dropped in an earlier redesign — and
  with no reservations booked, every one of these pages is its empty state.
  It is still the only page that reads the `stops` collection, renders a
  stop's body text, or draws the category filters.
- `src/pages/404.astro` — GitHub Pages serves this for unmatched paths

### Lib

- `src/lib/trip.ts` — the trip's own facts (name, year, date window). The one
  thing not derived from content, so it survives an empty itinerary.
- `src/lib/loadTrip.ts` — loads collections, pre-renders **stop** markdown
  bodies (only `/map/<city>/` still renders one), assigns per-city accent
  colors, derives the kanji subset for the Japanese face, and warns when a
  segment falls outside the trip window
- `src/lib/itinerary.ts` — splits stops into `ideas` (undated) / `booked`
  (dated) per segment, and attaches day trips to their parent; `stopSlug`/
  `stopDomId` sanitize collection ids for DOM use (ids can contain slashes);
  `mapPoints` serializes stops for the map island. The `ideas` bucket and the
  `unscheduled` residue still exist here because the map pages and the
  build-time warnings are written in terms of them — with `src/content/stops/`
  empty, both are simply empty, and a future reservation lands in `booked`.
  `citySlug` is the single source for a city's or day trip's anchor,
  `<section id>`, island `segmentId`, and `/map/<city>/` route param — they
  must all agree. It strips punctuation ("Himeji + Kobe" → `himeji-kobe`)
  because a `+` in an id would break the generated `:has()` CSS, and
  `buildItinerary` fails the build on a slug collision (`overview` and
  `unscheduled` are reserved slugs in that same namespace). **For a stay,
  read `SegmentItinerary.slug`, not `citySlug(city)`** — a repeat city is
  numbered there (see "Coming back to a city").
  `formatRange` renders days-in-city ("Oct 13 – Oct 16") and is what the map
  pages use. `formatStay`, `formatWindow`, `formatHours` and
  `buildTripCalendar` (with its `TripDay` / `CalendarBand` / `CalendarFloat`
  types) were the spreadsheet's, and went with it — the timeline works in day
  offsets and formats its own labels. `git log` has them.
- `src/lib/travel.ts` — travel modes and their glyphs, same shape as
  `categories.ts`: content names a mode, code owns the emoji.
- `src/lib/categories.ts` — category keys, the four filter groups, and
  `filterGroupsFor()` (pass the categories a list actually renders, not every
  category in the city — a button that hides everything on screen is broken)
- `src/lib/scatter.ts` — normalizes lat/lng into the unit square for the paper
  chart. Dependency-free on purpose.
- `src/lib/compass.ts` — the compass rose SVG as a string, injected into the
  React island (an Astro component can't render inside one).

### The plan (`src/lib/plan/`, `src/components/plan/`)

- `doc.ts` — the `TripDoc` type and every mutation, as **pure functions**
  returning a new document (`resize`, `reorder`, `insertAt`, `deleteStop`,
  `renameStop`, `toggleKind`, and `addTrip`/`moveTrip`/`deleteTrip`/
  `renameTrip`). The interaction layer stays a thin shell over these, so the
  logic is testable without a DOM — and call them through `commitDoc`'s
  **updater** form wherever the result isn't needed, or two commits landing
  before the next render drop the first. Also the day arithmetic:
  `toDayNumber`/`fromDayNumber` keep everything in UTC, and `hashDoc` digests
  only the content-derived parts (never hue or ids, so a rebuild doesn't read
  as a content change). **Nothing here writes `window`** — the trip's dates
  are fixed, and no mutation may start changing that quietly.
  Anything that shrinks a stop must call `clampToLength`, or a day trip keeps
  a `day` past the end of its parent and silently stops rendering.
- `variants.ts` — proposals: the `PlanStore` that holds several `TripDoc`s
  side by side and knows which one is active, plus its pure verbs
  (`duplicateActive`, `deleteVariant`, `renameVariant`, `makeActive`,
  `updateActiveDoc`) and `decodeStore`, which validates a stored payload and
  migrates the legacy single-document v2 key. Owns `STORE_KEY`
  (`japan2026-plan-v3`). The doc mutations in `doc.ts` never know proposals
  exist — everything routes through `updateActiveDoc`.
- `seed.ts` — the committed content as a `TripDoc`, at build time. Runs of
  days no segment claims become real `kind: 'gap'` nodes so the timeline tiles
  the whole window. It also runs the **round-trip assertion** (below).
- `frontmatter.ts` — surgical top-level key edits on a raw frontmatter block.
- `export.ts` — the emitters, `exportPlan(doc)`, and `roundTripDiff`.
- `PlanBoard.astro` — the wrapper: the seed in, the island out, and all the
  planner CSS in an `is:global` block (island DOM sits outside Astro's style
  scoping, same as `FilterBar`). `client:load`, not `client:visible` — the
  timeline *is* the page.
- `PlanTimeline.tsx` — the island: day rail, stop bars, resize handles,
  hatching, day-trip branch pills, persistence, the staleness banner, hash
  sync, and EXPORT. Ported from the imported Claude Design component, whose
  runtime is React underneath, so its `state` became the `TripDoc` and its
  bindings became ordinary props. Its state is the whole `PlanStore` since
  proposals landed; the header's PLAN | COMPARE toggle swaps the timeline for
  `ComparePane`, and every doc edit routes through `commitDoc` onto the
  active variant.
  Drag handlers attach their listeners to **`window`**, not the element — the
  pointer leaves a one-day-wide bar constantly — and read the live document,
  stop order and day width through refs, because they outlive the render that
  created them.
  **A day is worth `trackW / total` pixels, not a constant.** A `ResizeObserver`
  on `.pl-scroll` measures its content box, the track takes that width exactly,
  and `MIN_TRACK` (1000px) is the floor below which the days stop shrinking and
  the track scrolls instead. Measuring the content box is what keeps it stable:
  it excludes the gutters and doesn't grow with the track it scrolls, so a
  wider track can't feed back into the measurement. `ppd` is deliberately
  fractional — rounding it leaves a ragged strip at the right edge.
  A boundary's `+` is revealed by `.pl-handle`'s own hover, so the handle's
  box has to **contain** it — it reaches 28px above the bars via `padding-top`
  for exactly that reason. Move the button out of that box and it vanishes the
  instant you reach for it.
- `ComparePane.tsx` — the COMPARE view: one read-only row per proposed
  schedule (stops, travel hatching, pinned day-trip pills — unpinned ones are
  editing furniture and don't draw), a sticky 232px name gutter, and the
  variant verbs (rename, MAKE MAIN PLAN, DELETE, `+ NEW PROPOSAL`). The
  fixed window means every row is the same length, so the imported design's
  "+2 DAYS" delta has no equivalent here on purpose. The gutter width is
  duplicated between `GUTTER_W` and `.pl-cmp-gutter` — keep them agreeing.
- `DetailPane.tsx` — the pane below: name, dates, the travel toggle, and the
  day-trip chips. `IdeaEditor.tsx` sat beside it and is gone with ideas.

### Shared components

- `src/components/Hero.astro` — the cover page's entire contents.
- `src/components/StopList.astro` + `IdeaCard.astro` — the ruled row list,
  now used only by `/map/<city>/` (`layout="column"`). It keeps the
  handwritten body line, because the map pages are the last place a stop's
  body renders. `StopList` owns the `stopContent` lookup and the empty state.
  The row element **is** the `<a>`; non-linking rows are an
  `<article tabindex="-1">` so the map can still focus them.
  `layout="grid"` has no consumer at all now; it stays because it costs
  nothing. `IdeaCard` is named for a concept the site dropped — it draws any
  stop row, and today that means reservations.
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
`display=swap` fallbacks. These are the **paper** register — the cover and
the map pages.

**Sora** and **Space Mono** are the planner's, and they are requested in
`overview.astro`'s `head` slot rather than in `Base`, so no other page pays
for them. They live on `.pl-surface` as `--pl-sans` / `--pl-mono` and never
appear outside `.pl-` rules.

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
  place at a time, so a block that's still empty has to say so rather than
  quietly disappear and leave the trip looking settled. `StopList` and
  `.mapslot-blank` each state their own emptiness — which is the whole of
  `/map/<city>/` right now, with no reservations booked. Copy on the page
  stays user-facing — authoring guidance lives here instead.
  **One honest empty state per fact** — before adding one, check something a
  screen up isn't already carrying it. On the planner an empty stretch of
  days is *already* a mark (a hatched TRAVEL bar), so it needs no caption.
- **Two registers, and they don't mix.** The cover and `/map/<city>/` are the
  paper: tape, tilt, handwriting, hairlines, EB Garamond and Caveat.
  `/overview/` is the instrument, and since the timeline landed it is
  frankly a **tool**: Sora, Space Mono, a blue accent, grey app chrome,
  dashed and hatched for anything pencilled. Every planner rule is namespaced
  `.pl-` and defines its own tokens on `.pl-surface` rather than inheriting
  the paper ones, which is what keeps the two apart. Don't reach across —
  a `.tape` on the planner or a `.pl-btn` on the cover is the smell.
- Shared marks (`.hand`, `.swash`, `.tape`, `.sheet-label`, `.label-icon`,
  `.pill`, `.note-strip`, `.rise-in`) are defined once in `Base.astro`'s
  global block. Scoped rules are (0,2,0) and always win, so a component can
  still tune one locally — see `.hero-cta`, which is `.tape` at button size.
  `.sheet-label` is the flat counterpart to `.tape`, and `.label-icon` the
  emoji leading one: always `aria-hidden`, and **sections wear icons, buttons
  don't** (the cover CTA stays bare, which is why `.tape` has no icon
  variant). Both lost their `/overview/` consumers when the planner landed —
  its own micro-label is `.pl-block-label`, which is the same voice in the
  planner's register. Don't reach for the paper marks over there.
- **Two kinds of island, and the difference matters.** `Filters` and
  `MapSlot` are *leaves*: they orchestrate static Astro DOM via data
  attributes and never render stop content, because markdown bodies can only
  be rendered by Astro's `render()` in frontmatter. Their DOM contract is
  `#<citySlug>` ⊃ `.idea[data-id][data-group]`.
  `PlanTimeline` is the exception and the only one: it *owns* its DOM, from a
  JSON document serialized in at build time. It still can't render a markdown
  body — that constraint is a property of Astro, not of the island — which is
  why the plan document carries bodies as **raw text** for export and the
  planner draws none of them.
- **JS-off is a per-page promise, not a site-wide one.** The cover and
  `/map/<city>/` must stay complete and readable with JS disabled; their
  islands only add filtering and highlighting on top of server-rendered HTML.
  `/overview/` is deliberately exempt — it is an editor, editing needs JS, and
  a read-only fallback would be a second renderer of the same data to keep in
  sync. It renders nothing without JS, and that is the accepted trade.
- Any CSS animation needs a matching `prefers-reduced-motion` reset.
