/**
 * One taxonomy, one source of truth.
 *
 * `category` on a stop does two jobs: it picks the map-pin glyph, and it maps
 * the stop into one of the four coarse filter buttons below. Order matters —
 * it's the display order everywhere.
 */
export const CATEGORY_KEYS = [
  'coffee',
  'food',
  'bar',
  'market',
  'shop',
  'temple',
  'shrine',
  'museum',
  'view',
  'walk',
  'hike',
  'onsen',
  'sight',
  'activity',
  'stay',
  'travel',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface Category {
  key: CategoryKey;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { key: 'coffee', label: 'Coffee', emoji: '☕' },
  { key: 'food', label: 'Eat', emoji: '🍜' },
  { key: 'bar', label: 'Drinks', emoji: '🍶' },
  { key: 'market', label: 'Markets', emoji: '🏮' },
  { key: 'shop', label: 'Shops', emoji: '🛍️' },
  { key: 'temple', label: 'Temples', emoji: '🏯' },
  { key: 'shrine', label: 'Shrines', emoji: '⛩️' },
  { key: 'museum', label: 'Museums', emoji: '🖼️' },
  { key: 'view', label: 'Views', emoji: '🌇' },
  { key: 'walk', label: 'Walks', emoji: '🚶' },
  { key: 'hike', label: 'Hikes', emoji: '🥾' },
  { key: 'onsen', label: 'Onsen', emoji: '♨️' },
  { key: 'sight', label: 'Sights', emoji: '📍' },
  { key: 'activity', label: 'Activities', emoji: '🎌' },
  { key: 'stay', label: 'Stays', emoji: '🏨' },
  { key: 'travel', label: 'Travel', emoji: '🚄' },
];

/**
 * The filter set shown to a reader. Deliberately much coarser than the
 * category list above — these exist to answer "what am I in the mood for".
 * Four buttons, not sixteen.
 *
 * Anything not listed here (travel, stay) is simply never filtered *to*; it
 * still shows under "All".
 */
export interface FilterGroup {
  key: string;
  label: string;
  categories: string[];
}

export const FILTER_GROUPS: FilterGroup[] = [
  { key: 'coffee', label: 'Coffee', categories: ['coffee'] },
  { key: 'food', label: 'Food', categories: ['food', 'bar', 'market'] },
  {
    key: 'sights',
    label: 'Sights',
    categories: [
      'temple',
      'shrine',
      'museum',
      'view',
      'walk',
      'hike',
      'onsen',
      'sight',
      'activity',
    ],
  },
  { key: 'shops', label: 'Shops', categories: ['shop'] },
];

const GROUP_OF = new Map<string, string>(
  FILTER_GROUPS.flatMap((g) => g.categories.map((c) => [c, g.key]))
);

/** Which filter button a stop answers to, or '' if none */
export const filterGroup = (categoryKey: string): string =>
  GROUP_OF.get(categoryKey) ?? '';
