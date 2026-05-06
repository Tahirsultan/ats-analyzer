import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { analyzeResumeStructure } from "@/lib/resume/structure";
import { parseText } from "@/lib/parsing/text";
import { extractJdKeywords } from "../keywords";
import { computeKeywordMatch } from "../keyword-match";
import { loadFixtureText } from "@/test/fixtures";

/**
 * Regression tests for the four bugs surfaced after the first
 * extractor expansion. Each maps to a specific user complaint:
 *
 *   1. Constituent dedup — "B2B" must NOT exist alongside "B2B marketing"
 *      from the same source section.
 *   2. Degree-field enumeration boilerplate — "Business" must NOT be
 *      extracted from "Bachelor's degree in Marketing, Business, …".
 *   3. Degree equivalence — JD "Bachelor's degree" matches resume
 *      "Bachelor of Arts in Marketing" / "B.A." / etc.
 *   4. Numeric YOE — JD "5+ years" matches a resume with ≥ 5 years
 *      of parsed experience, regardless of whether "5+ years" appears
 *      literally; "4 years" must NOT match a "5+ years" requirement.
 */

const marketingJd = analyzeJobDescription(
  loadFixtureText("jds/marketing-manager-acme.txt"),
);
const marketingKeywords = extractJdKeywords(marketingJd);

describe("Constituent dedup (Bug 1+4)", () => {
  it("does not emit B2B as a separate keyword when B2B marketing is present in the same section", () => {
    const surfaces = marketingKeywords.map((k) => k.surface.toLowerCase());
    expect(surfaces).toContain("b2b marketing");
    expect(surfaces).not.toContain("b2b");
  });

  it("does not emit pipeline as a separate keyword when qualified pipeline is present", () => {
    const surfaces = marketingKeywords.map((k) => k.surface.toLowerCase());
    expect(surfaces).toContain("qualified pipeline");
    expect(surfaces).not.toContain("pipeline");
  });
});

describe("Degree-field enumeration filter (Bug 1)", () => {
  it("does not extract Business from 'degree in Marketing, Business, or a related field'", () => {
    const surfaces = marketingKeywords.map((k) => k.surface);
    expect(surfaces).not.toContain("Business");
    // Marketing as a single-token keyword is also filtered (single-token
    // stopword), confirming the enumeration handling didn't accidentally
    // re-introduce the field labels via a different path.
    expect(surfaces).not.toContain("Marketing");
  });
});

describe("Degree equivalence aliases (Bug 2)", () => {
  it("matches Bachelor's degree against 'Bachelor of Arts in Marketing'", () => {
    const result = computeKeywordMatch(
      "Bachelor of Arts in Marketing",
      marketingKeywords,
    );
    const matched = result.matched.find(
      (m) => m.surface.toLowerCase() === "bachelor degree",
    );
    expect(matched).toBeDefined();
    expect(matched!.foundIn).toMatch(/Bachelor of Arts/);
  });

  it("matches Bachelor's degree against 'Bachelor of Science in Business Administration'", () => {
    const result = computeKeywordMatch(
      "Bachelor of Science in Business Administration",
      marketingKeywords,
    );
    expect(
      result.matched.some((m) => m.surface.toLowerCase() === "bachelor degree"),
    ).toBe(true);
  });

  it("matches Bachelor's degree against the abbreviation 'B.A.'", () => {
    const result = computeKeywordMatch(
      "B.A. in English Literature, 2018",
      marketingKeywords,
    );
    expect(
      result.matched.some((m) => m.surface.toLowerCase() === "bachelor degree"),
    ).toBe(true);
  });

  it("matches Bachelor's degree against 'BS Computer Science'", () => {
    const result = computeKeywordMatch(
      "BS Computer Science · Stanford University",
      marketingKeywords,
    );
    expect(
      result.matched.some((m) => m.surface.toLowerCase() === "bachelor degree"),
    ).toBe(true);
  });
});

describe("Numeric YOE matcher (Bug 3)", () => {
  // The marketing JD's "5+ years" → minYearsOfExperience 5.
  const yoeKeyword = marketingKeywords.find(
    (k) => k.minYearsOfExperience === 5,
  );

  it("attaches minYearsOfExperience=5 to the '5+ years' keyword", () => {
    expect(yoeKeyword).toBeDefined();
  });

  it("matches when resume YOE ≥ 5", () => {
    const result = computeKeywordMatch("any resume text", marketingKeywords, {
      resumeYearsOfExperience: 6,
    });
    const matched = result.matched.find((m) => m.minYearsOfExperience === 5);
    expect(matched).toBeDefined();
  });

  it("does NOT match when resume YOE < 5", () => {
    const result = computeKeywordMatch("any resume text", marketingKeywords, {
      resumeYearsOfExperience: 4,
    });
    const stillMissing = result.missing.find((m) => m.minYearsOfExperience === 5);
    expect(stillMissing).toBeDefined();
  });

  it("matches the test fixture: 6.8 parsed years vs 5+ years required", () => {
    const resumeText = loadFixtureText("resumes/jane-smith-marketing.txt");
    const structure = analyzeResumeStructure(parseText(resumeText));
    expect(structure.yearsOfExperience).toBeGreaterThanOrEqual(5);
    const result = computeKeywordMatch(resumeText, marketingKeywords, {
      resumeYearsOfExperience: structure.yearsOfExperience,
    });
    expect(
      result.matched.some((m) => m.minYearsOfExperience === 5),
    ).toBe(true);
  });
});
