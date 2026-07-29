// How you get to a city and how you leave it. Same shape as categories.ts:
// content names a mode, code owns the glyph, so no emoji ever lives in
// frontmatter and changing the icon set is a one-file edit.
//
// There is deliberately no booked / not-booked state. A leg is added once
// it's actually booked, so "unbooked" is spelled by the leg's absence — and
// a status that only ever reads "booked" is a label, not information.

export const TRAVEL_MODES = [
  { key: 'flight', emoji: '✈️' },
  { key: 'train', emoji: '🚄' },
  { key: 'local', emoji: '🚃' },
  { key: 'bus', emoji: '🚌' },
  { key: 'ferry', emoji: '⛴️' },
  { key: 'car', emoji: '🚗' },
  { key: 'walk', emoji: '🚶' },
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number]['key'];

export const TRAVEL_MODE_KEYS = TRAVEL_MODES.map((m) => m.key) as [
  TravelMode,
  ...TravelMode[],
];

const BY_KEY = new Map(TRAVEL_MODES.map((m) => [m.key, m]));

export function travelEmoji(mode: TravelMode): string {
  return BY_KEY.get(mode)?.emoji ?? '📍';
}
