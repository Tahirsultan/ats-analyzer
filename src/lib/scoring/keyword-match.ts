import type { JdKeyword, KeywordMatchResult, MatchedKeyword } from "./types";
import { aggressiveStem, lemmatizeTokens } from "./lemmatize";

const SNIPPET_LEN = 60;

/**
 * Compute the keyword match score, recording for every matched keyword
 * the resume bullet/sentence in which it was first found. The first-match
 * snippet (truncated to SNIPPET_LEN chars) lets the report UI surface a
 * "found in" excerpt so users can verify the match.
 *
 * Matching is done against the lemmatized + aggressively-stemmed token
 * stream so verb tense and plurals collapse. Each keyword's `aliases`
 * (e.g. an acronym for a longer phrase) are checked in addition to its
 * canonical surface — either form counts as a hit on the same entry.
 */
export function computeKeywordMatch(
  resumeText: string,
  keywords: JdKeyword[],
): KeywordMatchResult {
  const units = splitIntoUnits(resumeText);
  // Pre-stem each unit's token stream once so we don't re-tokenize per
  // keyword. unitStems[i] holds the aggressively-stemmed tokens of unit i.
  const unitStems = units.map((u) => lemmatizeTokens(u).map(aggressiveStem));

  const matched: MatchedKeyword[] = [];
  const missing: JdKeyword[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const kw of keywords) {
    totalWeight += kw.weight;
    const surfaces = [kw.surface, ...kw.aliases];
    let foundIn: string | null = null;
    for (const surface of surfaces) {
      const phraseStems = lemmatizeTokens(surface).map(aggressiveStem);
      if (phraseStems.length === 0) continue;
      for (let i = 0; i < unitStems.length; i++) {
        const stems = unitStems[i];
        if (!stems) continue;
        if (containsPhrase(stems, phraseStems)) {
          foundIn = truncate(units[i] ?? "", SNIPPET_LEN);
          break;
        }
      }
      if (foundIn) break;
    }
    if (foundIn) {
      matched.push({ ...kw, foundIn });
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

/**
 * Split resume text into matchable units: bullet-style lines (starting
 * with -, •, *) and sentences within paragraphs. Anything shorter than 8
 * characters is dropped — it can't carry a meaningful match-snippet.
 */
function splitIntoUnits(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^[-•*·●○◦▪▫]\s+/.test(line)) {
      const stripped = line.replace(/^[-•*·●○◦▪▫]\s+/, "").trim();
      if (stripped.length >= 8) out.push(stripped);
      continue;
    }
    // Split prose lines into sentences.
    for (const sentence of line.split(/(?<=[.?!])\s+/)) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 8) out.push(trimmed);
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
