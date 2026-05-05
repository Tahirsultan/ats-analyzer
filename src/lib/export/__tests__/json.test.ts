import { describe, expect, it } from "vitest";
import { runAnalysis } from "@/lib/pipeline";
import { serializeReport } from "../json";
import { StubEmbedder } from "@/test/stub-embedder";
import { loadFixtureText } from "@/test/fixtures";

const embedder = new StubEmbedder();

async function buildReport() {
  return runAnalysis({
    resume: {
      kind: "text",
      format: "txt",
      content: loadFixtureText("resumes/jane-doe-backend.txt"),
    },
    jdText: loadFixtureText("jds/backend-engineer-acme.txt"),
    embedder,
  });
}

describe("serializeReport", () => {
  it("produces a stable schema-versioned shape", async () => {
    const report = await buildReport();
    const out = serializeReport(report, new Date("2026-05-05T12:00:00Z"));
    expect(out.schema).toBe("ats-analyzer-report");
    expect(out.schemaVersion).toBe(1);
    expect(out.generatedAt).toBe("2026-05-05T12:00:00.000Z");
    expect(out.weights).toEqual({
      keyword: 0.3,
      semantic: 0.3,
      hardRequirements: 0.25,
      parseability: 0.15,
    });
  });

  it("flattens nested types so the JSON is round-trippable as plain data", async () => {
    const report = await buildReport();
    const out = serializeReport(report);
    // The serialized form must survive JSON.stringify/parse without losing
    // anything — i.e. no Set, Map, ArrayBuffer, or class instances.
    const roundTripped = JSON.parse(JSON.stringify(out));
    expect(roundTripped).toEqual(out);
  });

  it("includes matched + missing keywords with classification + weight", async () => {
    const report = await buildReport();
    const out = serializeReport(report);
    expect(out.scores.keyword.matched.length).toBeGreaterThan(0);
    const sample = out.scores.keyword.matched[0]!;
    expect(["must-have", "nice-to-have"]).toContain(sample.classification);
    expect(typeof sample.weight).toBe("number");
    expect(typeof sample.surface).toBe("string");
  });

  it("flattens semantic coverage into excerpt + similarity", async () => {
    const report = await buildReport();
    const out = serializeReport(report);
    expect(out.scores.semantic.coverage.length).toBeGreaterThan(0);
    const sample = out.scores.semantic.coverage[0]!;
    expect(["well", "weak", "uncovered"]).toContain(sample.band);
    expect(typeof sample.requirement).toBe("string");
  });
});
