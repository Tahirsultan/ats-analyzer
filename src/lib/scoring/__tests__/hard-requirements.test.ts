import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { analyzeResumeStructure } from "@/lib/resume/structure";
import { parseText } from "@/lib/parsing/text";
import {
  checkHardRequirements,
  extractHardRequirements,
} from "../hard-requirements";
import { loadFixtureText } from "@/test/fixtures";

describe("extractHardRequirements", () => {
  it("extracts 5+ years requirement from the backend JD", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const reqs = extractHardRequirements(jd);
    expect(reqs.minYears?.years).toBe(5);
  });

  it("extracts bachelor's degree requirement from the backend JD", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const reqs = extractHardRequirements(jd);
    expect(reqs.degree?.minLevel).toBe("bachelor");
    expect(reqs.degree?.fields).toContain("computer science");
  });

  it("extracts master's-or-PhD requirement from the data-scientist JD", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/data-scientist-helix.txt"),
    );
    const reqs = extractHardRequirements(jd);
    // Should find at minimum "master" because both M.S. and Ph.D. are listed
    // and we record the lowest required level.
    expect(["master", "phd"]).toContain(reqs.degree?.minLevel);
    expect(reqs.degree?.fields).toContain("statistics");
  });

  it("extracts the AWS certification requirement", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/data-scientist-helix.txt"),
    );
    const reqs = extractHardRequirements(jd);
    expect(reqs.certifications.length).toBeGreaterThan(0);
    expect(
      reqs.certifications.some((c) => /AWS/.test(c.keyword)),
    ).toBe(true);
  });

  it("extracts work-authorization requirement", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const reqs = extractHardRequirements(jd);
    expect(reqs.workAuth).not.toBeNull();
  });

  it("extracts travel percentage if specified", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/data-scientist-helix.txt"),
    );
    const reqs = extractHardRequirements(jd);
    expect(reqs.travel?.maxPercent).toBe(15);
  });
});

describe("checkHardRequirements", () => {
  it("passes years and degree for jane-doe vs backend JD", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/backend-engineer-acme.txt"),
    );
    const reqs = extractHardRequirements(jd);
    const resume = analyzeResumeStructure(
      parseText(loadFixtureText("resumes/jane-doe-backend.txt")),
    );
    const result = checkHardRequirements(resume, reqs);
    const yearsCheck = result.requirements.find(
      (r) => r.code === "years-of-experience",
    );
    expect(yearsCheck?.passed).toBe(true);
    const degreeLevel = result.requirements.find(
      (r) => r.code === "degree-level",
    );
    expect(degreeLevel?.passed).toBe(true);
    const degreeField = result.requirements.find(
      (r) => r.code === "degree-field",
    );
    expect(degreeField?.passed).toBe(true);
  });

  it("fails the master's degree check for jane-doe vs data-scientist JD", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/data-scientist-helix.txt"),
    );
    const reqs = extractHardRequirements(jd);
    const resume = analyzeResumeStructure(
      parseText(loadFixtureText("resumes/jane-doe-backend.txt")),
    );
    const result = checkHardRequirements(resume, reqs);
    const degreeLevel = result.requirements.find(
      (r) => r.code === "degree-level",
    );
    expect(degreeLevel?.passed).toBe(false);
  });

  it("priya-rao passes the data-scientist JD's degree and field checks", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/data-scientist-helix.txt"),
    );
    const reqs = extractHardRequirements(jd);
    const resume = analyzeResumeStructure(
      parseText(loadFixtureText("resumes/priya-rao-data-scientist.txt")),
    );
    const result = checkHardRequirements(resume, reqs);
    expect(
      result.requirements.find((r) => r.code === "degree-level")?.passed,
    ).toBe(true);
    expect(
      result.requirements.find((r) => r.code === "degree-field")?.passed,
    ).toBe(true);
  });

  it("returns 100 with no requirements", () => {
    const resume = analyzeResumeStructure(parseText("anything"));
    const result = checkHardRequirements(resume, {
      minYears: null,
      degree: null,
      certifications: [],
      workAuth: null,
      travel: null,
    });
    expect(result.score).toBe(100);
    expect(result.requirements).toEqual([]);
  });
});
