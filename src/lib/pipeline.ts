import type { ParsedDocument, DocumentFormat } from "@/lib/parsing/types";
import { parseDocument } from "@/lib/parsing";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { analyzeResumeStructure } from "@/lib/resume/structure";
import { extractResumeBullets } from "@/lib/resume/bullets";
import {
  computeParseability,
  type ParseabilityIssue,
} from "@/lib/resume/parseability";
import { extractJdKeywords } from "@/lib/scoring/keywords";
import { computeKeywordMatch } from "@/lib/scoring/keyword-match";
import {
  checkHardRequirements,
  extractHardRequirements,
} from "@/lib/scoring/hard-requirements";
import { computeSemanticScore } from "@/lib/scoring/semantic";
import type { Embedder } from "@/lib/embeddings/types";
import type {
  HardRequirementsResult,
  KeywordMatchResult,
} from "@/lib/scoring/types";
import type { ResumeStructure } from "@/lib/resume/types";
import type { JdAnalysis } from "@/lib/jd/types";
import type { SemanticScoreResult } from "@/lib/scoring/semantic";

/**
 * The combined result of running every Phase-2/3/4 engine on a single
 * (resume, JD) pair. The four component scores are always reported
 * alongside the composite — the UI must never display the composite alone.
 */
export interface AnalysisReport {
  resume: ResumeStructure;
  jd: JdAnalysis;
  scores: {
    keyword: KeywordMatchResult;
    semantic: SemanticScoreResult;
    hardRequirements: HardRequirementsResult;
    parseability: { score: number; issues: ParseabilityIssue[] };
    composite: number;
  };
  /** Hand-off to gap-analysis UI. */
  missingKeywords: KeywordMatchResult["missing"];
}

export interface AnalysisInput {
  resume:
    | { kind: "text"; format: "txt" | "md"; content: string; filename?: string }
    | { kind: "binary"; format: "pdf" | "docx"; content: ArrayBuffer; filename: string };
  jdText: string;
  embedder: Embedder;
  onStage?: (stage: AnalysisStage) => void;
}

export type AnalysisStage =
  | "parsing"
  | "structuring"
  | "extracting-jd"
  | "scoring-deterministic"
  | "embedding"
  | "scoring-semantic"
  | "done";

/**
 * Composite weights from the spec: keyword 30%, semantic 30%, hard reqs
 * 25%, parseability 15%. Documented here so a single grep finds them.
 */
const COMPOSITE_WEIGHTS = {
  keyword: 0.3,
  semantic: 0.3,
  hardRequirements: 0.25,
  parseability: 0.15,
} as const;

/**
 * Run the full analysis pipeline on a (resume, JD) pair. Pure async
 * function — all state lives in the returned object. Caller supplies the
 * embedder so this works in tests (StubEmbedder) and prod (MiniLm).
 */
export async function runAnalysis(input: AnalysisInput): Promise<AnalysisReport> {
  const { resume, jdText, embedder, onStage } = input;

  onStage?.("parsing");
  const resumeDoc = await step("parsing", () => parseResume(resume));

  onStage?.("structuring");
  const resumeStructure = await step("structuring", async () =>
    analyzeResumeStructure(resumeDoc),
  );

  onStage?.("extracting-jd");
  const jdAnalysis = await step("extracting-jd", async () =>
    analyzeJobDescription(jdText),
  );

  onStage?.("scoring-deterministic");
  const keywords = await step("extract-jd-keywords", async () =>
    extractJdKeywords(jdAnalysis),
  );
  const keywordResult = await step("keyword-match", async () =>
    computeKeywordMatch(resumeStructure.document.text, keywords, {
      resumeYearsOfExperience: resumeStructure.yearsOfExperience,
    }),
  );
  const hardReqs = await step("extract-hard-requirements", async () =>
    extractHardRequirements(jdAnalysis),
  );
  const hardResult = await step("check-hard-requirements", async () =>
    checkHardRequirements(resumeStructure, hardReqs),
  );
  const hasExperience = resumeStructure.sections.some(
    (s) => s.kind === "experience",
  );
  const hasAnyRecognized = resumeStructure.sections.some(
    (s) => s.kind !== "header" && s.kind !== "other",
  );
  const parseability = await step("parseability", async () =>
    computeParseability({
      document: resumeStructure.document,
      contactFields: resumeStructure.contactFieldsFound,
      hasExperienceSection: hasExperience,
      hasAnyRecognizedSection: hasAnyRecognized,
    }),
  );

  onStage?.("embedding");
  const bullets = await step("extract-bullets", async () =>
    extractResumeBullets(resumeStructure),
  );
  onStage?.("scoring-semantic");
  const semantic = await step("semantic-score", () =>
    computeSemanticScore(jdAnalysis.requirements, bullets, embedder),
  );

  const composite = Math.round(
    keywordResult.score * COMPOSITE_WEIGHTS.keyword +
      semantic.score * COMPOSITE_WEIGHTS.semantic +
      hardResult.score * COMPOSITE_WEIGHTS.hardRequirements +
      parseability.score * COMPOSITE_WEIGHTS.parseability,
  );

  onStage?.("done");
  return {
    resume: resumeStructure,
    jd: jdAnalysis,
    scores: {
      keyword: keywordResult,
      semantic,
      hardRequirements: hardResult,
      parseability,
      composite,
    },
    missingKeywords: keywordResult.missing,
  };
}

async function parseResume(
  input: AnalysisInput["resume"],
): Promise<ParsedDocument> {
  if (input.kind === "text") {
    return parseDocument(input.content, input.format);
  }
  return parseDocument(input.content, input.format as DocumentFormat);
}

/**
 * Wrap a pipeline step so any failure re-throws with a label identifying
 * which stage broke. Without this, "Cannot convert undefined or null to
 * object" coming from deep inside transformers.js looks identical to the
 * same error coming from a regex pass — and we waste an afternoon
 * bisecting.
 */
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const orig = err instanceof Error ? err : new Error(String(err));
    const wrapped = new Error(`[${label}] ${orig.message}`);
    if (orig.stack) wrapped.stack = orig.stack;
    throw wrapped;
  }
}

export { COMPOSITE_WEIGHTS };
