import type { ResumeStructure } from "./types";

export interface ResumeBullet {
  text: string;
  /** Where this bullet came from — useful for surfacing matches in the UI. */
  source: ResumeBulletSource;
}

export type ResumeBulletSource =
  | { kind: "summary" }
  | { kind: "experience"; company?: string; title?: string }
  | { kind: "skills" }
  | { kind: "projects" }
  | { kind: "education" };

const SKILL_LINE_SPLIT = /\s*[,;|]\s*/;
const SKILL_LABEL = /^[A-Z][A-Za-z .]+:\s*/;

/**
 * Flatten a parsed resume into a list of "matchable" bullets that the
 * semantic engine can compare against JD requirements. Empty/short bullets
 * are dropped (they add noise to embeddings without carrying real signal).
 */
export function extractResumeBullets(structure: ResumeStructure): ResumeBullet[] {
  const out: ResumeBullet[] = [];

  for (const section of structure.sections) {
    if (section.kind === "summary") {
      const text = section.lines.join(" ").replace(/\s+/g, " ").trim();
      if (text.length > 20) {
        out.push({ text, source: { kind: "summary" } });
      }
    }
    if (section.kind === "skills") {
      for (const line of section.lines) {
        const cleaned = line.replace(SKILL_LABEL, "").trim();
        if (!cleaned) continue;
        // A "Skills: foo, bar, baz" line embeds better as one item than as
        // many one-token items, since embeddings need context to be useful.
        if (cleaned.length > 8) {
          out.push({ text: cleaned, source: { kind: "skills" } });
        } else {
          // Very short: split on common skill separators.
          for (const tok of cleaned.split(SKILL_LINE_SPLIT)) {
            if (tok.trim().length > 2) {
              out.push({ text: tok.trim(), source: { kind: "skills" } });
            }
          }
        }
      }
    }
    if (section.kind === "projects") {
      for (const line of section.lines) {
        const trimmed = line.trim();
        if (trimmed.length > 12) {
          out.push({ text: trimmed, source: { kind: "projects" } });
        }
      }
    }
    if (section.kind === "education") {
      for (const line of section.lines) {
        const trimmed = line.trim();
        if (trimmed.length > 12) {
          out.push({ text: trimmed, source: { kind: "education" } });
        }
      }
    }
  }

  for (const entry of structure.experience) {
    for (const bullet of entry.bullets) {
      if (bullet.length < 12) continue;
      out.push({
        text: bullet,
        source: {
          kind: "experience",
          company: entry.company,
          title: entry.title,
        },
      });
    }
  }

  return out;
}
