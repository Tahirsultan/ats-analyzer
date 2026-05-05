import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { extractJdKeywords } from "../keywords";
import { loadFixtureText } from "@/test/fixtures";

describe("extractJdKeywords", () => {
  it("pulls technical keywords from the backend JD with must-have weighting", () => {
    const raw = loadFixtureText("jds/backend-engineer-acme.txt");
    const analysis = analyzeJobDescription(raw);
    const keywords = extractJdKeywords(analysis);

    const surfaces = keywords.map((k) => k.surface);
    expect(surfaces).toContain("PostgreSQL");
    expect(surfaces).toContain("Kafka");
    expect(surfaces).toContain("Kubernetes");

    const postgres = keywords.find((k) => k.surface === "PostgreSQL");
    expect(postgres?.classification).toBe("must-have");
    const kubernetes = keywords.find((k) => k.surface === "Kubernetes");
    expect(kubernetes?.classification).toBe("nice-to-have");
  });

  it("rejects boilerplate stopwords like 'experience' and 'team'", () => {
    const raw = loadFixtureText("jds/backend-engineer-acme.txt");
    const analysis = analyzeJobDescription(raw);
    const keywords = extractJdKeywords(analysis);
    const lemmas = keywords.map((k) => k.lemma);
    expect(lemmas).not.toContain("experience");
    expect(lemmas).not.toContain("team");
    expect(lemmas).not.toContain("system");
  });

  it("must-haves are sorted before nice-to-haves", () => {
    const raw = loadFixtureText("jds/backend-engineer-acme.txt");
    const analysis = analyzeJobDescription(raw);
    const keywords = extractJdKeywords(analysis);
    let seenNice = false;
    for (const kw of keywords) {
      if (kw.classification === "nice-to-have") seenNice = true;
      if (seenNice) {
        expect(kw.classification).toBe("nice-to-have");
      }
    }
  });

  it("frontend JD finds React, TypeScript, Next.js as must-have keywords", () => {
    const raw = loadFixtureText("jds/frontend-engineer-novacart.txt");
    const analysis = analyzeJobDescription(raw);
    const keywords = extractJdKeywords(analysis);
    const must = keywords.filter((k) => k.classification === "must-have");
    const mustSurfaces = must.map((k) => k.surface);
    expect(mustSurfaces).toContain("React");
    expect(mustSurfaces).toContain("TypeScript");
    expect(must.some((k) => /Next\.js/i.test(k.surface))).toBe(true);
  });

  it("data-scientist JD picks up python, sql, AWS as must-have", () => {
    const raw = loadFixtureText("jds/data-scientist-helix.txt");
    const analysis = analyzeJobDescription(raw);
    const keywords = extractJdKeywords(analysis);
    const must = keywords.filter((k) => k.classification === "must-have");
    const surfaces = must.map((k) => k.surface);
    expect(surfaces).toContain("Python");
    expect(surfaces).toContain("SQL");
    expect(surfaces).toContain("AWS");
  });
});
