/**
 * Proposals — parallel drafts of the plan, and the layer that owns which one
 * is "the plan".
 *
 * COMPARE holds several TripDocs side by side: the main plan plus any number
 * of proposals, each a complete document over the same fixed window. Exactly
 * one is active — it is what PLAN mode edits, what EXPORT regenerates
 * `src/content/` from, and what the stale check compares against the
 * committed seed. The others ride the export as one machine-written snapshot
 * (`src/content/proposals.md`), so a fresh browser starts with the main
 * variant seeded from the committed content plus whatever proposals the
 * snapshot carries.
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
  /**
   * The variant PLAN mode edits and EXPORT writes as markdown; the rest land
   * in the proposals snapshot. Always one of `variants`.
   */
  activeId: string;
  variants: PlanVariant[];
}

/**
 * The live localStorage key. v1 and v2 held a single TripDoc; v3 was the
 * variants wrapper from before stops carried `travelHours`; v4 is current.
 * Bump the suffix whenever this shape — or TripDoc's — changes, or a stored
 * document restores edits the current editor can't express. doc.ts still
 * exports the v2 key so `decodeStore` can migrate it.
 */
export const STORE_KEY = 'japan2026-plan-v4';

/**
 * The previous store key — same wrapper shape, its documents just predate
 * `travelHours` (optional, so they validate as-is and migrate in with every
 * transition unset). Read for migration, never written.
 */
export const LEGACY_STORE_KEY = 'japan2026-plan-v3';

/** The seeded variant's id and name. Deterministic, so SSR and reload agree. */
const MAIN_ID = 'main';
const MAIN_NAME = 'Main plan';

let idSeq = 0;
const freshId = (): string => `variant-${Date.now().toString(36)}-${idSeq++}`;

export const activeVariant = (store: PlanStore): PlanVariant =>
  store.variants.find((v) => v.id === store.activeId) ?? store.variants[0];

export const seedStore = (seed: TripDoc, proposals: PlanVariant[] = []): PlanStore => {
  // After MAKE MAIN PLAN, the demoted ex-main lands in the snapshot still
  // wearing the id `main` — the file's ids are never rewritten, which is what
  // keeps successive exports byte-stable — so the content-built main steps
  // aside rather than colliding with it.
  const taken = new Set(proposals.map((p) => p.id));
  let mainId = MAIN_ID;
  for (let n = 2; taken.has(mainId); n++) mainId = `${MAIN_ID}-${n}`;
  return {
    version: 1,
    activeId: mainId,
    variants: [{ id: mainId, name: MAIN_NAME, doc: seed }, ...proposals],
  };
};

/**
 * Replace one variant's document; the doc mutations stay doc-shaped. Every
 * schedule is editable in place on the compare view, so edits address a
 * variant by id — being active only decides what EXPORT writes and what the
 * PLAN view focuses on, not what may be edited.
 */
export function updateDoc(
  store: PlanStore,
  id: string,
  next: TripDoc | ((doc: TripDoc) => TripDoc)
): PlanStore {
  const target = store.variants.find((v) => v.id === id);
  if (!target) return store;
  const doc = typeof next === 'function' ? next(target.doc) : next;
  if (doc === target.doc) return store;
  return {
    ...store,
    variants: store.variants.map((v) => (v.id === id ? { ...v, doc } : v)),
  };
}

/** `updateDoc` aimed at the active variant — what RESET and migration use. */
export function updateActiveDoc(
  store: PlanStore,
  next: TripDoc | ((doc: TripDoc) => TripDoc)
): PlanStore {
  return updateDoc(store, activeVariant(store).id, next);
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
 * A new proposal is always a copy of the main plan — a blank one would just
 * be the fixed window with nothing to compare. The copy lands right after
 * its source and is immediately editable in place like every row, but it
 * does NOT become the main plan: EXPORT keeps writing what it wrote until
 * MAKE MAIN PLAN says otherwise. (It used to activate the copy, back when
 * editing required being active.)
 */
export function duplicateActive(store: PlanStore): { store: PlanStore; id: string } {
  const src = activeVariant(store);
  const id = freshId();
  const copy: PlanVariant = { id, name: nextName(store), doc: structuredClone(src.doc) };
  const variants = store.variants.slice();
  variants.splice(variants.findIndex((v) => v.id === src.id) + 1, 0, copy);
  return { store: { ...store, variants }, id };
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
 * Exported because the committed proposals snapshot is held to the same bar
 * at build time (seedProposals).
 */
export const isValidStoredDoc = (doc: TripDoc | undefined, seed: TripDoc): boolean =>
  doc?.version === 1 &&
  Array.isArray(doc.stops) &&
  doc.stops.length > 0 &&
  doc.window?.start === seed.window.start &&
  doc.window?.end === seed.window.end;

/**
 * Parse whatever localStorage holds into a PlanStore, or null to keep the
 * seed. Keys are tried newest first: the live v4 store, then the v3 store —
 * the SAME wrapper validation, since a v3 document differs only in lacking
 * the optional `travelHours` — then `rawLegacyDoc`, the v2 payload — a bare
 * TripDoc from before proposals existed — which migrates in as the single
 * main variant. A migrated store is rewritten under the live key by the
 * island's persistence effect.
 */
export function decodeStore(
  rawStore: string | null,
  rawLegacyStore: string | null,
  rawLegacyDoc: string | null,
  seed: TripDoc
): PlanStore | null {
  for (const raw of [rawStore, rawLegacyStore]) {
    try {
      if (!raw) continue;
      const saved = JSON.parse(raw) as PlanStore;
      if (
        saved?.version === 1 &&
        Array.isArray(saved.variants) &&
        saved.variants.length > 0 &&
        saved.variants.every(
          (v) =>
            typeof v?.id === 'string' &&
            typeof v?.name === 'string' &&
            isValidStoredDoc(v.doc, seed)
        )
      ) {
        const activeId = saved.variants.some((v) => v.id === saved.activeId)
          ? saved.activeId
          : saved.variants[0].id;
        return { version: 1, activeId, variants: saved.variants };
      }
    } catch {
      /* Corrupt store — fall through and try the next key down. */
    }
  }
  try {
    if (rawLegacyDoc) {
      const doc = JSON.parse(rawLegacyDoc) as TripDoc;
      if (isValidStoredDoc(doc, seed)) {
        return { version: 1, activeId: MAIN_ID, variants: [{ id: MAIN_ID, name: MAIN_NAME, doc }] };
      }
    }
  } catch {
    /* A corrupt legacy payload just means we keep the committed plan. */
  }
  return null;
}
