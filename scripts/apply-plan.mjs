#!/usr/bin/env node
/**
 * Apply an exported plan bundle back into src/content/.
 *
 * This is the second half of the edit loop: /overview/ downloads
 * japan2026-content.txt, and this puts it back on disk so the change can be
 * committed. Deliberately dumb — it writes exactly the files the bundle names
 * and deletes exactly the ones it marks deleted, then tells you to run the
 * build, which is where the frontmatter is actually validated.
 *
 *   pnpm plan:apply ~/Downloads/japan2026-content.txt
 *   pnpm plan:apply ~/Downloads/japan2026-content.txt --dry-run
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE_MARK = '===== FILE: ';
const DELETE_MARK = '===== DELETED: ';
const SUFFIX = ' =====';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bundlePath = args.find((a) => !a.startsWith('--'));

if (!bundlePath) {
  console.error('usage: pnpm plan:apply <bundle.txt> [--dry-run]');
  process.exit(1);
}

/**
 * Content markdown and nothing else. The planner used to be able to lengthen
 * the trip, which meant rewriting `src/lib/trip.ts`; the dates are fixed now,
 * so no bundle has any business naming a code file. Everything outside this is
 * refused — the bundle is a downloaded file, and a path like `../../.ssh/config`
 * in it must not escape the repo, however it got there.
 */
const WRITABLE = [/^src\/content\/[A-Za-z0-9._/-]+\.md$/];

function safeTarget(path) {
  if (path.includes('..') || !WRITABLE.some((re) => re.test(path))) {
    throw new Error(`refusing to touch "${path}" — not a writable plan path`);
  }
  return resolve(ROOT, path);
}

const raw = await readFile(bundlePath, 'utf8');
const lines = raw.split('\n');

const writes = [];
const deletes = [];
let current = null;

for (const line of lines) {
  if (line.startsWith(FILE_MARK) && line.endsWith(SUFFIX)) {
    current = { path: line.slice(FILE_MARK.length, -SUFFIX.length).trim(), body: [] };
    writes.push(current);
    continue;
  }
  if (line.startsWith(DELETE_MARK) && line.endsWith(SUFFIX)) {
    deletes.push(line.slice(DELETE_MARK.length, -SUFFIX.length).trim());
    current = null;
    continue;
  }
  if (current) current.body.push(line);
}

if (writes.length === 0 && deletes.length === 0) {
  console.error(`no file sections found in ${bundlePath} — is this a plan bundle?`);
  process.exit(1);
}

for (const w of writes) {
  // Each section is separated from the next by one blank line that the bundle
  // added; the file's own trailing newline goes back on.
  const target = safeTarget(w.path);
  const contents = `${w.body.join('\n').replace(/\n+$/, '')}\n`;
  if (dryRun) {
    console.log(`would write  ${w.path} (${contents.length} bytes)`);
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  console.log(`wrote   ${w.path}`);
}

for (const path of deletes) {
  const target = safeTarget(path);
  if (dryRun) {
    console.log(`would delete ${path}`);
    continue;
  }
  await rm(target, { force: true });
  console.log(`deleted ${path}`);
}

console.log(
  dryRun
    ? '\nDry run — nothing changed.'
    : '\nNow run `pnpm build` to validate the frontmatter, ' +
        'and `rm -rf .astro node_modules/.astro` first if any file was deleted or renamed.'
);
