import { describe, expect, it } from "vitest";
import { detectHeadingKind, splitResumeIntoSections } from "../sections";
import { loadFixtureText } from "@/test/fixtures";

describe("detectHeadingKind", () => {
  it("recognizes canonical headings in any case", () => {
    expect(detectHeadingKind("EXPERIENCE")).toBe("experience");
    expect(detectHeadingKind("Experience")).toBe("experience");
    expect(detectHeadingKind("Work Experience")).toBe("experience");
    expect(detectHeadingKind("Employment History")).toBe("experience");
  });

  it("strips markdown markers", () => {
    expect(detectHeadingKind("## Skills")).toBe("skills");
    expect(detectHeadingKind("**Education**")).toBe("education");
  });

  it("returns null for non-headings", () => {
    expect(detectHeadingKind("This is a long sentence about my experience leading teams")).toBeNull();
    expect(detectHeadingKind("")).toBeNull();
  });
});

describe("splitResumeIntoSections", () => {
  it("splits the jane-doe txt fixture into all expected sections", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const sections = splitResumeIntoSections(raw);
    const kinds = sections.map((s) => s.kind);
    expect(kinds).toContain("header");
    expect(kinds).toContain("summary");
    expect(kinds).toContain("experience");
    expect(kinds).toContain("education");
    expect(kinds).toContain("skills");
  });

  it("captures the experience section content", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const sections = splitResumeIntoSections(raw);
    const experience = sections.find((s) => s.kind === "experience");
    expect(experience).toBeDefined();
    const body = experience!.lines.join("\n");
    expect(body).toContain("Acme Corp");
    expect(body).toContain("Helix Analytics");
    expect(body).toContain("NovaCart");
  });

  it("handles markdown headings (alex-kim fixture)", () => {
    const raw = loadFixtureText("resumes/alex-kim-frontend.md");
    const sections = splitResumeIntoSections(raw);
    const kinds = sections.map((s) => s.kind);
    expect(kinds).toContain("experience");
    expect(kinds).toContain("skills");
  });
});
