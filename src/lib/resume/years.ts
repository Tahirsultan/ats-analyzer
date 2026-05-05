import type { ExperienceEntry, ResumeDate } from "./types";

/**
 * Compute total years of professional experience across entries, merging
 * overlapping date ranges so concurrent jobs don't double-count.
 *
 * Algorithm:
 * 1. Convert each entry to a [startMonth, endMonth] integer range (months
 *    since epoch year 0).
 * 2. Sort by start. Merge overlapping or adjacent intervals.
 * 3. Sum lengths and divide by 12.
 *
 * Returns 0 if no dated entries exist.
 */
export function computeYearsOfExperience(entries: ExperienceEntry[]): number {
  const intervals: Array<[number, number]> = [];
  for (const entry of entries) {
    if (!entry.startDate || !entry.endDate) continue;
    const start = toMonthIndex(entry.startDate);
    const end = toMonthIndex(entry.endDate);
    if (end < start) continue;
    intervals.push([start, end]);
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval[0] <= last[1]) {
      last[1] = Math.max(last[1], interval[1]);
    } else {
      merged.push([interval[0], interval[1]]);
    }
  }

  let totalMonths = 0;
  for (const [start, end] of merged) totalMonths += end - start;
  return Math.round((totalMonths / 12) * 10) / 10;
}

function toMonthIndex(date: ResumeDate): number {
  const month = date.month ?? 6; // assume mid-year if month missing
  return date.year * 12 + (month - 1);
}
