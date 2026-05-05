import type { JdKeyword, KeywordMatchResult } from "./types";
import { lemmatizeTokens, phraseAppearsIn } from "./lemmatize";

/**
 * Compute the keyword match score for a resume given the JD's weighted
 * keyword list.
 *
 * Algorithm:
 * 1. Lemmatize the resume into a token stream.
 * 2. For each JD keyword, check whether its lemmatized phrase appears as a
 *    contiguous run in the resume tokens.
 * 3. Sum matched-weight / total-weight × 100.
 *
 * Because all matching is done against lemmas, "managing" and "manage" or
 * "queries" and "query" count as the same hit. Acronyms and tech tokens
 * (e.g. "PostgreSQL") survive lemmatization unchanged.
 */
export function computeKeywordMatch(
  resumeText: string,
  keywords: JdKeyword[],
): KeywordMatchResult {
  const resumeTokens = lemmatizeTokens(resumeText);
  const matched: JdKeyword[] = [];
  const missing: JdKeyword[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;

  for (const kw of keywords) {
    totalWeight += kw.weight;
    if (phraseAppearsIn(kw.surface, resumeTokens)) {
      matched.push(kw);
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
