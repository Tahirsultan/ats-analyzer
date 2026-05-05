import { describe, expect, it } from "vitest";
import { computeSemanticScore } from "../semantic";
import { StubEmbedder } from "@/test/stub-embedder";
import type { JdRequirement } from "@/lib/jd/types";
import type { ResumeBullet } from "@/lib/resume/bullets";

const embedder = new StubEmbedder();

function req(text: string): JdRequirement {
  return {
    text,
    classification: "must-have",
    sourceSection: "required",
    reason: "section-required",
  };
}

function bullet(text: string): ResumeBullet {
  return { text, source: { kind: "experience" } };
}

describe("computeSemanticScore", () => {
  it("returns 100 (vacuous) when there are no requirements", async () => {
    const result = await computeSemanticScore([], [bullet("anything")], embedder);
    expect(result.score).toBe(100);
    expect(result.coverage).toEqual([]);
  });

  it("returns 0 with all-uncovered when there are no resume bullets", async () => {
    const result = await computeSemanticScore(
      [req("PostgreSQL at scale")],
      [],
      embedder,
    );
    expect(result.score).toBe(0);
    expect(result.coverage).toHaveLength(1);
    expect(result.coverage[0]?.band).toBe("uncovered");
    expect(result.coverage[0]?.bestMatch).toBeNull();
  });

  it("scores higher when resume bullets share vocabulary with the JD", async () => {
    const reqs = [
      req("PostgreSQL query optimization at scale"),
      req("Kafka event streaming"),
    ];
    const matchingBullets = [
      bullet("Optimized PostgreSQL queries at scale"),
      bullet("Built Kafka event streaming pipelines"),
    ];
    const irrelevantBullets = [
      bullet("Watered the office plants"),
      bullet("Catered Friday lunches"),
    ];
    const matched = await computeSemanticScore(reqs, matchingBullets, embedder);
    const unmatched = await computeSemanticScore(reqs, irrelevantBullets, embedder);
    expect(matched.score).toBeGreaterThan(unmatched.score);
  });

  it("classifies bands using the documented thresholds", async () => {
    // With the StubEmbedder, identical strings yield similarity 1.0, which
    // is firmly above the 0.7 well-covered threshold.
    const reqs = [req("PostgreSQL queries")];
    const bullets = [bullet("PostgreSQL queries")];
    const result = await computeSemanticScore(reqs, bullets, embedder);
    expect(result.coverage[0]?.band).toBe("well");
    expect(result.coverage[0]?.bestMatch?.similarity).toBeCloseTo(1, 2);
    expect(result.score).toBe(100);
  });

  it("picks the single best resume bullet per requirement", async () => {
    const reqs = [req("PostgreSQL query optimization")];
    const bullets = [
      bullet("Catered Friday lunches"),
      bullet("PostgreSQL query optimization"),
      bullet("Designed CSS animations"),
    ];
    const result = await computeSemanticScore(reqs, bullets, embedder);
    expect(result.coverage[0]?.bestMatch?.bullet.text).toBe(
      "PostgreSQL query optimization",
    );
  });

  it("exposes the cosine→score scaling for UI tooltips", async () => {
    const result = await computeSemanticScore(
      [req("anything")],
      [bullet("anything")],
      embedder,
    );
    expect(result.scaling).toEqual({ cosineFloor: 0.3, cosineCeil: 0.8 });
  });
});
