/**
 * Paper-chart geometry: normalize a city's stops into the unit square.
 *
 * Deliberately dependency-free — no `astro:content`, no React — because both
 * the Astro preview card and the client-side map island import it.
 */

export const SCATTER_PAD = 0.12;

export interface Geo {
  lat?: number;
  lng?: number;
}

/**
 * Drops points with no coordinates. `y` is inverted so north is up. A single
 * point (or any degenerate span) lands dead centre rather than in the padded
 * corner.
 */
export function scatter<T extends Geo>(
  points: readonly T[],
  pad: number = SCATTER_PAD
): (T & { x: number; y: number })[] {
  const placed = points.filter((p) => p.lat != null && p.lng != null);
  if (placed.length === 0) return [];

  const lats = placed.map((p) => p.lat!);
  const lngs = placed.map((p) => p.lng!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;
  const span = 1 - pad * 2;

  return placed.map((p) => ({
    ...p,
    x: spanLng === 0 ? 0.5 : pad + ((p.lng! - minLng) / spanLng) * span,
    y: spanLat === 0 ? 0.5 : pad + ((maxLat - p.lat!) / spanLat) * span,
  }));
}
