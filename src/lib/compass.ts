/**
 * The compass rose ornament, shared verbatim by MapPreview.astro (static
 * Astro) and MapSlot.tsx (React island).
 *
 * It's the inner markup as a string rather than a component because an Astro
 * component can't render inside a React island — injected with `set:html` on
 * one side and `dangerouslySetInnerHTML` on the other. Both sides supply the
 * <svg> wrapper, so `.mapslot-compass` in map-paper.css still drives the
 * colour and size.
 *
 * Deliberately NOT a CSS data-URI background: `currentColor` and
 * `var(--font-display)` don't survive a data URI, and a background layer
 * paints below every child — the compass would vanish under the live Google
 * basemap the moment it loads.
 *
 * Plain SVG attribute names (stroke-width, text-anchor), which is what both
 * innerHTML paths want; JSX camelCase would be wrong here.
 */
export const COMPASS_INNER = `
  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="1.5" />
  <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="0.6" />
  <path d="M50 14 L55 45 L50 50 L45 45 Z" fill="currentColor" />
  <path d="M50 86 L55 55 L50 50 L45 55 Z" fill="currentColor" opacity="0.45" />
  <path d="M14 50 L45 45 L50 50 L45 55 Z" fill="currentColor" opacity="0.45" />
  <path d="M86 50 L55 45 L50 50 L55 55 Z" fill="currentColor" opacity="0.45" />
  <text x="50" y="9" text-anchor="middle" font-size="11" font-family="var(--font-display)" fill="currentColor">N</text>
`;
