/**
 * The plan document — the one serializable shape behind the editable
 * /overview/ timeline.
 *
 * It is three things at once, which is why it carries more than the screen
 * shows:
 *   1. the React island's state,
 *   2. the localStorage payload between visits,
 *   3. the source the EXPORT button regenerates `src/content/` from.
 *
 * (3) is the demanding one. Anything the editor can't see still has to survive
 * a round trip, so every node keeps the raw text of the file it came from (see
 * `SourceFile`) rather than a projection of it. Re-emitting frontmatter from
 * parsed values would quietly drop unknown keys — zod strips anything outside
 * the schema — along with comments and authored formatting. That is most of
 * what a segment or day-trip file holds: lodging, the arrive/depart legs, the
 * hero photo. None of it is drawn; all of it survives.
 *
 * Dates are `YYYY-MM-DD` strings everywhere, and day arithmetic goes through
 * `toDayNumber`/`fromDayNumber` so it stays in UTC. Never `new Date('2026-10-13')`
 * arithmetic in local time: it shifts the day for anyone west of Greenwich.
 */

export const DAY_MS = 86_400_000;

/**
 * The LEGACY localStorage key, from when the store was a single TripDoc. The
 * live key is `STORE_KEY` in variants.ts (the proposals wrapper); this
 * one is only read for migration, never written. The rule carries over: bump
 * the live key's suffix when TripDoc's shape — or the store's — changes, or a
 * stored document restores edits the current editor can't express.
 */
export const STORAGE_KEY = 'japan2026-plan-v2';

/** Days since the epoch, in UTC. The timeline's whole coordinate system. */
export function toDayNumber(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`[plan] expected a YYYY-MM-DD date, got "${iso}"`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS;
}

export function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The file a node was loaded from, kept verbatim so export can put back
 * everything the editor never touched.
 *
 * `frontmatter` is the text BETWEEN the `---` fences with no trailing newline;
 * `body` is everything after the closing fence, including its leading blank
 * line. Concatenating them with fences reproduces the file byte for byte.
 */
export interface SourceFile {
  /** Repo-relative, e.g. `src/content/segments/01-tokyo.md` */
  path: string;
  frontmatter: string;
  body: string;
}

/** A stop on the timeline: a stay somewhere, or an unassigned run of days. */
export interface PlanStop {
  id: string;
  /**
   * `gap` is a run of days no segment claims — the fly-out day, the fly-home
   * day, and the open Oct 17–18 window. They render as the hatched TRAVEL
   * bars and export to no file at all, which is exactly what "no segment"
   * means in the content model today.
   */
  kind: 'stay' | 'gap';
  source?: SourceFile;
  /** The city. Also what stops and day trips match on. */
  name: string;
  cityJa?: string;
  days: number;
  /**
   * Door-to-door hours to GET HERE from the previous stop — the in-Japan
   * transition the timeline draws as a pill at this stay's start boundary,
   * and what the per-schedule travel total sums. Decimal hours, quantized to
   * whole minutes (see hours.ts). Meaningless on the trip's first stay (that
   * arrival is the international flight, which stays on the undrawn `arrive`
   * legs) and on gaps: both are hidden and excluded from totals rather than
   * cleared, so a reorder can't silently destroy an estimate.
   */
  travelHours?: number;
  /** Golden-angle hue, so a new stop never collides with its neighbours. */
  hue: number;
  trips: PlanDayTrip[];
}

export interface PlanDayTrip {
  id: string;
  source?: SourceFile;
  name: string;
  /** Day index within the parent stop, or null for "no day picked yet". */
  day: number | null;
  /**
   * The `city` values this trip claims stops by — its `cities` when authored
   * (a combined outing like "Himeji + Kobe" spans two towns), else its name.
   * Carried, never edited: a rename has to leave an authored `cities` alone.
   */
  matchKeys: string[];
  /** True when `cities` was authored, so a rename must not overwrite it. */
  explicitCities: boolean;
}

export interface TripDoc {
  version: 1;
  /**
   * Hash of the build-time seed this document was branched from. When the
   * committed content moves on, a stored document's hash no longer matches
   * and the island can say so instead of silently masking the new plan.
   */
  baseHash: string;
  /**
   * Inclusive; stops tile it exactly. From TRIP.start / TRIP.end, and FIXED —
   * the dates of the trip are settled, so nothing here can move them. That is
   * why the window is code (`src/lib/trip.ts`) rather than content, and why
   * export never writes anything outside `src/content/`.
   */
  window: { start: string; end: string };
  baseHue: number;
  hueCount: number;
  stops: PlanStop[];
}

// --- Reading -----------------------------------------------------------------

export const windowDays = (doc: TripDoc): number =>
  toDayNumber(doc.window.end) - toDayNumber(doc.window.start) + 1;

export const totalDays = (stops: PlanStop[]): number =>
  stops.reduce((n, s) => n + s.days, 0);

