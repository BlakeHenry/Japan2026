/**
 * Reading and writing travel durations.
 *
 * The internal unit is DECIMAL HOURS, matching how legs' `hours` and a
 * segment's `travelHours` are authored in content. Everything here quantizes
 * to whole minutes and stores two-decimal hours (`Math.round(m / 60 * 100) /
 * 100`, ~36s resolution — always round-trips whole minutes), so a value never
 * carries float noise into the frontmatter it exports to: `String(2.25)` is
 * `2.25`, not `2.2500000000000004`.
 *
 * Display always goes through minutes, so `0.83` reads back as `50m`.
 */

import type { TravelTotal } from './doc';

/** "5h 30m", "5h", "45m" — the planner's one way to print a duration. */
export function formatHours(hours: number): string {
  const minutes = Math.round(hours * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * A human's duration, however they type it: "5:30", "5h 30m", "5h30", "2.5h",
 * "90m", or a bare number read as hours ("5.5"). Returns quantized decimal
 * hours in (0, 24], or null for anything unparseable — an empty string is the
 * caller's business (it means "clear"), and parses to null like any other
 * non-answer.
 */
export function parseHours(input: string): number | null {
  const v = input.trim().toLowerCase();
  let minutes: number | null = null;

  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,2}):([0-5]\d)$/.exec(v))) {
    minutes = +m[1] * 60 + +m[2];
  } else if ((m = /^(\d+(?:\.\d+)?)\s*h(?:rs?|ours?)?(?:\s*(\d{1,2})\s*m(?:ins?)?)?$/.exec(v))) {
    minutes = Math.round(+m[1] * 60) + (m[2] ? +m[2] : 0);
  } else if ((m = /^(\d+)\s*m(?:ins?)?$/.exec(v))) {
    minutes = +m[1];
  } else if (/^\d+(?:\.\d+)?$/.test(v)) {
    minutes = Math.round(+v * 60);
  }

  if (minutes === null || minutes < 1 || minutes > 24 * 60) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * The label under a schedule's name — "5h 15m", "3h +?" when a counted
 * transition has no estimate yet, bare "+?" when none of them do, and null
 * when the plan has no transition to count (a single stay can't have travel
 * between stops). One helper so PLAN and COMPARE say it the same way.
 */
export function formatTravelTotal(t: TravelTotal): string | null {
  if (!t.relevant) return null;
  if (t.hours === 0) return t.incomplete ? '+?' : formatHours(0);
  return t.incomplete ? `${formatHours(t.hours)} +?` : formatHours(t.hours);
}
