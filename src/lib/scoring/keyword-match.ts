import type { JdKeyword, KeywordMatchResult, MatchedKeyword } from "./types";
import { aggressiveStem, lemmatizeTokens } from "./lemmatize";

const SNIPPET_LEN = 60;

export interface MatchOptions {
  /**
   * Resume's parsed years of experience. Required for keywords whose
   * surface is a years-of-experience pattern ("5+ years"); when present,
   * those keywords match iff `resumeYearsOfExperience >= minYearsOfExperience`.
   * If undefined, YOE keywords fall back to literal-text matching (which
   * almost never works because resumes don't write "5+ years").
   */
  resumeYearsOfExperience?: number;
}

/**
 * Compute the keyword match score, recording for every matched keyword
 * the resume bullet/sentence in which it was first found.
 *
 * Matching strategy per keyword (in priority order):
 *   1. `minYearsOfExperience` set → numeric YOE comparison
 *   2. `matchPattern` set → regex search across resume units (degree
 *      equivalence)
 *   3. literal aliases + canonical surface against the lemmatized +
 *      aggressively-stemmed token stream (default behavior)
 */
export function computeKeywordMatch(
  resumeText: string,
  keywords: JdKeyword[],
  options: MatchOptions = {},
): KeywordMatchResult {
  const units = splitIntoUnits(resumeText);
  const unitStems = units.map((u) => lemmatizeTokens(u).map(aggressiveStem));

  const matched: MatchedKeyword[] = [];
  const missing: JdKeyword[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const kw of keywords) {
    totalWeight += kw.weight;
    const match = findMatch(kw, units, unitStems, options);
    if (match) {
      matched.push({ ...kw, foundIn: match });
      matchedWeight += kw.weight;
    } else {
      missing.push(kw);
    }
  }

  const score =
    totalWeight === 0 ? 100 : Math.round((matchedWeight / totalWeight) * 100);
  return {
    score,
    matched,
    missing,
    totalWeight: Math.round(totalWeight * 100) / 100,
    matchedWeight: Math.round(matchedWeight * 100) / 100,
  };
}

/** Return the foundIn snippet if this keyword matches; null otherwise. */
function findMatch(
  kw: JdKeyword,
  units: string[],
  unitStems: string[][],
  options: MatchOptions,
): string | null {
  // 1. YOE numeric matcher.
  if (kw.minYearsOfExperience !== undefined) {
    const resumeYoe = options.resumeYearsOfExperience;
    if (resumeYoe === undefined) return null;
    if (resumeYoe < kw.minYearsOfExperience) return null;
    const yoeSnippet = findYoeSnippet(units);
    return yoeSnippet ?? `Resume parses to ${resumeYoe} years of experience`;
  }

  // 2. Custom regex (degree equivalence).
  if (kw.matchPattern) {
    for (const unit of units) {
      if (kw.matchPattern.test(unit)) {
        return truncate(unit, SNIPPET_LEN);
      }
    }
    return null;
  }

  // 3. Literal phrase / alias match against stemmed token stream.
  const surfaces = [kw.surface, ...kw.aliases];
  for (const surface of surfaces) {
    const phraseStems = lemmatizeTokens(surface).map(aggressiveStem);
    if (phraseStems.length === 0) continue;
    for (let i = 0; i < unitStems.length; i++) {
      const stems = unitStems[i];
      if (!stems) continue;
      if (containsPhrase(stems, phraseStems)) {
        return truncate(units[i] ?? "", SNIPPET_LEN);
      }
    }
  }
  return null;
}

function findYoeSnippet(units: string[]): string | null {
  const yoeRe = /\b\d{1,2}\+?\s*(?:years?|yrs?)\b/i;
  for (const unit of units) {
    if (yoeRe.test(unit)) return truncate(unit, SNIPPET_LEN);
  }
  return null;
}

/**
 * Split resume text into matchable units: bullet-style lines and
 * sentences within paragraphs. Anything shorter than 8 characters is
 * dropped — it can't carry a meaningful match-snippet.
 */
function splitIntoUnits(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^[-•*·●○◦▪▫]\s+/.test(line)) {
      const stripped = line.replace(/^[-•*·●○◦▪▫]\s+/, "").trim();
      if (stripped.length >= 4) out.push(stripped);
      continue;
    }
    // Sentence split that doesn't fire on abbreviation periods like
    // "B.A." or "Ph.D.": only split when the period is preceded by a
    // lowercase letter (real sentence ending) or a digit, not when
    // it's part of a single-letter abbreviation.
    for (const sentence of line.split(/(?<=[a-z\d][.?!])\s+/)) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 4) out.push(trimmed);
    }
  }
  return out;
}

function containsPhrase(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  if (needle.length === 1) {
    return haystack.includes(needle[0]!);
  }
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
