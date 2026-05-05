import type {
  ClassificationReason,
  JdRequirement,
  JdSection,
  RequirementClassification,
} from "./types";

const MUST_MARKERS = [
  /\bmust\s+have\b/i,
  /\bmust\b/i,
  /\brequired\b/i,
  /\brequire(s|d|ment)\b/i,
  /\bessential\b/i,
  /\bminimum\b/i,
  /\bmandatory\b/i,
  /\bproven\b/i,
  /\bdemonstrated\b/i,
  /\b\d+\+?\s*(years?|yrs)\b/i,
];

const NICE_MARKERS = [
  /\bpreferred\b/i,
  /\bnice\s+to\s+have\b/i,
  /\bbonus\b/i,
  /\bplus\b/i,
  /\bideal(ly)?\b/i,
  /\bdesired\b/i,
  /\ba\s+plus\b/i,
  /\bwould\s+be\s+(great|ideal|nice)\b/i,
  /\bgood\s+to\s+have\b/i,
  /\bfamiliar(ity)?\b/i,
  /\bexposure\b/i,
];

const BULLET_RE = /^[-•*·●○◦▪▫]\s+/;

/**
 * Classify a single line into must/nice based on its surrounding section and
 * any local linguistic markers. Local markers override the section default —
 * e.g. a "must have X" bullet inside the Preferred section is still must-have.
 */
export function classifyRequirement(
  text: string,
  section: JdSection,
): { classification: RequirementClassification; reason: ClassificationReason } {
  const localNice = NICE_MARKERS.some((re) => re.test(text));
  const localMust = MUST_MARKERS.some((re) => re.test(text));

  if (localNice && !localMust) {
    return { classification: "nice-to-have", reason: "marker-nice" };
  }
  if (localMust && !localNice) {
    return { classification: "must-have", reason: "marker-must" };
  }
  if (localMust && localNice) {
    return section.kind === "preferred"
      ? { classification: "nice-to-have", reason: "marker-nice" }
      : { classification: "must-have", reason: "marker-must" };
  }
  if (section.kind === "required") {
    return { classification: "must-have", reason: "section-required" };
  }
  if (section.kind === "preferred") {
    return { classification: "nice-to-have", reason: "section-preferred" };
  }
  // Outside required/preferred sections: default to nice-to-have so we don't
  // over-weight responsibilities or marketing fluff.
  return { classification: "nice-to-have", reason: "default-nice" };
}

/**
 * Pull requirement-shaped lines out of a JD section. We accept:
 * - Bullet lines (the typical case)
 * - Standalone short sentences in required/preferred sections (some JDs are
 *   prose, not bullets)
 *
 * Multi-line bullets are joined into a single requirement.
 */
export function extractRequirementsFromSection(
  section: JdSection,
): JdRequirement[] {
  if (
    section.kind !== "required" &&
    section.kind !== "preferred" &&
    section.kind !== "responsibilities"
  ) {
    return [];
  }
  if (section.kind === "responsibilities") {
    // Responsibilities aren't requirements; we extract them into a separate
    // bucket later if needed. For now, skip.
    return [];
  }

  const out: JdRequirement[] = [];
  const groups = groupBulletsAndSentences(section.lines);
  for (const text of groups) {
    const { classification, reason } = classifyRequirement(text, section);
    out.push({
      text,
      classification,
      sourceSection: section.kind,
      reason,
    });
  }
  return out;
}

/**
 * Walk the lines of a section and group them: each bullet line starts a new
 * group; non-bullet lines after a bullet are continuations; non-bullet lines
 * not preceded by a bullet are treated as their own sentence-group iff they
 * contain a verb-like cue.
 */
function groupBulletsAndSentences(lines: string[]): string[] {
  const groups: string[] = [];
  let current: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current !== null) {
        groups.push(current);
        current = null;
      }
      continue;
    }
    if (BULLET_RE.test(trimmed)) {
      if (current !== null) groups.push(current);
      current = trimmed.replace(BULLET_RE, "");
    } else if (current !== null) {
      current += " " + trimmed;
    } else {
      // Standalone non-bullet line in a required/preferred section: treat
      // each sentence as its own requirement.
      const sentences = trimmed.split(/(?<=[.?!])\s+/);
      for (const s of sentences) {
        const cleaned = s.trim();
        if (cleaned.length > 4) groups.push(cleaned);
      }
    }
  }
  if (current !== null) groups.push(current);
  return groups;
}
