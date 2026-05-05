import type { ParsedDocument } from "@/lib/parsing/types";
import type { ResumeStructure } from "./types";
import { splitResumeIntoSections } from "./sections";
import { parseExperienceSection } from "./experience";
import { computeYearsOfExperience } from "./years";
import { detectContactFields } from "./contact";

/**
 * Top-level resume structural analysis. Pure function over a ParsedDocument:
 * given the same text in, returns the same structure out.
 */
export function analyzeResumeStructure(document: ParsedDocument): ResumeStructure {
  const sections = splitResumeIntoSections(document.text);
  const experience = sections
    .filter((s) => s.kind === "experience")
    .flatMap(parseExperienceSection);
  const yearsOfExperience = computeYearsOfExperience(experience);
  const contactFieldsFound = detectContactFields(document.text);
  return {
    document,
    sections,
    experience,
    yearsOfExperience,
    contactFieldsFound,
  };
}
