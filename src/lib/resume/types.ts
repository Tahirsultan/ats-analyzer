import type { ParsedDocument } from "@/lib/parsing/types";

export type ResumeSectionKind =
  | "header"
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "projects"
  | "certifications"
  | "awards"
  | "publications"
  | "other";

export interface ResumeSection {
  kind: ResumeSectionKind;
  /** Section heading as it appeared in the document, or empty for the header block. */
  heading: string;
  /** Lines belonging to this section, with leading bullet markers preserved. */
  lines: string[];
  /** Approximate character offset in the source text where this section starts. */
  startOffset: number;
}

export interface ExperienceEntry {
  /** First non-empty line of the entry — usually `Title — Company` or similar. */
  rawHeader: string;
  title?: string;
  company?: string;
  location?: string;
  startDate?: ResumeDate;
  endDate?: ResumeDate;
  /** True if endDate is "Present" / "Current" / similar. */
  current: boolean;
  bullets: string[];
}

export interface ResumeDate {
  /** Year, parsed if we could find one. */
  year: number;
  /** Month 1-12 if known, else undefined. */
  month?: number;
}

export interface ResumeStructure {
  document: ParsedDocument;
  sections: ResumeSection[];
  experience: ExperienceEntry[];
  yearsOfExperience: number;
  contactFieldsFound: ContactFields;
}

export interface ContactFields {
  email: boolean;
  phone: boolean;
  linkedin: boolean;
  location: boolean;
}