/** First day index (0-based, trip-relative) of stop `i`. */
export function startOf(stops: PlanStop[], i: number): number {
  let n = 0;
  for (let k = 0; k < i; k++) n += stops[k].days;
  return n;
}

/** Which stop a trip-relative day falls in, and how far into it. */
export function stopAtDay(
  stops: PlanStop[],
  day: number
): { index: number; rel: number } | null {
  let n = 0;
  for (let i = 0; i < stops.length; i++) {
    if (day < n + stops[i].days) return { index: i, rel: day - n };
    n += stops[i].days;
  }
  return null;
}

/** The absolute date of a trip-relative day index. */
export const dateAt = (doc: TripDoc, day: number): string =>
  fromDayNumber(toDayNumber(doc.window.start) + day);

export interface TravelTotal {
  hours: number;
  /** True when a counted stay has no estimate — the sum is an undercount. */
  incomplete: boolean;
  /** False when no stay qualifies (≤1 stay), so callers draw nothing. */
  relevant: boolean;
}

/**
 * The schedule's total in-Japan travel: `travelHours` summed over every stay
 * EXCEPT the first, whose arrival is the long-haul flight — the same in every
 * proposal, so counting it would just pad each total by a constant.
 */
export function travelTotal(stops: PlanStop[]): TravelTotal {
  let hours = 0;
  let incomplete = false;
  let counted = 0;
  let seenStay = false;
  for (const s of stops) {
    if (s.kind !== 'stay') continue;
    if (!seenStay) {
      seenStay = true;
      continue;
    }
    counted++;
    if (s.travelHours === undefined) incomplete = true;
    else hours += s.travelHours;
  }
  return { hours, incomplete, relevant: counted > 0 };
}

export const nextHue = (doc: TripDoc): number =>
  (doc.baseHue + doc.hueCount * 137.508) % 360;

/**
 * A stable digest of the parts of a document that come from committed content.
 * Deliberately ignores hue and ids, which are presentational and generated —
 * a rebuild must not look like a content change.
 */
