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
 * byte-for-byte what is already committed. `scripts/check-roundtrip.mjs`
 * enforces exactly that.
 */

import { citySlug } from '../itinerary';
import type { PlanDayTrip, PlanIdea, PlanStop, SourceFile, TripDoc } from './doc';
import { dateAt, startOf } from './doc';
import { joinMarkdown, removeKey, setKey, yamlScalar } from './frontmatter';

/**
 * The trip window is a code constant, not content — it has to survive an
 * entirely empty itinerary — so lengthening the trip means rewriting the two
 * `Date.UTC(...)` calls in `src/lib/trip.ts`. Same philosophy as the
 * frontmatter surgery: touch those two calls, leave every other byte alone.
 * Month is 0-indexed there, hence the `- 1`.
 */
const TRIP_WINDOW = /(start|end):\s*new Date\(Date\.UTC\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)\)/g;

export function rewriteTripWindow(text: string, start: string, end: string): string {
  const by: Record<string, string> = { start, end };
  return text.replace(TRIP_WINDOW, (whole, key: string) => {
    const iso = by[key];
    if (!iso) return whole;
    const [y, m, d] = iso.split('-').map(Number);
    return `${key}: new Date(Date.UTC(${y}, ${m - 1}, ${d}))`;
  });
}

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

function stopFile(idea: PlanIdea, city: string): string {
  let fm =
    idea.source?.frontmatter ??
    ['title: PLACEHOLDER', 'city: PLACEHOLDER', 'category: sight'].join('\n');

  fm = setKey(fm, 'title', yamlScalar(idea.title));
  fm = setKey(fm, 'city', yamlScalar(city), 'title');
  fm = setKey(fm, 'category', idea.category, 'city');
  if (idea.link) fm = setKey(fm, 'link', idea.link, 'category');

  return joinMarkdown({
    frontmatter: fm,
    body: idea.source?.body ?? '\n',
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
  for (const i of allIdeas(doc)) if (i.source) seeded.add(i.source.path);

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
      if (stop.trips.length > 0 || stop.ideas.length > 0) {
        warnings.push(
          `"${stop.name}" is marked as travel, so it exports no segment — its ` +
            `${stop.trips.length} day trip(s) and ${stop.ideas.length} idea(s) ` +
            `will match no city. Move them, or make it a stay.`
        );
      }
      return;
    }

    const path = segmentPath(stop, takenNumbers);
    used.add(path);
    files.push({ path, contents: segmentFile(stop, doc, index) });

    // Only the first stay in a city claims its ideas and day trips — a return
    // stay renders empty on purpose, and the same is true of what it exports.
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
      for (const idea of trip.ideas) {
        // Keep the authored town for a combined outing: "Himeji + Kobe" claims
        // stops whose city is Himeji OR Kobe, so rewriting either would break it.
        const city = trip.matchKeys.includes(idea.city) ? idea.city : trip.matchKeys[0];
        emit(ideaPath(idea, used), stopFile(idea, city));
      }
    }

    const from = startOf(doc.stops, index);
    for (const idea of stop.ideas) {
      emit(ideaPath(idea, used), stopFile(idea, stop.name));
      if (idea.date) {
        const day = dayIndexOf(doc, idea.date);
        if (day === null || day < from || day >= from + stop.days) {
          warnings.push(
            `"${idea.title}" is booked for ${idea.date}, which is no longer ` +
              `inside ${stop.name} (${dateAt(doc, from)} – ` +
              `${dateAt(doc, from + stop.days - 1)}). Move the booking or the stay.`
          );
        }
      }
      if (!isFirstStay) {
        warnings.push(
          `"${idea.title}" sits on the return stay in ${stop.name}, but ideas ` +
            `attach to the first stay in a city — it will render there instead.`
        );
      }
    }
  });

  // Unassigned ideas keep whatever city they already name: they are unassigned
  // precisely because it matches nothing, and guessing a new one would hide it.
  for (const idea of doc.unassigned) {
    if (!idea.city) {
      warnings.push(`"${idea.title}" has no city and isn't on a stop — it exports nowhere.`);
      continue;
    }
    emit(ideaPath(idea, used), stopFile(idea, idea.city));
  }

  // The trip window, but only when it actually moved — an unchanged window
  // rewrites to the identical text and has no business in the bundle.
  if (doc.windowSource) {
    const rewritten = rewriteTripWindow(
      doc.windowSource.text,
      doc.window.start,
      doc.window.end
    );
    if (rewritten !== doc.windowSource.text) {
      used.add(doc.windowSource.path);
      files.push({ path: doc.windowSource.path, contents: rewritten });
      warnings.push(
        `The trip window changed, so this bundle rewrites ${doc.windowSource.path} ` +
          `— that's code, not content. Check the diff.`
      );
    }
  }

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
    for (const trip of stop.trips) {
      check(trip.source, `day trip "${trip.name}"`);
      for (const idea of trip.ideas) check(idea.source, `idea "${idea.title}"`);
    }
    for (const idea of stop.ideas) check(idea.source, `idea "${idea.title}"`);
  }
  for (const idea of doc.unassigned) check(idea.source, `unplaced idea "${idea.title}"`);

  // The window rewrite has to be a no-op at the committed dates too, or every
  // export would carry a spurious trip.ts whose only change is formatting.
  if (doc.windowSource) {
    const same = rewriteTripWindow(doc.windowSource.text, doc.window.start, doc.window.end);
    if (same !== doc.windowSource.text) {
      problems.push(
        `trip window — ${doc.windowSource.path} would be rewritten at its own dates:\n` +
          firstDiff(doc.windowSource.text, same)
      );
    }
  }

  return problems;
}

/** The first line that differs, so a failure names the key rather than the file. */
function firstDiff(before: string, after: string): string {
  const a = before.split('\n');
  const b = after.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `    line ${i + 1}\n    was: ${a[i] ?? '(end of file)'}\n    now: ${b[i] ?? '(end of file)'}`;
    }
  }
  return '    (files differ only in trailing whitespace)';
}

function ideaPath(idea: PlanIdea, used: Set<string>): string {
  return idea.source ? idea.source.path : uniquePath('stops', citySlug(idea.title), used);
}

function dayIndexOf(doc: TripDoc, iso: string): number | null {
  for (let d = 0; d < doc.stops.reduce((n, s) => n + s.days, 0); d++) {
    if (dateAt(doc, d) === iso) return d;
  }
  return null;
}

function* allIdeas(doc: TripDoc): Generator<PlanIdea> {
  yield* doc.unassigned;
  for (const s of doc.stops) {
    yield* s.ideas;
    for (const t of s.trips) yield* t.ideas;
  }
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
