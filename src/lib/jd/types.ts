export type JdSectionKind =
  | "intro"
  | "required"
  | "preferred"
  | "responsibilities"
  | "logistics"
  | "other";

export interface JdSection {
  kind: JdSectionKind;
  heading: string;
  lines: string[];
}

export type RequirementClassification = "must-have" | "nice-to-have";

export interface JdRequirement {
  /** Original text of the bullet/sentence. */
  text: string;
  classification: RequirementClassification;
  /** Section this requirement was extracted from. */
  sourceSection: JdSectionKind;
  /** Reason for classification (debugging / transparency). */
  reason: ClassificationReason;
}

export type ClassificationReason =
  | "section-required"
  | "section-preferred"
  | "marker-must"
  | "marker-nice"
  | "default-must"
  | "default-nice";

export interface JdAnalysis {
  sections: JdSection[];
  requirements: JdRequirement[];
}
