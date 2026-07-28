# Japan 2026 trip site

A static Astro site listing our trip itinerary, deployed to GitHub Pages
automatically on every push to `main`.

## How to add or edit a trip stop (the most common task)

Each stop is one markdown file in `src/content/stops/`. To add a place or
event, create a new file there — no layout or code changes needed. Example:

```markdown
---
title: teamLab Planets
city: Tokyo
category: activity
link: https://www.teamlab.art/e/planets/
addedBy: Blake
---

Digital art museum in Toyosu. Book tickets ~2 weeks ahead; go on a weekday.
```

Frontmatter fields (validated by `src/content.config.ts`):

- `title` (required)
- `city` (required) — stops are grouped by city on the homepage
- `category` (required) — one of `food`, `sight`, `activity`, `stay`, `travel`
- `date` (optional, YYYY-MM-DD) — add once the itinerary firms up
- `link` (optional, full URL)
- `addedBy` (optional) — who suggested it

The markdown body is a short free-form description.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (also validates all stop frontmatter)

Run `npm run build` after content changes to confirm nothing broke.

## Structure

- `src/pages/index.astro` — the homepage (layout + styles)
- `src/content/stops/*.md` — one file per trip stop
- `src/content.config.ts` — frontmatter schema
- `.github/workflows/deploy.yml` — GitHub Pages deployment
