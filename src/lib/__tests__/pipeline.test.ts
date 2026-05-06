import { describe, expect, it } from "vitest";
import { runAnalysis, COMPOSITE_WEIGHTS } from "../pipeline";
import { StubEmbedder } from "@/test/stub-embedder";
import { loadFixtureText } from "@/test/fixtures";

const embedder = new StubEmbedder();

describe("runAnalysis", () => {
  it("produces all four scores + a composite for jane-doe vs backend JD", async () => {
    const report = await runAnalysis({
      resume: {
        kind: "text",
        format: "txt",
        content: loadFixtureText("resumes/jane-doe-backend.txt"),
      },
      jdText: loadFixtureText("jds/backend-engineer-acme.txt"),
      embedder,
    });
    const { scores } = report;
    expect(scores.keyword.score).toBeGreaterThanOrEqual(0);
    expect(scores.keyword.score).toBeLessThanOrEqual(100);
    expect(scores.semantic.score).toBeGreaterThanOrEqual(0);
    expect(scores.hardRequirements.score).toBeGreaterThanOrEqual(0);
    expect(scores.parseability.score).toBeGreaterThanOrEqual(0);
    // Jane was custom-built to fit the backend JD; the lexical score
    // dropped after the extractor expansion (more multi-word phrases
    // captured) but should still be a meaningful match.
    expect(scores.keyword.score).toBeGreaterThan(25);
    expect(scores.composite).toBeGreaterThan(40);
  });

  it("flags coverage and missing-keyword gaps for a mismatched pair", async () => {
    const report = await runAnalysis({
      resume: {
        kind: "text",
        format: "md",
        content: loadFixtureText("resumes/alex-kim-frontend.md"),
      },
      jdText: loadFixtureText("jds/data-scientist-helix.txt"),
      embedder,
    });
    expect(report.scores.keyword.score).toBeLessThan(30);
    expect(report.missingKeywords.length).toBeGreaterThan(3);
    expect(
      report.scores.semantic.coverage.some((c) => c.band === "uncovered"),
    ).toBe(true);
  });

  it("composite is the documented weighted average of its components", async () => {
    const report = await runAnalysis({
      resume: {
        kind: "text",
        format: "txt",
        content: loadFixtureText("resumes/jane-doe-backend.txt"),
      },
      jdText: loadFixtureText("jds/backend-engineer-acme.txt"),
      embedder,
    });
    const { scores } = report;
    const expected = Math.round(
      scores.keyword.score * COMPOSITE_WEIGHTS.keyword +
        scores.semantic.score * COMPOSITE_WEIGHTS.semantic +
        scores.hardRequirements.score * COMPOSITE_WEIGHTS.hardRequirements +
        scores.parseability.score * COMPOSITE_WEIGHTS.parseability,
    );
    expect(scores.composite).toBe(expected);
  });

  it("invokes the onStage callback with each stage in order", async () => {
    const stages: string[] = [];
    await runAnalysis({
      resume: {
        kind: "text",
        format: "txt",
        content: loadFixtureText("resumes/jane-doe-backend.txt"),
      },
      jdText: loadFixtureText("jds/backend-engineer-acme.txt"),
      embedder,
      onStage: (s) => stages.push(s),
    });
    expect(stages[0]).toBe("parsing");
    expect(stages[stages.length - 1]).toBe("done");
    expect(stages).toContain("scoring-deterministic");
    expect(stages).toContain("scoring-semantic");
  });
});
