import type { JdAnalysis } from "./types";
import { splitJdIntoSections } from "./sections";
import { extractRequirementsFromSection } from "./classifier";

/** End-to-end JD analysis: text in, sections + classified requirements out. */
export function analyzeJobDescription(text: string): JdAnalysis {
  const sections = splitJdIntoSections(text);
  const requirements = sections.flatMap(extractRequirementsFromSection);
  return { sections, requirements };
}
