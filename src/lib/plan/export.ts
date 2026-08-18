/**
 * Turn a TripDoc back into `src/content/`.
 *
 * The site is static on GitHub Pages, so there is nowhere to save to. This is
 * the other half of the loop: edit in the browser, download the bundle, commit
 * it here. The bundle is one delimited text file rather than a zip so it stays
 * readable and diffable before anyone applies it.
 *
 * The guiding rule is **change as few bytes as possible**. Every file is its
 * own original text with the handful of editor-owned keys re-set; a key whose
 * value hasn't changed splices in identically, so an unedited plan exports
 * byte-for-byte what is already committed. `roundTripDiff` below enforces
 * exactly that, and `seedDoc` runs it on every build.
 *
 * Only `src/content/**.md` is ever written. The trip window is fixed, so no
 * export touches code.
 *
 * The proposals ride along too: `exportStore` wraps `exportPlan` and adds one
 * machine-written snapshot file (`src/content/proposals.md`) carrying every
 * non-active variant, so committed proposals survive a fresh browser.
 */

import { citySlug } from '../itinerary';
import type { PlanDayTrip, PlanStop, SourceFile, TripDoc } from './doc';
import { dateAt, startOf } from './doc';
import { joinMarkdown, removeKey, setKey, yamlScalar } from './frontmatter';
import type { PlanStore, PlanVariant } from './variants';
import { activeVariant } from './variants';

export const FILE_MARK = '===== FILE: ';
export const DELETE_MARK = '===== DELETED: ';
export const BUNDLE_NAME = 'japan2026-content.txt';

export interface ExportedFile {
  path: string;
  contents: string;
}

export interface ExportResult {
  files: ExportedFile[];
  deleted: string[];
  /** Things a human should look at before committing. Never silently dropped. */
  warnings: string[];
  bundle: string;
}

// --- File naming -------------------------------------------------------------

const SEGMENT_NUMBER = /^src\/content\/segments\/(\d+)-/;

/**
 * `01-tokyo.md` — segments are numbered so the directory reads in trip order.
 *
 * A new stay takes the lowest number no existing file is using, which is the
 * gap left by whatever was removed last (`02-` today, where Kiso Valley used
 * to be) and usually lands it in the right place. The number has to be unique
 * across the DIRECTORY, not merely make a unique filename: two files both
 * numbered `01-` would still be a unique path each, and the ordering the
 * prefix exists for would be gone.
 *
 * Existing stays keep their filename, so nothing churns for a rename.
 */
function segmentPath(stop: PlanStop, taken: Set<number>): string {
  if (stop.source) return stop.source.path;
  const slug = citySlug(stop.name) || 'stop';
  for (let n = 1; n < 100; n++) {
    if (taken.has(n)) continue;
    taken.add(n);
    return `src/content/segments/${String(n).padStart(2, '0')}-${slug}.md`;
  }
  throw new Error('[plan] ran out of segment file numbers');
}

function uniquePath(dir: string, slug: string, used: Set<string>): string {
  const base = slug || 'untitled';
  let path = `src/content/${dir}/${base}.md`;
  for (let n = 2; used.has(path); n++) path = `src/content/${dir}/${base}-${n}.md`;
  return path;
}

// --- Emitters ----------------------------------------------------------------
// Dates are written bare (`start: 2026-10-13`) to match how they're authored;
// yamlScalar would quote them, since a leading digit is ambiguous in general.

function segmentFile(stop: PlanStop, doc: TripDoc, index: number): string {
  const from = startOf(doc.stops, index);
  const start = dateAt(doc, from);
  const end = dateAt(doc, from + stop.days - 1);

  let fm =
    stop.source?.frontmatter ??
    ['city: PLACEHOLDER', 'start: 0000-00-00', 'end: 0000-00-00'].join('\n');

  fm = setKey(fm, 'city', yamlScalar(stop.name));
  fm = setKey(fm, 'start', start, 'cityJa');
  fm = setKey(fm, 'end', end, 'start');
  // Bare like the dates, and `String(n)` exactly: the value is minute-
  // quantized two-decimal hours (see hours.ts), so this reproduces the
  // authored form (0.5, 2.5) byte for byte.
  fm =
    stop.travelHours === undefined
      ? removeKey(fm, 'travelHours')
      : setKey(fm, 'travelHours', String(stop.travelHours), 'end');

  return joinMarkdown({
    frontmatter: fm,
    body: stop.source?.body ?? `\nNothing written down for ${stop.name} yet.\n`,
  });
}

