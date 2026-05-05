import type { ParsedDocument } from "@/lib/parsing/types";
import type { ContactFields } from "./types";

export interface ParseabilityIssue {
  code: ParseabilityCode;
  severity: "high" | "medium" | "low";
  /** Penalty deducted from a 100-point starting score. */
  penalty: number;
  message: string;
}

export type ParseabilityCode =
  | "image-based-text"
  | "multi-column-layout"
  | "repeated-header-footer"
  | "missing-contact-email"
  | "missing-contact-phone"
  | "missing-contact-location"
  | "no-recognized-sections"
  | "no-experience-section";

const PENALTY_BY_CODE: Record<ParseabilityCode, number> = {
  "image-based-text": 60,
  "multi-column-layout": 25,
  "repeated-header-footer": 10,
  "missing-contact-email": 15,
  "missing-contact-phone": 5,
  "missing-contact-location": 5,
  "no-recognized-sections": 30,
  "no-experience-section": 20,
};

const SEVERITY_BY_CODE: Record<ParseabilityCode, "high" | "medium" | "low"> = {
  "image-based-text": "high",
  "multi-column-layout": "high",
  "repeated-header-footer": "medium",
  "missing-contact-email": "medium",
  "missing-contact-phone": "low",
  "missing-contact-location": "low",
  "no-recognized-sections": "high",
  "no-experience-section": "medium",
};

const MESSAGE_BY_CODE: Record<ParseabilityCode, string> = {
  "image-based-text":
    "PDF appears to be image-based or scanned. Most ATS parsers cannot read text from images. Re-export from your editor as a text-based PDF.",
  "multi-column-layout":
    "Multi-column layout detected. Many ATS parsers concatenate columns in unpredictable order; switch to a single-column layout.",
  "repeated-header-footer":
    "Critical text appears in headers or footers. Some ATS parsers ignore these regions; move contact info into the body of the document.",
  "missing-contact-email":
    "No email address detected. Add one near the top of the resume.",
  "missing-contact-phone":
    "No phone number detected. Many ATSes require a phone field.",
  "missing-contact-location":
    "No location (City, State or City, Country) detected. Recruiters filter by location.",
  "no-recognized-sections":
    "No standard sections (Experience, Skills, Education) detected. Use clear, conventional headings.",
  "no-experience-section":
    "No Experience or Employment section detected. Add one with consistent dated entries.",
};

export interface ParseabilityInput {
  document: ParsedDocument;
  contactFields: ContactFields;
  hasExperienceSection: boolean;
  hasAnyRecognizedSection: boolean;
}

/**
 * Compute the parseability score (0-100) and the issue list. The score is
 * deterministic: same input always produces the same output, and every point
 * deducted is traceable to a specific issue code.
 */
export function computeParseability(input: ParseabilityInput): {
  score: number;
  issues: ParseabilityIssue[];
} {
  const issues: ParseabilityIssue[] = [];
  const signals = input.document.signals;

  if (signals.imageBased) issues.push(makeIssue("image-based-text"));
  if (signals.multiColumn) issues.push(makeIssue("multi-column-layout"));
  if (
    signals.repeatedHeaderFooterText &&
    signals.repeatedHeaderFooterText.length > 0
  ) {
    issues.push(makeIssue("repeated-header-footer"));
  }
  if (!input.contactFields.email) issues.push(makeIssue("missing-contact-email"));
  if (!input.contactFields.phone) issues.push(makeIssue("missing-contact-phone"));
  if (!input.contactFields.location) {
    issues.push(makeIssue("missing-contact-location"));
  }
  if (!input.hasAnyRecognizedSection) {
    issues.push(makeIssue("no-recognized-sections"));
  }
  if (!input.hasExperienceSection) {
    issues.push(makeIssue("no-experience-section"));
  }

  const totalPenalty = issues.reduce((sum, issue) => sum + issue.penalty, 0);
  const score = Math.max(0, 100 - totalPenalty);
  return { score, issues };
}

function makeIssue(code: ParseabilityCode): ParseabilityIssue {
  return {
    code,
    severity: SEVERITY_BY_CODE[code],
    penalty: PENALTY_BY_CODE[code],
    message: MESSAGE_BY_CODE[code],
  };
}
