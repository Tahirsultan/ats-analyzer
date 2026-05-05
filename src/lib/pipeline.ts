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
  const resumeDoc = await parseResume(resume);

  onStage?.("structuring");
  const resumeStructure = analyzeResumeStructure(resumeDoc);

  onStage?.("extracting-jd");
  const jdAnalysis = analyzeJobDescription(jdText);

  onStage?.("scoring-deterministic");
  const keywords = extractJdKeywords(jdAnalysis);
  const keywordResult = computeKeywordMatch(resumeStructure.document.text, keywords);
  const hardReqs = extractHardRequirements(jdAnalysis);
  const hardResult = checkHardRequirements(resumeStructure, hardReqs);
  const hasExperience = resumeStructure.sections.some(
    (s) => s.kind === "experience",
  );
  const hasAnyRecognized = resumeStructure.sections.some(
    (s) => s.kind !== "header" && s.kind !== "other",
  );
  const parseability = computeParseability({
    document: resumeStructure.document,
    contactFields: resumeStructure.contactFieldsFound,
    hasExperienceSection: hasExperience,
    hasAnyRecognizedSection: hasAnyRecognized,
  });

  onStage?.("embedding");
  const bullets = extractResumeBullets(resumeStructure);
  onStage?.("scoring-semantic");
  const semantic = await computeSemanticScore(
    jdAnalysis.requirements,
    bullets,
    embedder,
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

export { COMPOSITE_WEIGHTS };
