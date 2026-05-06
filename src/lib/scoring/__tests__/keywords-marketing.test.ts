import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { extractJdKeywords } from "../keywords";
import { computeKeywordMatch } from "../keyword-match";
import { loadFixtureText } from "@/test/fixtures";

/**
 * Acceptance tests for the Keyword Match expansion: the marketing
 * manager fixture must produce at least 18 distinct weighted keywords,
 * cover specific terms ("marketing budget", "brand strategy",
 * "lead qualification"), and surface the canonical
 * "account-based marketing" entry with `ABM` recorded as an alias.
 */
describe("extractJdKeywords on marketing-manager fixture", () => {
  const raw = loadFixtureText("jds/marketing-manager-acme.txt");
  const keywords = extractJdKeywords(analyzeJobDescription(raw));
  const surfaces = keywords.map((k) => k.surface.toLowerCase());

  it("produces at least 18 distinct weighted keywords", () => {
    expect(keywords.length).toBeGreaterThanOrEqual(18);
  });

  it("captures the canonical multi-word must-have phrases", () => {
    expect(surfaces).toContain("marketing budget");
    expect(surfaces).toContain("b2b marketing");
    expect(surfaces).toContain("google analytics");
  });

  it("captures lowercase responsibilities-section phrases", () => {
    expect(surfaces).toContain("brand strategy");
    expect(surfaces).toContain("lead qualification");
    expect(surfaces).toContain("demand generation");
    expect(surfaces).toContain("paid search");
    expect(surfaces).toContain("organic traffic");
    expect(surfaces).toContain("sales team");
    expect(surfaces).toContain("executive team");
    expect(surfaces).toContain("marketing roadmap");
  });

  it("captures single-token domain terms via the allowlist", () => {
    expect(surfaces).toContain("seo");
    expect(surfaces).toContain("roi");
    // pipeline is deduped in favor of the more specific "qualified
    // pipeline" — both come from the intro section, so the constituent
    // dedup pass subsumes the bare token.
    expect(surfaces).toContain("qualified pipeline");
    expect(surfaces).toContain("conversion");
  });

  it("records ABM as an alias of account-based marketing, not a separate keyword", () => {
    const abm = keywords.find(
      (k) => k.surface.toLowerCase() === "account-based marketing",
    );
    expect(abm).toBeDefined();
    expect(abm!.aliases.map((a) => a.toLowerCase())).toContain("abm");
    // No standalone ABM entry.
    expect(
      keywords.filter((k) => k.surface.toUpperCase() === "ABM").length,
    ).toBe(0);
  });

  it("classifies must-have / nice-to-have / body correctly", () => {
    const tierOf = (s: string) =>
      keywords.find((k) => k.surface.toLowerCase() === s)?.tier;
    expect(tierOf("marketing budget")).toBe("must-have");
    expect(tierOf("b2b marketing")).toBe("must-have");
    expect(tierOf("salesforce")).toBe("nice-to-have");
    expect(tierOf("mba")).toBe("nice-to-have");
    expect(tierOf("brand strategy")).toBe("body");
    expect(tierOf("paid search")).toBe("body");
  });

  it("must-have terms get 3x the weight of nice-to-have / body", () => {
    const must = keywords.find((k) => k.tier === "must-have");
    const nice = keywords.find((k) => k.tier === "nice-to-have");
    const body = keywords.find((k) => k.tier === "body");
    expect(must).toBeDefined();
    expect(nice).toBeDefined();
    expect(body).toBeDefined();
    expect(must!.weight).toBeGreaterThanOrEqual(3);
    expect(nice!.weight).toBeLessThan(must!.weight);
    expect(body!.weight).toBeLessThan(must!.weight);
  });
});

describe("computeKeywordMatch on marketing pair", () => {
  const jd = analyzeJobDescription(
    loadFixtureText("jds/marketing-manager-acme.txt"),
  );
  const keywords = extractJdKeywords(jd);
  const resume = loadFixtureText("resumes/jane-smith-marketing.txt");
  const result = computeKeywordMatch(resume, keywords);

  it("records a foundIn snippet for every matched keyword", () => {
    expect(result.matched.length).toBeGreaterThan(0);
    for (const m of result.matched) {
      expect(m.foundIn).toBeTruthy();
      expect(m.foundIn.length).toBeGreaterThan(0);
      expect(m.foundIn.length).toBeLessThanOrEqual(70);
    }
  });

  it("matches keywords whose canonical phrase OR alias appears in resume", () => {
    // Jane Smith's resume mentions HubSpot, demand generation, content
    // marketing, ROI, SEO, sales team, lead qualification, executive
    // team, and B2B — all of which should be in the matched list.
    const matchedSurfaces = result.matched.map((m) => m.surface.toLowerCase());
    expect(matchedSurfaces).toContain("hubspot");
    expect(matchedSurfaces).toContain("demand generation");
    expect(matchedSurfaces).toContain("content marketing");
    expect(matchedSurfaces).toContain("roi");
    expect(matchedSurfaces).toContain("seo");
    expect(matchedSurfaces).toContain("lead qualification");
  });

  it("flags marketing-budget, MBA, Salesforce, and SaaS as missing", () => {
    const missing = result.missing.map((m) => m.surface.toLowerCase());
    expect(missing).toContain("marketing budget");
    expect(missing).toContain("mba");
    expect(missing).toContain("salesforce");
    expect(missing).toContain("saas");
  });
});
