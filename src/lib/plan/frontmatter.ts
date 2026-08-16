/**
 * Surgical edits to a markdown file's frontmatter block.
 *
 * Export rewrites content files, and the safe way to do that is to change the
 * few keys the editor owns and leave every other byte alone. Re-serializing
 * from parsed values would lose three things the repo actually has:
 *
 *   - unknown keys. `addedBy: Jameson` is on five stop files and isn't in the
 *     schema, so zod strips it — a re-emit would delete it silently.
 *   - comments and blank lines.
 *   - authored formatting (block vs flow sequences, quoting style).
 *
 * So this operates on TEXT. It only understands top-level keys, which is all
 * the editor ever touches: `city`, `start`, `end`, `name`,
 * `parent`, `date`, `title`, `category`. Nested structures (`lodging`,
 * `arrive`, `there`, `cities`) are never edited — only carried across, which
 * needs no parsing at all.
 *
 * Because a replacement that matches the existing text is spliced in verbatim,
 * setting a key to the value it already has is a byte-level no-op. That is
 * what makes the round-trip check in scripts/check-roundtrip.mjs meaningful:
 * an unedited plan must export byte-identical files.
 */

export interface SplitFile {
  frontmatter: string;
  body: string;
}

const FENCE = '---';
/** A top-level key: no indent, an identifier, a colon. */
const TOP_LEVEL_KEY = /^([A-Za-z_][A-Za-z0-9_-]*):/;

/**
 * Split `---\nfrontmatter\n---\nbody` into its two halves.
 * `joinMarkdown(splitMarkdown(raw)) === raw` for any file with frontmatter.
 */
export function splitMarkdown(raw: string): SplitFile {
  if (!raw.startsWith(`${FENCE}\n`)) {
    throw new Error('[plan] markdown file has no opening frontmatter fence');
  }
  const rest = raw.slice(FENCE.length + 1);
  const end = rest.search(/^---\n/m);
  if (end < 0) {
    throw new Error('[plan] markdown file has no closing frontmatter fence');
  }
  return {
    // Drop the newline that belongs to the closing fence, not to the content.
    frontmatter: rest.slice(0, end).replace(/\n$/, ''),
    body: rest.slice(end + FENCE.length + 1),
  };
}

export const joinMarkdown = (file: SplitFile): string =>
  `${FENCE}\n${file.frontmatter}\n${FENCE}\n${file.body}`;

/**
 * The line range a top-level key occupies — the key's own line plus every
 * indented or list continuation line under it.
 */
function extentOf(lines: string[], key: string): { from: number; to: number } | null {
  const from = lines.findIndex((l) => TOP_LEVEL_KEY.exec(l)?.[1] === key);
  if (from < 0) return null;
  let to = from + 1;
  while (to < lines.length && !TOP_LEVEL_KEY.test(lines[to])) to++;
  return { from, to };
}

/**
 * Set a top-level key to `value`, which is the whole replacement text without
 * the key (`setKey(fm, 'start', '2026-10-13')` writes `start: 2026-10-13`).
 * Appends the key when it isn't there, after `after` when that key exists.
 */
export function setKey(
  frontmatter: string,
  key: string,
  value: string,
  after?: string
): string {
  const lines = frontmatter.split('\n');
  const line = `${key}: ${value}`;
  const at = extentOf(lines, key);
  if (at) {
    lines.splice(at.from, at.to - at.from, line);
  } else {
    const anchor = after ? extentOf(lines, after) : null;
    lines.splice(anchor ? anchor.to : lines.length, 0, line);
  }
  return lines.join('\n');
}

export function removeKey(frontmatter: string, key: string): string {
  const lines = frontmatter.split('\n');
  const at = extentOf(lines, key);
  if (!at) return frontmatter;
  lines.splice(at.from, at.to - at.from);
  return lines.join('\n');
}

/**
 * Render a string as a YAML scalar, quoting only when it would otherwise be
 * ambiguous. Matches how the existing content is authored: `city: Tokyo` bare,
 * `cityJa: "東京"` quoted, times quoted so `15:00` isn't read as a number.
 */
export function yamlScalar(value: string): string {
  const safe =
    value.length > 0 &&
    value === value.trim() &&
    !/^[-?:,[\]{}#&*!|>'"%@`]/.test(value) &&
    !/:\s|\s#/.test(value) &&
    !/[:#]$/.test(value) &&
    !/^(true|false|null|yes|no|on|off|~)$/i.test(value) &&
    !/^[\d.+-]/.test(value);
  if (safe) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