function dayTripFile(trip: PlanDayTrip, parent: PlanStop, doc: TripDoc, index: number): string {
  let fm =
    trip.source?.frontmatter ?? ['name: PLACEHOLDER', 'parent: PLACEHOLDER'].join('\n');

  fm = setKey(fm, 'name', yamlScalar(trip.name));
  fm = setKey(fm, 'parent', yamlScalar(parent.name), 'name');
  fm =
    trip.day === null
      ? removeKey(fm, 'date')
      : setKey(fm, 'date', dateAt(doc, startOf(doc.stops, index) + trip.day), 'parent');

  return joinMarkdown({
    frontmatter: fm,
    body: trip.source?.body ?? `\nNothing written down for ${trip.name} yet.\n`,
  });
}

// --- The bundle --------------------------------------------------------------

export function exportPlan(doc: TripDoc): ExportResult {
  const files: ExportedFile[] = [];
  const deleted: string[] = [];
  const warnings: string[] = [];
  const used = new Set<string>();

  const emit = (path: string, contents: string) => {
    if (used.has(path)) {
      warnings.push(`Two things both want to be ${path} — only the first was kept.`);
      return;
    }
    used.add(path);
    files.push({ path, contents });
  };

  // Every path currently on disk, so a node that stopped being a file can be
  // reported as a deletion rather than just going quiet.
  const seeded = new Set<string>();
  for (const s of doc.stops) {
    if (s.source) seeded.add(s.source.path);
    for (const t of s.trips) if (t.source) seeded.add(t.source.path);
  }

  // Existing segment filenames and their numbers are claimed first, so a new
  // stay can't be handed a name or a prefix an untouched file already owns.
  const takenNumbers = new Set<number>();
  for (const s of doc.stops) {
    if (s.kind !== 'stay' || !s.source) continue;
    used.add(s.source.path);
    const n = SEGMENT_NUMBER.exec(s.source.path);
    if (n) takenNumbers.add(Number(n[1]));
  }

  const firstStayOf = new Map<string, string>();
  for (const s of doc.stops) {
    if (s.kind === 'stay' && !firstStayOf.has(s.name)) firstStayOf.set(s.name, s.id);
  }

  doc.stops.forEach((stop, index) => {
    if (stop.kind === 'gap') {
      if (stop.source) deleted.push(stop.source.path);
      if (stop.trips.length > 0) {
        warnings.push(
          `"${stop.name}" is marked as travel, so it exports no segment — its ` +
            `${stop.trips.length} day trip(s) would name a parent city that ` +
            `doesn't exist. Move them, or make it a stay.`
        );
      }
      return;
    }

    const path = segmentPath(stop, takenNumbers);
    used.add(path);
    files.push({ path, contents: segmentFile(stop, doc, index) });

    // Only the first stay in a city claims its day trips — a return stay
    // renders none on purpose, and the same is true of what it exports.
    const isFirstStay = firstStayOf.get(stop.name) === stop.id;

    for (const trip of stop.trips) {
      const tripPath = trip.source
        ? trip.source.path
        : uniquePath('daytrips', citySlug(trip.name), used);
      emit(tripPath, dayTripFile(trip, stop, doc, index));
      if (!isFirstStay) {
        warnings.push(
          `Day trip "${trip.name}" hangs off the return stay in ${stop.name}, ` +
            `but only the first stay in a city claims day trips — it will ` +
            `render on the first ${stop.name} instead.`
        );
      }
    }
  });

  for (const path of seeded) {
    if (!used.has(path) && !deleted.includes(path)) deleted.push(path);
  }
  deleted.sort();
  files.sort((a, b) => a.path.localeCompare(b.path));

  return { files, deleted, warnings, bundle: renderBundle(files, deleted, warnings) };
}

/**
 * Does exporting this document reproduce the files it was built from?
 *
 * Run against the build-time seed, this is the invariant the whole export
 * rests on: a plan nobody has touched must come back out byte-identical. If it
 * doesn't, then some key is being re-emitted in a different form than it was
 * authored — and the same bug would be silently rewriting parts of files that
 * a real edit never went near.
 *
 * Returns one line per problem, empty when clean.
 */
export function roundTripDiff(doc: TripDoc): string[] {
  const { files } = exportPlan(doc);
  const emitted = new Map(files.map((f) => [f.path, f.contents]));
  const problems: string[] = [];

  const check = (source: SourceFile | undefined, label: string) => {
    if (!source) return;
    const out = emitted.get(source.path);
    if (out === undefined) {
      problems.push(`${label} — ${source.path} would not be written at all`);
    } else if (out !== joinMarkdown(source)) {
      problems.push(`${label} — ${source.path} would be rewritten:\n${firstDiff(joinMarkdown(source), out)}`);
    }
  };

  for (const stop of doc.stops) {
    check(stop.source, `stay "${stop.name}"`);
    for (const trip of stop.trips) check(trip.source, `day trip "${trip.name}"`);
  }

  return problems;
}

