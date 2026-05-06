import type { AnalysisReport } from "@/lib/pipeline";

/**
 * The shape we serialize to JSON for the user-facing download. We
 * deliberately do NOT export the full ParsedDocument or the resume's raw
 * text — the user already has those. The export is meant for scripting
 * around the analysis output (CI checks, custom dashboards, diffing).
 */
export interface ExportedReport {
  schema: "ats-analyzer-report";
  schemaVersion: 1;
  generatedAt: string;
  composite: number;
  weights: {
    keyword: number;
    semantic: number;
    hardRequirements: number;
    parseability: number;
  };
  scores: {
    keyword: {
      score: number;
      totalWeight: number;
      matchedWeight: number;
      matched: ExportedKeyword[];
      missing: ExportedKeyword[];
    };
    semantic: {
      score: number;
      coverage: ExportedCoverage[];
    };
    hardRequirements: {
      score: number;
      requirements: ExportedHardRequirement[];
    };
    parseability: {
      score: number;
      issues: ExportedParseabilityIssue[];
    };
  };
  resume: {
    yearsOfExperience: number;
    sections: { kind: string; heading: string; lineCount: number }[];
    contactFieldsFound: { email: boolean; phone: boolean; linkedin: boolean; location: boolean };
  };
}

interface ExportedKeyword {
  surface: string;
  lemma: string;
  aliases: string[];
  classification: "must-have" | "nice-to-have";
  tier: "must-have" | "nice-to-have" | "body";
  sourceSection: string;
  weight: number;
  frequency: number;
  /** Resume excerpt where the keyword was first matched (matched only). */
  foundIn?: string;
}

interface ExportedCoverage {
  requirement: string;
  band: "well" | "weak" | "uncovered";
  classification: "must-have" | "nice-to-have";
  bestMatchSimilarity: number | null;
  bestMatchExcerpt: string | null;
}

interface ExportedHardRequirement {
  code: string;
  passed: boolean;
  detail: string;
  description: string;
}

interface ExportedParseabilityIssue {
  code: string;
  severity: "high" | "medium" | "low";
  penalty: number;
  message: string;
}

const COMPOSITE_WEIGHTS = {
  keyword: 0.3,
  semantic: 0.3,
  hardRequirements: 0.25,
  parseability: 0.15,
} as const;

export function serializeReport(
  report: AnalysisReport,
  generatedAt: Date = new Date(),
): ExportedReport {
  return {
    schema: "ats-analyzer-report",
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    composite: report.scores.composite,
    weights: COMPOSITE_WEIGHTS,
    scores: {
      keyword: {
        score: report.scores.keyword.score,
        totalWeight: report.scores.keyword.totalWeight,
        matchedWeight: report.scores.keyword.matchedWeight,
        matched: report.scores.keyword.matched.map((k) => ({
          ...toKeyword(k),
          foundIn: k.foundIn,
        })),
        missing: report.scores.keyword.missing.map(toKeyword),
      },
      semantic: {
        score: report.scores.semantic.score,
        coverage: report.scores.semantic.coverage.map((c) => ({
          requirement: c.requirement.text,
          band: c.band,
          classification: c.requirement.classification,
          bestMatchSimilarity: c.bestMatch?.similarity ?? null,
          bestMatchExcerpt: c.bestMatch?.bullet.text ?? null,
        })),
      },
      hardRequirements: {
        score: report.scores.hardRequirements.score,
        requirements: report.scores.hardRequirements.requirements.map((r) => ({
          code: r.code,
          passed: r.passed,
          detail: r.detail,
          description: r.description,
        })),
      },
      parseability: {
        score: report.scores.parseability.score,
        issues: report.scores.parseability.issues.map((i) => ({
          code: i.code,
          severity: i.severity,
          penalty: i.penalty,
          message: i.message,
        })),
      },
    },
    resume: {
      yearsOfExperience: report.resume.yearsOfExperience,
      sections: report.resume.sections.map((s) => ({
        kind: s.kind,
        heading: s.heading,
        lineCount: s.lines.length,
      })),
      contactFieldsFound: report.resume.contactFieldsFound,
    },
  };
}

function toKeyword(k: {
  surface: string;
  lemma: string;
  aliases: string[];
  classification: "must-have" | "nice-to-have";
  tier: "must-have" | "nice-to-have" | "body";
  sourceSection: string;
  weight: number;
  frequency: number;
}): ExportedKeyword {
  return {
    surface: k.surface,
    lemma: k.lemma,
    aliases: k.aliases,
    classification: k.classification,
    tier: k.tier,
    sourceSection: k.sourceSection,
    weight: k.weight,
    frequency: k.frequency,
  };
}
