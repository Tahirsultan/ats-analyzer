import type { RequirementClassification, JdSectionKind } from "@/lib/jd/types";

/**
 * Tier is the user-facing label shown in the keyword tables. Derived from
 * `sourceSection` + `classification`:
 *   required        → "must-have"
 *   preferred       → "nice-to-have"
 *   responsibilities → "body"
 *   intro/logistics → "body"
 * Only "must-have" and the others differ in weight (3× vs 1×); body and
 * nice-to-have share the 1× multiplier but are surfaced with different
 * tier labels in the UI.
 */
export type KeywordTier = "must-have" | "nice-to-have" | "body";

export interface JdKeyword {
  /** Canonical display form (preserves casing for acronyms / proper nouns). */
  surface: string;
  /** Lemmatized form used for matching. */
  lemma: string;
  /**
   * Alternative surface forms that should match the same canonical entry.
   * Populated for "phrase (ACRONYM)" patterns: surface = "account-based
   * marketing", aliases = ["ABM"]. Both forms count as a hit on this entry.
   */
  aliases: string[];
  /** must-have keywords get 3× weight; nice-to-have / body get 1×. */
  classification: RequirementClassification;
  /** UI-facing tier label. */
  tier: KeywordTier;
  /** Internal section the keyword was extracted from. */
  sourceSection: JdSectionKind;
  /** Times this keyword appears across the JD. */
  frequency: number;
  /** Computed weight = base (3 or 1) × (1 + log frequency). */
  weight: number;
  /**
   * Optional regex used in place of literal-phrase matching. Set for
   * degree-equivalence keywords so "Bachelor's degree" in the JD matches
   * "Bachelor of Arts in Marketing" / "B.A." / "BS" / etc. in the resume.
   */
  matchPattern?: RegExp;
  /**
   * Optional minimum years-of-experience. When set, the keyword matches
   * iff the resume's parsed YOE is ≥ this value — never via literal text
   * match, since real resumes write "6 years of experience", not "5+ years".
   */
  minYearsOfExperience?: number;
}

export interface MatchedKeyword extends JdKeyword {
  /**
   * Truncated snippet of the resume bullet/sentence where the keyword was
   * first matched, with an ellipsis if longer than `KEYWORD_SNIPPET_LEN`.
   * Lets the report UI surface a "found in" excerpt for verifying matches.
   */
  foundIn: string;
}

export interface KeywordMatchResult {
  /** Score 0-100. */
  score: number;
  matched: MatchedKeyword[];
  missing: JdKeyword[];
  totalWeight: number;
  matchedWeight: number;
}

export type HardRequirementCode =
  | "years-of-experience"
  | "degree-level"
  | "degree-field"
  | "certification"
  | "work-authorization"
  | "travel";

export interface HardRequirement {
  code: HardRequirementCode;
  /** What we extracted from the JD as the requirement. */
  description: string;
  /** Whether the resume satisfies it. */
  passed: boolean;
  /** Free-text explanation: "Resume shows 7y vs 5+y required" / "No PhD found". */
  detail: string;
}

export interface HardRequirementsResult {
  /** Score 0-100. */
  score: number;
  requirements: HardRequirement[];
}