/** The first line that differs, so a failure names the key rather than the file. */
export function firstDiff(before: string, after: string): string {
  const a = before.split('\n');
  const b = after.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `    line ${i + 1}\n    was: ${a[i] ?? '(end of file)'}\n    now: ${b[i] ?? '(end of file)'}`;
    }
  }
  return '    (files differ only in trailing whitespace)';
}

// --- The proposals snapshot --------------------------------------------------
// One committed file for every schedule that ISN'T the main plan, so proposals
// survive export → commit → fresh browser. Machine-written only: a fixed
// header, then the variants as pretty-printed JSON. JSON escapes every newline
// in the docs' embedded markdown, so no line of this file can collide with the
// bundle's `===== FILE:` markers.

export const PROPOSALS_PATH = 'src/content/proposals.md';

// Brace-free on purpose: the parser finds the JSON at the first `{`.
const PROPOSALS_HEADER =
  [
    '# Japan 2026 — proposed schedules',
    '#',
    "# Machine-written by /overview/'s EXPORT: every schedule on the compare",
    '# view except the main plan, committed so a fresh browser seeds them back.',
    '# Do not edit by hand. Delete the file to drop every committed proposal.',
  ].join('\n') + '\n\n';

/**
 * The one serializer — the browser writes the snapshot with it, and
 * `seedProposals` asserts the committed file re-emits byte-identical.
 * Deterministic because `JSON.stringify ∘ JSON.parse` is idempotent on
 * `JSON.stringify` output; ids and names pass through verbatim so re-seeds
 * are stable.
 */
export function renderProposalsFile(proposals: PlanVariant[]): string {
  const payload = {
    version: 1,
    proposals: proposals.map(({ id, name, doc }) => ({ id, name, doc })),
  };
  return `${PROPOSALS_HEADER}${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Structural parse of a committed snapshot; throws naming what's wrong.
 * Whether each doc still fits the trip window is the caller's (seed's) check.
 */
export function parseProposalsFile(raw: string): { version: 1; proposals: PlanVariant[] } {
  const at = raw.indexOf('{');
  if (at === -1) throw new Error(`[plan] ${PROPOSALS_PATH} has no JSON payload`);
  let payload: { version?: unknown; proposals?: unknown };
  try {
    payload = JSON.parse(raw.slice(at));
  } catch (e) {
    throw new Error(`[plan] ${PROPOSALS_PATH} is not valid JSON: ${(e as Error).message}`);
  }
  if (payload?.version !== 1 || !Array.isArray(payload.proposals)) {
    throw new Error(`[plan] ${PROPOSALS_PATH} is not a version-1 proposals snapshot`);
  }
  for (const v of payload.proposals as PlanVariant[]) {
    if (typeof v?.id !== 'string' || typeof v?.name !== 'string' || typeof v?.doc !== 'object') {
      throw new Error(`[plan] ${PROPOSALS_PATH} has a malformed proposal entry`);
    }
  }
  return { version: 1, proposals: payload.proposals as PlanVariant[] };
}

/**
 * `exportPlan` on the active schedule, plus the proposals snapshot — or its
 * deletion, when the last proposal went and the committed file still exists
 * (`committedProposalsFile`, which seed answers at build time).
 */
export function exportStore(store: PlanStore, committedProposalsFile: boolean): ExportResult {
  const active = activeVariant(store);
  const plan = exportPlan(active.doc);
  const proposals = store.variants.filter((v) => v.id !== active.id);
  const files = plan.files.slice();
  const deleted = plan.deleted.slice();
  if (proposals.length > 0) {
    files.push({ path: PROPOSALS_PATH, contents: renderProposalsFile(proposals) });
    files.sort((a, b) => a.path.localeCompare(b.path));
  } else if (committedProposalsFile) {
    deleted.push(PROPOSALS_PATH);
    deleted.sort();
  }
  return {
    files,
    deleted,
    warnings: plan.warnings,
    bundle: renderBundle(files, deleted, plan.warnings),
  };
}

function renderBundle(
  files: ExportedFile[],
  deleted: string[],
  warnings: string[]
): string {
  const out: string[] = [
    '# Japan 2026 — exported plan',
    '#',
    '# Apply with: pnpm plan:apply <this file>',
    `# ${files.length} file(s), ${deleted.length} deletion(s).`,
  ];
  if (warnings.length > 0) {
    out.push('#', '# WARNINGS:');
    for (const w of warnings) out.push(`#   - ${w}`);
  }
  out.push('');
  for (const path of deleted) out.push(`${DELETE_MARK}${path} =====`, '');
  for (const f of files) {
    out.push(`${FILE_MARK}${f.path} =====`);
    // The contents end with their own newline; the blank separator is ours.
    out.push(f.contents.replace(/\n$/, ''), '');
  }
  return out.join('\n');
}
