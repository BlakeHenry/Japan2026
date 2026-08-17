/**
 * Proposals — parallel drafts of the plan, and the layer that owns which one
 * is "the plan".
 *
 * COMPARE holds several TripDocs side by side: the main plan plus any number
 * of proposals, each a complete document over the same fixed window. Exactly
 * one is active — it is what PLAN mode edits, what EXPORT regenerates
 * `src/content/` from, and what the stale check compares against the
 * committed seed. The others are working state and nothing more: they live in
 * localStorage, export nothing, and a fresh browser starts with a single
 * variant seeded from the committed content.
 *
 * Everything here is pure, like doc.ts — the island stays a thin shell.
 */

import type { TripDoc } from './doc';

export interface PlanVariant {
  id: string;
  name: string;
  doc: TripDoc;
}

export interface PlanStore {
  version: 1;
  /** The variant PLAN mode edits and EXPORT writes. Always one of `variants`. */
  activeId: string;
  variants: PlanVariant[];
}

/**
 * The live localStorage key. v1 and v2 held a single TripDoc; v3 holds the
 * variants wrapper. Bump the suffix whenever this shape — or TripDoc's —
 * changes, or a stored document restores edits the current editor can't
 * express. doc.ts still exports the v2 key so `decodeStore` can migrate it.
 */
export const STORE_KEY = 'japan2026-plan-v3';

/** The seeded variant's id and name. Deterministic, so SSR and reload agree. */
const MAIN_ID = 'main';
const MAIN_NAME = 'Main plan';

let idSeq = 0;
const freshId = (): string => `variant-${Date.now().toString(36)}-${idSeq++}`;

export const activeVariant = (store: PlanStore): PlanVariant =>
  store.variants.find((v) => v.id === store.activeId) ?? store.variants[0];

export const seedStore = (seed: TripDoc): PlanStore => ({
  version: 1,
  activeId: MAIN_ID,
  variants: [{ id: MAIN_ID, name: MAIN_NAME, doc: seed }],
});

/** Replace the active variant's document; the doc mutations stay doc-shaped. */
export function updateActiveDoc(
  store: PlanStore,
  next: TripDoc | ((doc: TripDoc) => TripDoc)
): PlanStore {
  const active = activeVariant(store);
  const doc = typeof next === 'function' ? next(active.doc) : next;
  if (doc === active.doc) return store;
  return {
    ...store,
    variants: store.variants.map((v) => (v.id === active.id ? { ...v, doc } : v)),
  };
}

/** "Option A", "Option B" … the first letter no proposal is already wearing. */
function nextName(store: PlanStore): string {
  const used = new Set(store.variants.map((v) => v.name));
  for (let i = 0; i < 26; i++) {
    const name = `Option ${String.fromCharCode(65 + i)}`;
    if (!used.has(name)) return name;
  }
  return `Option ${store.variants.length + 1}`;
}

/**
 * A new proposal is always a copy of the schedule being edited — a blank one
 * would just be the fixed window with nothing to compare. The copy lands
 * right after its source and becomes active, so "+ NEW PROPOSAL" reads as
 * "branch what I have and keep going".
 */
export function duplicateActive(store: PlanStore): { store: PlanStore; id: string } {
  const src = activeVariant(store);
  const id = freshId();
  const copy: PlanVariant = { id, name: nextName(store), doc: structuredClone(src.doc) };
  const variants = store.variants.slice();
  variants.splice(variants.findIndex((v) => v.id === src.id) + 1, 0, copy);
  return { store: { ...store, variants, activeId: id }, id };
}

/** The last variant can't go — the plan page always has a plan to show. */
export function deleteVariant(store: PlanStore, id: string): PlanStore | null {
  if (store.variants.length <= 1) return null;
  const variants = store.variants.filter((v) => v.id !== id);
  if (variants.length === store.variants.length) return null;
  const activeId = store.activeId === id ? variants[0].id : store.activeId;
  return { ...store, variants, activeId };
}

export function renameVariant(store: PlanStore, id: string, name: string): PlanStore {
  const v = name.trim();
  if (!v) return store;
  return {
    ...store,
    variants: store.variants.map((x) => (x.id === id ? { ...x, name: v } : x)),
  };
}

export function makeActive(store: PlanStore, id: string): PlanStore {
  if (store.activeId === id || !store.variants.some((v) => v.id === id)) return store;
  return { ...store, activeId: id };
}

// --- Restoring ---------------------------------------------------------------

/**
 * The window is fixed and comes from code, so a document stored under an
 * older trip.ts — or one that predates the window being immutable — must not
 * carry its own dates back in. One bad variant condemns the whole store: they
 * all branched under the same window, so they are all equally stale.
 */
const isValidDoc = (doc: TripDoc | undefined, seed: TripDoc): boolean =>
  doc?.version === 1 &&
  Array.isArray(doc.stops) &&
  doc.stops.length > 0 &&
  doc.window?.start === seed.window.start &&
  doc.window?.end === seed.window.end;

/**
 * Parse whatever localStorage holds into a PlanStore, or null to keep the
 * seed. `rawLegacy` is the v2 payload — a bare TripDoc from before proposals
 * existed — which migrates in as the single main variant.
 */
export function decodeStore(
  rawStore: string | null,
  rawLegacy: string | null,
  seed: TripDoc
): PlanStore | null {
  try {
    if (rawStore) {
      const saved = JSON.parse(rawStore) as PlanStore;
      if (
        saved?.version === 1 &&
        Array.isArray(saved.variants) &&
        saved.variants.length > 0 &&
        saved.variants.every(
          (v) =>
            typeof v?.id === 'string' && typeof v?.name === 'string' && isValidDoc(v.doc, seed)
        )
      ) {
        const activeId = saved.variants.some((v) => v.id === saved.activeId)
          ? saved.activeId
          : saved.variants[0].id;
        return { version: 1, activeId, variants: saved.variants };
      }
    }
  } catch {
    /* Corrupt store — fall through and try the legacy key. */
  }
  try {
    if (rawLegacy) {
      const doc = JSON.parse(rawLegacy) as TripDoc;
      if (isValidDoc(doc, seed)) {
        return { version: 1, activeId: MAIN_ID, variants: [{ id: MAIN_ID, name: MAIN_NAME, doc }] };
      }
    }
  } catch {
    /* A corrupt legacy payload just means we keep the committed plan. */
  }
  return null;
}
