import { describe, expect, it } from "vitest";
import { extractResumeBullets } from "../bullets";
import { analyzeResumeStructure } from "../structure";
import { parseText } from "@/lib/parsing/text";
import { loadFixtureText } from "@/test/fixtures";

describe("extractResumeBullets", () => {
  it("extracts experience bullets, summary, and skills from jane-doe", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const structure = analyzeResumeStructure(parseText(raw));
    const bullets = extractResumeBullets(structure);

    const summaries = bullets.filter((b) => b.source.kind === "summary");
    const experience = bullets.filter((b) => b.source.kind === "experience");
    const skills = bullets.filter((b) => b.source.kind === "skills");

    expect(summaries.length).toBe(1);
    expect(summaries[0]?.text).toMatch(/distributed systems/);
    expect(experience.length).toBeGreaterThan(5);
    expect(experience.some((b) => /PostgreSQL/.test(b.text))).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
  });

  it("annotates experience bullets with company/title context", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const structure = analyzeResumeStructure(parseText(raw));
    const bullets = extractResumeBullets(structure);
    const acme = bullets.filter(
      (b) => b.source.kind === "experience" && b.source.company === "Acme Corp",
    );
    expect(acme.length).toBeGreaterThan(0);
  });

  it("drops short noise bullets", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const structure = analyzeResumeStructure(parseText(raw));
    const bullets = extractResumeBullets(structure);
    expect(bullets.every((b) => b.text.length >= 12)).toBe(true);
  });

  it("works for the markdown fixture too", () => {
    const raw = loadFixtureText("resumes/alex-kim-frontend.md");
    const structure = analyzeResumeStructure(parseText(raw));
    const bullets = extractResumeBullets(structure);
    expect(bullets.length).toBeGreaterThan(8);
  });
});
