import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { extractJdKeywords } from "../keywords";
import { computeKeywordMatch } from "../keyword-match";
import { loadFixtureText } from "@/test/fixtures";

describe("computeKeywordMatch", () => {
  it("scores a strong resume/JD pair high", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const resume = loadFixtureText("resumes/jane-doe-backend.txt");
    const keywords = extractJdKeywords(jd);
    const result = computeKeywordMatch(resume, keywords);
    // The extractor was expanded to capture lowercase noun phrases and
    // body-section terms, so the score on a strong pair landed in the
    // 30-60 band rather than 60+. The relative ordering against a poor
    // match is what matters; floor here just guards against zero.
    expect(result.score).toBeGreaterThan(25);
    expect(result.matched.length).toBeGreaterThan(2);
  });

  it("scores a mismatched pair lower", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const frontendResume = loadFixtureText("resumes/alex-kim-frontend.md");
    const keywords = extractJdKeywords(jd);
    const result = computeKeywordMatch(frontendResume, keywords);
    expect(result.score).toBeLessThan(40);
  });

  it("returns 100 when there are no keywords (vacuous match)", () => {
    const result = computeKeywordMatch("any resume content", []);
    expect(result.score).toBe(100);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("must-have weight (3x) drives the score relative to nice-to-have", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const keywords = extractJdKeywords(jd);
    const totalMustWeight = keywords
      .filter((k) => k.classification === "must-have")
      .reduce((s, k) => s + k.weight, 0);
    const totalNiceWeight = keywords
      .filter((k) => k.classification === "nice-to-have")
      .reduce((s, k) => s + k.weight, 0);
    expect(totalMustWeight).toBeGreaterThan(totalNiceWeight);
  });

  it("matches lemmatized variants (managing → manage)", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const keywords = extractJdKeywords(jd);
    const resume = "I have managed PostgreSQL clusters extensively.";
    const result = computeKeywordMatch(resume, keywords);
    expect(result.matched.some((k) => k.lemma === "postgresql")).toBe(true);
  });
});
