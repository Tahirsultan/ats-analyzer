import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "../analyze";
import { loadFixtureText } from "@/test/fixtures";

describe("analyzeJobDescription", () => {
  it("extracts requirements from the backend JD with right classifications", () => {
    const raw = loadFixtureText("jds/backend-engineer-acme.txt");
    const out = analyzeJobDescription(raw);
    expect(out.requirements.length).toBeGreaterThan(5);

    const mustHaves = out.requirements.filter(
      (r) => r.classification === "must-have",
    );
    const niceToHaves = out.requirements.filter(
      (r) => r.classification === "nice-to-have",
    );
    expect(mustHaves.length).toBeGreaterThan(3);
    expect(niceToHaves.length).toBeGreaterThan(0);

    expect(
      mustHaves.some((r) => /5\+ years/.test(r.text)),
    ).toBe(true);
    expect(
      mustHaves.some((r) => /PostgreSQL/i.test(r.text)),
    ).toBe(true);
    expect(
      niceToHaves.some((r) => /Kubernetes/i.test(r.text)),
    ).toBe(true);
  });

  it("classifies frontend JD's mixed must/nice content correctly", () => {
    const raw = loadFixtureText("jds/frontend-engineer-novacart.txt");
    const out = analyzeJobDescription(raw);
    const mustHaves = out.requirements.filter(
      (r) => r.classification === "must-have",
    );
    const niceToHaves = out.requirements.filter(
      (r) => r.classification === "nice-to-have",
    );
    expect(mustHaves.some((r) => /TypeScript/i.test(r.text))).toBe(true);
    expect(niceToHaves.some((r) => /Storybook/i.test(r.text))).toBe(true);
  });

  it("handles the data-scientist JD with certification-required markers", () => {
    const raw = loadFixtureText("jds/data-scientist-helix.txt");
    const out = analyzeJobDescription(raw);
    const mustHaves = out.requirements.filter(
      (r) => r.classification === "must-have",
    );
    expect(mustHaves.some((r) => /AWS Certified/.test(r.text))).toBe(true);
    expect(mustHaves.some((r) => /M\.S\.|Ph\.D\./.test(r.text))).toBe(true);
  });
});
