import { describe, expect, it } from "vitest";
import { analyzeResumeStructure } from "../structure";
import { parseText } from "@/lib/parsing/text";
import { loadFixtureText } from "@/test/fixtures";

describe("analyzeResumeStructure", () => {
  it("produces a complete structural analysis for the jane-doe fixture", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const document = parseText(raw);
    const structure = analyzeResumeStructure(document);

    expect(structure.sections.length).toBeGreaterThanOrEqual(4);
    expect(structure.experience.length).toBe(3);
    expect(structure.yearsOfExperience).toBeGreaterThan(5);
    expect(structure.contactFieldsFound.email).toBe(true);
    expect(structure.contactFieldsFound.phone).toBe(true);
    expect(structure.contactFieldsFound.location).toBe(true);
    expect(structure.contactFieldsFound.linkedin).toBe(true);
  });

  it("produces a complete analysis for the priya-rao fixture (no LinkedIn)", () => {
    const raw = loadFixtureText("resumes/priya-rao-data-scientist.txt");
    const structure = analyzeResumeStructure(parseText(raw));
    expect(structure.contactFieldsFound.email).toBe(true);
    expect(structure.contactFieldsFound.linkedin).toBe(false);
    expect(structure.experience.length).toBe(3);
  });
});
