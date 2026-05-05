import type { Embedder } from "@/lib/embeddings/types";
import { cosineSimilarity } from "@/lib/embeddings/cosine";
import type { JdRequirement } from "@/lib/jd/types";
import type { ResumeBullet } from "@/lib/resume/bullets";

export type CoverageBand = "well" | "weak" | "uncovered";

export interface RequirementCoverage {
  requirement: JdRequirement;
  /** The single best resume bullet match, if any. */
  bestMatch: { bullet: ResumeBullet; similarity: number } | null;
  band: CoverageBand;
}

export interface SemanticScoreResult {
  /** 0-100 composite scaled from cosine band. */
  score: number;
  /** Per-requirement coverage. */
  coverage: RequirementCoverage[];
  /** How we mapped raw cosine to the 0-100 band — exposed for UI tooltips. */
  scaling: { cosineFloor: number; cosineCeil: number };
}

/**
 * Lower bound: cosine below this contributes 0 toward the score.
 * Upper bound: cosine at or above this contributes 100. Linear in between.
 *
 * 0.3 / 0.8 are the spec values: MiniLM produces ~0.3 for unrelated bullets
 * and ~0.8 for paraphrases. Anything below 0.3 is noise; above 0.8 is a
 * confident semantic match.
 */
const COSINE_FLOOR = 0.3;
const COSINE_CEIL = 0.8;
const WELL_BAND = 0.7;
const WEAK_BAND = 0.5;

/**
 * Score the semantic alignment between a JD's requirements and a resume's
 * bullets. The embedder is dependency-injected so tests can supply
 * deterministic vectors and production can wire up MiniLM.
 *
 * For each JD requirement, we compute its max cosine similarity against any
 * resume bullet. The composite score is the mean of those maxes, scaled
 * 0.3→0 and 0.8→100. Per-requirement coverage bands surface which JD asks
 * are well/weakly/un-addressed by the resume.
 */
export async function computeSemanticScore(
  requirements: JdRequirement[],
  bullets: ResumeBullet[],
  embedder: Embedder,
): Promise<SemanticScoreResult> {
  if (requirements.length === 0) {
    return {
      score: 100,
      coverage: [],
      scaling: { cosineFloor: COSINE_FLOOR, cosineCeil: COSINE_CEIL },
    };
  }
  if (bullets.length === 0) {
    return {
      score: 0,
      coverage: requirements.map((r) => ({
        requirement: r,
        bestMatch: null,
        band: "uncovered" as const,
      })),
      scaling: { cosineFloor: COSINE_FLOOR, cosineCeil: COSINE_CEIL },
    };
  }

  // Embed both sides in single batches to amortize tokenizer overhead.
  const reqVectors = await embedder.embed(requirements.map((r) => r.text));
  const bulletVectors = await embedder.embed(bullets.map((b) => b.text));

  const coverage: RequirementCoverage[] = [];
  let scaledTotal = 0;

  for (let i = 0; i < requirements.length; i++) {
    const reqVec = reqVectors[i];
    const requirement = requirements[i];
    if (!reqVec || !requirement) continue;
    let bestSim = -Infinity;
    let bestIdx = -1;
    for (let j = 0; j < bullets.length; j++) {
      const bvec = bulletVectors[j];
      if (!bvec) continue;
      const sim = cosineSimilarity(reqVec, bvec);
      if (Number.isFinite(sim) && sim > bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
    }
    const band: CoverageBand =
      bestSim >= WELL_BAND ? "well" : bestSim >= WEAK_BAND ? "weak" : "uncovered";
    const bullet = bestIdx >= 0 ? bullets[bestIdx] : undefined;
    coverage.push({
      requirement,
      bestMatch:
        bullet && Number.isFinite(bestSim)
          ? { bullet, similarity: roundTo(bestSim, 3) }
          : null,
      band,
    });
    scaledTotal += scaleSimilarity(bestSim);
  }

  const score = Math.round(scaledTotal / requirements.length);
  return {
    score,
    coverage,
    scaling: { cosineFloor: COSINE_FLOOR, cosineCeil: COSINE_CEIL },
  };
}

function scaleSimilarity(sim: number): number {
  if (!Number.isFinite(sim)) return 0;
  if (sim <= COSINE_FLOOR) return 0;
  if (sim >= COSINE_CEIL) return 100;
  return ((sim - COSINE_FLOOR) / (COSINE_CEIL - COSINE_FLOOR)) * 100;
}

function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
