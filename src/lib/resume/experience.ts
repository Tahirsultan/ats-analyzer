import type { ExperienceEntry, ResumeDate, ResumeSection } from "./types";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const PRESENT_TOKENS = /^(present|current|now|today|ongoing)$/i;

/**
 * Parse the experience section into discrete entries. An entry begins on
 * each non-bullet, non-empty line that follows a blank line or a previous
 * entry's bullets. Bullet lines (- or • or * prefixed) belong to the current
 * entry.
 */
export function parseExperienceSection(section: ResumeSection): ExperienceEntry[] {
  if (section.kind !== "experience") return [];

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of section.lines) {
    if (line.trim() === "") {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);

  // Within a block, the first 1-3 non-bullet lines describe the role; the
  // remaining bullet lines are responsibilities.
  const entries: ExperienceEntry[] = [];
  for (const block of blocks) {
    const headerLines: string[] = [];
    const bullets: string[] = [];
    let inBullets = false;
    for (const line of block) {
      const trimmed = line.trim();
      if (isBullet(trimmed)) {
        inBullets = true;
        bullets.push(stripBulletMarker(trimmed));
      } else if (!inBullets) {
        headerLines.push(trimmed);
      } else {
        // A non-bullet line after bullets: treat as continuation of last bullet
        const last = bullets[bullets.length - 1];
        if (last !== undefined) {
          bullets[bullets.length - 1] = `${last} ${trimmed}`;
        } else {
          headerLines.push(trimmed);
        }
      }
    }
    if (headerLines.length === 0 && bullets.length === 0) continue;
    entries.push(buildEntry(headerLines, bullets));
  }
  return entries;
}

function isBullet(line: string): boolean {
  return /^[-•*·●○◦▪▫]\s+/.test(line);
}

function stripBulletMarker(line: string): string {
  return line.replace(/^[-•*·●○◦▪▫]\s+/, "");
}

function buildEntry(headerLines: string[], bullets: string[]): ExperienceEntry {
  const rawHeader = headerLines.join(" | ");
  const entry: ExperienceEntry = {
    rawHeader,
    bullets,
    current: false,
  };
  if (headerLines.length === 0) return entry;

  // Common formats observed:
  //   "Title — Company"
  //   "Title at Company"
  //   "Company"
  //   then on next line "Location | Date – Date"
  //   or "Location · Date - Date"
  const titleLine = headerLines[0];
  if (titleLine !== undefined) {
    const split = splitTitleCompany(titleLine);
    if (split) {
      entry.title = split.title;
      entry.company = split.company;
    } else {
      // Fallback: assume the line is just a company or just a title.
      entry.title = titleLine;
    }
  }

  // Look for date range and location across the remaining header lines.
  for (let i = 1; i < headerLines.length; i++) {
    const line = headerLines[i];
    if (line === undefined) continue;
    const dateRange = parseDateRange(line);
    if (dateRange) {
      entry.startDate = dateRange.start;
      entry.endDate = dateRange.end;
      entry.current = dateRange.current;
    }
    const loc = parseLocation(line);
    if (loc) entry.location = loc;
  }

  // If no date range found in line 2+, scan the title line itself.
  if (!entry.startDate && titleLine) {
    const dateRange = parseDateRange(titleLine);
    if (dateRange) {
      entry.startDate = dateRange.start;
      entry.endDate = dateRange.end;
      entry.current = dateRange.current;
    }
  }

  return entry;
}

function splitTitleCompany(line: string): { title: string; company: string } | null {
  // Accept em dash, en dash, hyphen surrounded by spaces, or " at ".
  const dashMatch = line.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dashMatch) {
    const title = dashMatch[1];
    const company = dashMatch[2];
    if (title && company) return { title: title.trim(), company: company.trim() };
  }
  const atMatch = line.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    const title = atMatch[1];
    const company = atMatch[2];
    if (title && company) return { title: title.trim(), company: company.trim() };
  }
  return null;
}

interface DateRangeResult {
  start: ResumeDate;
  end: ResumeDate;
  current: boolean;
}

/**
 * Parse a line containing something like "Jan 2020 – Present", "2018 - 2020",
 * "March 2019 to August 2021". Returns null if no recognizable range.
 */
export function parseDateRange(line: string): DateRangeResult | null {
  // Normalize unicode dashes to a plain hyphen for the split, but record the
  // original so we don't double-handle.
  const normalized = line.replace(/[–—]/g, "-");
  // Split on " - " or " to ".
  const splitMatch = normalized.match(/^(.*?)(?:\s+-\s+|\s+to\s+)(.*)$/i);
  if (!splitMatch) return null;
  const leftRaw = splitMatch[1];
  const rightRaw = splitMatch[2];
  if (leftRaw === undefined || rightRaw === undefined) return null;
  const left = leftRaw.trim();
  const right = rightRaw.trim();
  const start = parseSingleDate(left);
  if (!start) return null;
  const isCurrent = PRESENT_TOKENS.test(right);
  let end: ResumeDate;
  if (isCurrent) {
    const now = new Date();
    end = { year: now.getFullYear(), month: now.getMonth() + 1 };
  } else {
    const parsed = parseSingleDate(right);
    if (!parsed) return null;
    end = parsed;
  }
  return { start, end, current: isCurrent };
}

function parseSingleDate(raw: string): ResumeDate | null {
  // Look for "Month Year" first.
  const monthYear = raw.match(/(?:^|\s)([A-Za-z]+)\s+(\d{4})(?:\s|$)/);
  if (monthYear) {
    const monthName = monthYear[1];
    const yearStr = monthYear[2];
    if (monthName && yearStr) {
      const month = MONTHS[monthName.toLowerCase()];
      const year = parseInt(yearStr, 10);
      if (month && Number.isFinite(year)) {
        return { year, month };
      }
    }
  }
  // Fall back to a bare 4-digit year.
  const yearOnly = raw.match(/(?:^|\s)(\d{4})(?:\s|$)/);
  if (yearOnly && yearOnly[1]) {
    const year = parseInt(yearOnly[1], 10);
    if (year >= 1900 && year <= 2100) return { year };
  }
  return null;
}

function parseLocation(line: string): string | null {
  // Strip pipe/bullet-separated tokens; return any segment that looks like
  // "City, ST" or "City, Country" or "Remote".
  const tokens = line.split(/\s*[|·•]\s*/);
  for (const token of tokens) {
    const t = token.trim();
    if (/^Remote$/i.test(t)) return "Remote";
    if (/^[A-Z][a-zA-Z .'-]+,\s*[A-Z]{2,}$/.test(t)) return t;
    if (/^[A-Z][a-zA-Z .'-]+,\s*[A-Z][a-zA-Z]+$/.test(t)) return t;
  }
  return null;
}