export function hashDoc(doc: Pick<TripDoc, 'window' | 'stops'>): string {
  const shape = JSON.stringify({
    w: doc.window,
    s: doc.stops.map((s) => [
      s.kind,
      s.name,
      s.cityJa ?? '',
      s.days,
      s.travelHours ?? null,
      s.trips.map((t) => [t.name, t.day]),
      s.source?.path ?? '',
    ]),
  });
  // FNV-1a. Not cryptographic — this only has to notice that content changed.
  let h = 0x811c9dc5;
  for (let i = 0; i < shape.length; i++) {
    h ^= shape.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// --- Writing -----------------------------------------------------------------
// Every mutation is pure and returns a new document, so the interaction layer
// stays a thin shell over testable operations and undo stays possible later.

const cloneStop = (s: PlanStop): PlanStop => ({
  ...s,
  trips: s.trips.map((t) => ({ ...t })),
});

const clone = (doc: TripDoc): TripDoc => ({
  ...doc,
  window: { ...doc.window },
  stops: doc.stops.map(cloneStop),
});

/**
 * Drop anything hanging off days this stop no longer has. Every operation that
 * shrinks a stop calls this — otherwise a day trip keeps a `day` past the end
 * of its parent and silently stops rendering.
 */
function clampToLength(stop: PlanStop): void {
  for (const t of stop.trips) {
    if (t.day !== null && t.day >= stop.days) t.day = stop.days - 1;
  }
}

let idSeq = 0;
const freshId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${idSeq++}`;

/** Move `delta` days across the boundary between stop `b` and stop `b + 1`. */
export function resize(doc: TripDoc, b: number, delta: number): TripDoc {
  const next = clone(doc);
  const a = next.stops[b];
  const c = next.stops[b + 1];
  if (!a || !c) return doc;
  // Neither side may vanish; a zero-day stop has no bar to grab.
  const d = Math.max(1 - a.days, Math.min(c.days - 1, delta));
  if (d === 0) return doc;
  a.days += d;
  c.days -= d;
  clampToLength(a);
  clampToLength(c);
  return next;
}

export function reorder(doc: TripDoc, order: PlanStop[]): TripDoc {
  return { ...doc, stops: order.map(cloneStop) };
}

/** Insert a new stay after stop `b`, taking a day from whichever neighbour can spare one. */
export function insertAt(doc: TripDoc, b: number): { doc: TripDoc; id: string } | null {
  const next = clone(doc);
  const above = next.stops[b];
  const below = next.stops[b + 1];
  const donor =
    below && below.days > 1 && below.days >= (above?.days ?? 0)
      ? below
      : above && above.days > 1
        ? above
        : below && below.days > 1
          ? below
          : null;
  if (!donor) return null;
  donor.days -= 1;
  clampToLength(donor);
  const id = freshId('stop');
  next.stops.splice(b + 1, 0, {
    id,
    kind: 'stay',
    name: 'New stop',
    days: 1,
    hue: nextHue(next),
    trips: [],
  });
  next.hueCount += 1;
  return { doc: next, id };
}

/** Remove a stop; its days and day trips go to the neighbour that absorbs it. */
export function deleteStop(doc: TripDoc, id: string): { doc: TripDoc; heirId: string } | null {
  if (doc.stops.length <= 1) return null;
  const next = clone(doc);
  const i = next.stops.findIndex((s) => s.id === id);
  if (i < 0) return null;
  const gone = next.stops[i];
  // Days go to the previous stop when there is one, otherwise to the next.
  const absorbsBackwards = i > 0;
  const heir = absorbsBackwards ? next.stops[i - 1] : next.stops[i + 1];

  // Day trips keep pointing at the same calendar day, which is a different
  // index once they hang off a longer stop. Absorbing backwards appends the
  // dead stop's days after the heir's, so its trips shift by the heir's old
  // length; absorbing forwards prepends them, so the HEIR's own trips shift
  // instead. Shift the heir's first, while `heir.trips` is still only its own.
  if (!absorbsBackwards) {
    for (const t of heir.trips) if (t.day !== null) t.day += gone.days;
  }
  const shift = absorbsBackwards ? heir.days : 0;
  for (const t of gone.trips) {
    heir.trips.push({ ...t, day: t.day === null ? null : shift + t.day });
  }

  heir.days += gone.days;
  next.stops.splice(i, 1);
  clampToLength(heir);
  return { doc: next, heirId: heir.id };
}

export function renameStop(doc: TripDoc, id: string, name: string): TripDoc {
  const v = name.trim();
  if (!v) return doc;
  const next = clone(doc);
  const s = next.stops.find((x) => x.id === id);
  if (!s) return doc;
  // Day trips name their base by city, so a rename re-parents every trip
  // hanging off this one — that happens at export, from `s.name`.
  s.name = v;
  return next;
}

/** Flip a stay to an unassigned run of days, or back. */
export function toggleKind(doc: TripDoc, id: string): TripDoc {
  const next = clone(doc);
  const s = next.stops.find((x) => x.id === id);
  if (!s) return doc;
  s.kind = s.kind === 'gap' ? 'stay' : 'gap';
  // Deliberately keeps `travelHours`: a stay flipped to travel and back keeps
  // its estimate, the same way it keeps its `source`. A gap just doesn't draw
  // or export it.
  return next;
}

/** Set or clear (null) the hours it takes to get to this stop. */
export function setTravelHours(doc: TripDoc, id: string, hours: number | null): TripDoc {
  const next = clone(doc);
  const s = next.stops.find((x) => x.id === id);
  if (!s) return doc;
  if (hours === null || !(hours > 0)) delete s.travelHours;
  else s.travelHours = Math.min(24, Math.round(hours * 100) / 100);
  return next;
}

export function addTrip(
  doc: TripDoc,
  stopId: string,
  day: number | null
): { doc: TripDoc; index: number } | null {
  const next = clone(doc);
  const s = next.stops.find((x) => x.id === stopId);
  if (!s) return null;
  s.trips.push({
    id: freshId('trip'),
    name: 'New day trip',
    day,
    matchKeys: ['New day trip'],
    explicitCities: false,
  });
  return { doc: next, index: s.trips.length - 1 };
}

/** Drop a day trip onto a trip-relative day, re-parenting it if it crossed a stop. */
export function moveTrip(
  doc: TripDoc,
  stopId: string,
  index: number,
  day: number
): { doc: TripDoc; stopId: string; index: number } | null {
  const next = clone(doc);
  const src = next.stops.find((x) => x.id === stopId);
  if (!src?.trips[index]) return null;
  const hit = stopAtDay(next.stops, Math.max(0, Math.min(totalDays(next.stops) - 1, day)));
  if (!hit) return null;
  const [trip] = src.trips.splice(index, 1);
  const dst = next.stops[hit.index];
  trip.day = hit.rel;
  dst.trips.push(trip);
  return { doc: next, stopId: dst.id, index: dst.trips.length - 1 };
}

export function deleteTrip(doc: TripDoc, stopId: string, index: number): TripDoc {
  const next = clone(doc);
  const s = next.stops.find((x) => x.id === stopId);
  if (!s?.trips[index]) return doc;
  s.trips.splice(index, 1);
  return next;
}

export function renameTrip(doc: TripDoc, stopId: string, index: number, name: string): TripDoc {
  const v = name.trim();
  if (!v) return doc;
  const next = clone(doc);
  const s = next.stops.find((x) => x.id === stopId);
  if (!s?.trips[index]) return doc;
  const trip = s.trips[index];
  trip.name = v;
  // A trip that never authored `cities` claims stops by its name, so the
  // matching keys have to follow the rename. One that did keeps them.
  if (!trip.explicitCities) trip.matchKeys = [v];
  return next;
}
