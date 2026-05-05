import type { RequirementClassification } from "@/lib/jd/types";

export interface JdKeyword {
  /** The display form (mostly preserves original casing for acronyms). */
  surface: string;
  /** Lemmatized form used for matching. */
  lemma: string;
  /** must-have keywords get 3x weight; nice-to-have get 1x. */
  classification: RequirementClassification;
  /** Times this keyword appears across the JD. */
  frequency: number;
  /** Computed weight = base (3 or 1) * (1 + log frequency). */
  weight: number;
}

export interface KeywordMatchResult {
  /** Score 0-100. */
  score: number;
  matched: JdKeyword[];
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
