/**
 * Map a 0-100 score to its semantic band. The band drives both the color
 * shown on the score number and the interpretation copy underneath the
 * composite. Single source of truth so no surface invents its own thresholds.
 */
export type ScoreBand = "strong" | "decent" | "weak" | "poor";

export function bandFor(score: number): ScoreBand {
  if (score >= 80) return "strong";
  if (score >= 60) return "decent";
  if (score >= 40) return "weak";
  return "poor";
}

/** Tailwind text-color class for a band (uses tokens declared in globals.css). */
export const BAND_TEXT_CLASS: Record<ScoreBand, string> = {
  strong: "text-score-strong",
  decent: "text-score-decent",
  weak: "text-score-weak",
  poor: "text-score-poor",
};

/** Tailwind border-color class for a band. */
export const BAND_BORDER_CLASS: Record<ScoreBand, string> = {
  strong: "border-score-strong",
  decent: "border-score-decent",
  weak: "border-score-weak",
  poor: "border-score-poor",
};

/** Tailwind background-color (translucent) class for a band — use on pills. */
export const BAND_BG_SOFT_CLASS: Record<ScoreBand, string> = {
  strong: "bg-score-strong/10",
  decent: "bg-score-decent/10",
  weak: "bg-score-weak/15",
  poor: "bg-score-poor/15",
};

/**
 * One-line interpretation of a composite score. Honest tone — the spec
 * pushes back on false precision, so we lean toward language that
 * reflects what the score *means* rather than congratulating the user.
 */
export function compositeInterpretation(score: number): string {
  if (score >= 90) return "Excellent match — your resume strongly aligns with this role.";
  if (score >= 80) return "Strong match — minor gaps but very competitive.";
  if (score >= 70) return "Solid match — a few high-leverage edits would tighten it.";
  if (score >= 60) return "Decent match — meaningful gaps worth addressing.";
  if (score >= 50) return "Partial match — substantial gaps in key areas.";
  if (score >= 40) return "Weak match — significant restructuring or different positioning needed.";
  return "Poor match — this role may not be the right fit, or the resume needs major rework.";
}
