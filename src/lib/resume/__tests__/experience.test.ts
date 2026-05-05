import { describe, expect, it } from "vitest";
import { parseDateRange, parseExperienceSection } from "../experience";
import { splitResumeIntoSections } from "../sections";
import { loadFixtureText } from "@/test/fixtures";

describe("parseDateRange", () => {
  it("parses Month YYYY – Month YYYY", () => {
    const r = parseDateRange("March 2022 – February 2024");
    expect(r).not.toBeNull();
    expect(r!.start).toEqual({ year: 2022, month: 3 });
    expect(r!.end).toEqual({ year: 2024, month: 2 });
    expect(r!.current).toBe(false);
  });

  it("parses YYYY - YYYY (year only)", () => {
    const r = parseDateRange("2018 - 2020");
    expect(r).not.toBeNull();
    expect(r!.start.year).toBe(2018);
    expect(r!.end.year).toBe(2020);
  });

  it("recognizes Present / Current as ongoing", () => {
    const r = parseDateRange("Jan 2023 – Present");
    expect(r).not.toBeNull();
    expect(r!.current).toBe(true);
    expect(r!.end.year).toBeGreaterThanOrEqual(2024);
  });

  it("returns null when no recognizable range", () => {
    expect(parseDateRange("San Francisco")).toBeNull();
    expect(parseDateRange("")).toBeNull();
  });
});

describe("parseExperienceSection", () => {
  it("extracts every job from the jane-doe fixture", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const sections = splitResumeIntoSections(raw);
    const exp = sections.find((s) => s.kind === "experience");
    expect(exp).toBeDefined();
    const entries = parseExperienceSection(exp!);
    expect(entries.length).toBe(3);
    expect(entries[0]?.company).toBe("Acme Corp");
    expect(entries[1]?.company).toBe("Helix Analytics");
    expect(entries[2]?.company).toBe("NovaCart");
  });

  it("populates dates and bullets", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const sections = splitResumeIntoSections(raw);
    const exp = sections.find((s) => s.kind === "experience");
    const entries = parseExperienceSection(exp!);
    const acme = entries[0]!;
    expect(acme.startDate?.year).toBe(2022);
    expect(acme.startDate?.month).toBe(3);
    expect(acme.current).toBe(true);
    expect(acme.bullets.length).toBeGreaterThan(2);
    expect(acme.bullets.some((b) => /PostgreSQL/.test(b))).toBe(true);
  });

  it("handles markdown-style headings (alex-kim fixture)", () => {
    const raw = loadFixtureText("resumes/alex-kim-frontend.md");
    const sections = splitResumeIntoSections(raw);
    const exp = sections.find((s) => s.kind === "experience");
    const entries = parseExperienceSection(exp!);
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });
});
