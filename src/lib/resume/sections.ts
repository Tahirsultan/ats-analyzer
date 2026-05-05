import type { ResumeSection, ResumeSectionKind } from "./types";

/**
 * Maps lowercased heading text to a canonical section kind. Order matters —
 * we check from most specific to least when there are overlaps.
 */
const HEADING_PATTERNS: Array<[ResumeSectionKind, RegExp]> = [
  ["summary", /^(professional\s+)?(summary|profile|objective|about\s+me)$/i],
  ["experience", /^(work|professional|relevant|employment)\s+(experience|history)$|^(experience|employment|positions?|career)$/i],
  ["skills", /^(technical\s+|core\s+|key\s+)?(skills|technologies|tools|stack|competenc(ies|y))$/i],
  ["education", /^(education(al\s+background)?|academics?|qualifications?)$/i],
  ["projects", /^(projects?|side\s+projects?|portfolio|selected\s+projects?)$/i],
  ["certifications", /^(certifications?|licenses?|certificates?)$/i],
  ["awards", /^(awards?|honors?|achievements?|recognitions?)$/i],
  ["publications", /^(publications?|papers?|talks?)$/i],
];

/**
 * Split a resume's plain text into sections. The first block (everything
 * before the first recognized heading) is always a `header` section
 * containing name + contact info.
 *
 * Headings are detected when a single line matches one of `HEADING_PATTERNS`
 * after normalization. Lines like `## Experience`, `EXPERIENCE`, and
 * `Experience` all work.
 */
export function splitResumeIntoSections(text: string): ResumeSection[] {
  const lines = text.split("\n");
  const sections: ResumeSection[] = [];
  let current: ResumeSection = {
    kind: "header",
    heading: "",
    lines: [],
    startOffset: 0,
  };
  let offset = 0;

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();
    const headingKind = detectHeadingKind(trimmed);

    if (headingKind && (current.lines.length > 0 || current.kind !== "header")) {
      sections.push(current);
      current = {
        kind: headingKind,
        heading: trimmed,
        lines: [],
        startOffset: offset,
      };
    } else if (headingKind && current.kind === "header" && current.lines.length === 0) {
      // First line of the doc was already a heading — keep an empty header
      // block and start the real section.
      sections.push(current);
      current = {
        kind: headingKind,
        heading: trimmed,
        lines: [],
        startOffset: offset,
      };
    } else {
      current.lines.push(line);
    }
    offset += line.length + 1;
  }
  sections.push(current);

  // Trim leading/trailing empty lines from each section's body.
  for (const section of sections) {
    while (section.lines.length && section.lines[0]?.trim() === "") {
      section.lines.shift();
    }
    while (
      section.lines.length &&
      section.lines[section.lines.length - 1]?.trim() === ""
    ) {
      section.lines.pop();
    }
  }

  return sections;
}

/**
 * Treat a line as a heading if it's short, mostly word characters, and
 * matches one of the canonical headings after stripping markdown markers.
 */
export function detectHeadingKind(line: string): ResumeSectionKind | null {
  if (!line) return null;
  if (line.length > 60) return null;
  // Strip markdown header markers and leading/trailing punctuation.
  const stripped = line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[*_]+|[*_]+$/g, "")
    .replace(/[:.]+$/g, "")
    .trim();
  for (const [kind, pattern] of HEADING_PATTERNS) {
    if (pattern.test(stripped)) return kind;
  }
  return null;
}
