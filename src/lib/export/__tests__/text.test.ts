import { describe, expect, it } from "vitest";
import { runAnalysis } from "@/lib/pipeline";
import { formatTextSummary } from "../text";
import { StubEmbedder } from "@/test/stub-embedder";
import { loadFixtureText } from "@/test/fixtures";

const embedder = new StubEmbedder();

describe("formatTextSummary", () => {
  it("includes the composite + four dimension scores", async () => {
    const report = await runAnalysis({
      resume: {
        kind: "text",
        format: "txt",
        content: loadFixtureText("resumes/jane-doe-backend.txt"),
      },
      jdText: loadFixtureText("jds/backend-engineer-acme.txt"),
      embedder,
    });
    const text = formatTextSummary(report);
    expect(text).toContain("Composite:");
    expect(text).toContain("Keyword match:");
    expect(text).toContain("Semantic similarity:");
    expect(text).toContain("Hard requirements:");
    expect(text).toContain("Parseability:");
    expect(text).toContain(`${report.scores.composite}/100`);
  });

  it("includes the disclaimer about no real ATS having a unified score", async () => {
    const report = await runAnalysis({
      resume: {
        kind: "text",
        format: "txt",
        content: loadFixtureText("resumes/jane-doe-backend.txt"),
      },
      jdText: loadFixtureText("jds/backend-engineer-acme.txt"),
      embedder,
    });
    const text = formatTextSummary(report);
    expect(text).toMatch(/no real ATS/i);
  });

  it("lists top missing keywords with weights", async () => {
    const report = await runAnalysis({
      resume: {
        kind: "text",
        format: "md",
        content: loadFixtureText("resumes/alex-kim-frontend.md"),
      },
      jdText: loadFixtureText("jds/data-scientist-helix.txt"),
      embedder,
    });
    const text = formatTextSummary(report);
    expect(text).toMatch(/Top missing JD keywords/);
    // Frontend resume vs data-science JD should expose Python/SQL etc. as
    // missing.
    expect(text).toMatch(/Python|SQL|AWS/);
  });
});
