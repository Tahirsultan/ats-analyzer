import { describe, expect, it } from "vitest";
import { detectJdHeading, splitJdIntoSections } from "../sections";
import { loadFixtureText } from "@/test/fixtures";

describe("detectJdHeading", () => {
  it("recognizes required-section variants", () => {
    expect(detectJdHeading("Required")).toBe("required");
    expect(detectJdHeading("Requirements")).toBe("required");
    expect(detectJdHeading("Required qualifications")).toBe("required");
    expect(detectJdHeading("Must Have")).toBe("required");
    expect(detectJdHeading("Minimum qualifications")).toBe("required");
  });

  it("recognizes preferred-section variants", () => {
    expect(detectJdHeading("Preferred")).toBe("preferred");
    expect(detectJdHeading("Preferred qualifications")).toBe("preferred");
    expect(detectJdHeading("Nice to have")).toBe("preferred");
    expect(detectJdHeading("Nice-to-have")).toBe("preferred");
    expect(detectJdHeading("Bonus")).toBe("preferred");
  });

  it("recognizes responsibilities-section variants", () => {
    expect(detectJdHeading("Responsibilities")).toBe("responsibilities");
    expect(detectJdHeading("What you'll do")).toBe("responsibilities");
    expect(detectJdHeading("The role")).toBe("responsibilities");
  });

  it("returns null for non-headings", () => {
    expect(detectJdHeading("We are looking for someone with passion")).toBeNull();
    expect(detectJdHeading("")).toBeNull();
  });
});

describe("splitJdIntoSections", () => {
  it("identifies required, preferred, responsibilities in the backend JD", () => {
    const raw = loadFixtureText("jds/backend-engineer-acme.txt");
    const sections = splitJdIntoSections(raw);
    const kinds = sections.map((s) => s.kind);
    expect(kinds).toContain("required");
    expect(kinds).toContain("preferred");
    expect(kinds).toContain("responsibilities");
  });

  it("handles informal headings (frontend JD: Must have, Nice to have)", () => {
    const raw = loadFixtureText("jds/frontend-engineer-novacart.txt");
    const sections = splitJdIntoSections(raw);
    const kinds = sections.map((s) => s.kind);
    expect(kinds).toContain("required");
    expect(kinds).toContain("preferred");
  });
});
