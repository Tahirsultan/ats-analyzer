import type { JdSection, JdSectionKind } from "./types";

/**
 * Heading patterns for the canonical JD section kinds. Order matters when
 * patterns overlap — required/preferred are checked before generic
 * "qualifications" because a JD may contain both.
 */
const HEADING_PATTERNS: Array<[JdSectionKind, RegExp]> = [
  ["required", /^(required( qualifications?)?|requirements?|must[- ]haves?|minimum( qualifications?)?|basic qualifications?|what (we|you) (need|require)|you (have|bring|need)|qualifications?( required)?)$/i],
  ["preferred", /^(preferred( qualifications?)?|nice[- ]to[- ]haves?|bonus( points?)?|pluses?|ideal candidate|extra credit|even better|good[- ]to[- ]haves?)$/i],
  ["responsibilities", /^(responsibilities|what you('|’)?ll do|the role|day[- ]to[- ]day|in this role|key responsibilities|duties)$/i],
  ["logistics", /^(location|logistics|benefits|compensation|salary|travel|work authorization|visa|sponsorship|education)$/i],
];

export function splitJdIntoSections(text: string): JdSection[] {
  const lines = text.split("\n");
  const sections: JdSection[] = [];
  let current: JdSection = {
    kind: "intro",
    heading: "",
    lines: [],
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingKind = detectJdHeading(trimmed);
    if (headingKind) {
      sections.push(current);
      current = {
        kind: headingKind,
        heading: trimmed,
        lines: [],
      };
    } else {
      current.lines.push(rawLine);
    }
  }
  sections.push(current);

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

export function detectJdHeading(line: string): JdSectionKind | null {
  if (!line) return null;
  if (line.length > 70) return null;
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
