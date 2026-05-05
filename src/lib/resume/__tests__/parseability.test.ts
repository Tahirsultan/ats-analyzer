import { describe, expect, it } from "vitest";
import { computeParseability } from "../parseability";
import type { ParsedDocument } from "@/lib/parsing/types";
import type { ContactFields } from "../types";

function doc(signals: ParsedDocument["signals"] = {}): ParsedDocument {
  return { text: "", format: "pdf", signals };
}

const fullContact: ContactFields = {
  email: true,
  phone: true,
  linkedin: true,
  location: true,
};

describe("computeParseability", () => {
  it("returns 100 with no issues", () => {
    const { score, issues } = computeParseability({
      document: doc(),
      contactFields: fullContact,
      hasExperienceSection: true,
      hasAnyRecognizedSection: true,
    });
    expect(score).toBe(100);
    expect(issues).toEqual([]);
  });

  it("deducts the right penalty for image-based PDFs (high severity)", () => {
    const { score, issues } = computeParseability({
      document: doc({ imageBased: true }),
      contactFields: fullContact,
      hasExperienceSection: true,
      hasAnyRecognizedSection: true,
    });
    expect(issues.find((i) => i.code === "image-based-text")).toBeDefined();
    expect(score).toBe(40);
  });

  it("stacks penalties for multiple issues but never goes below 0", () => {
    const { score, issues } = computeParseability({
      document: doc({
        imageBased: true,
        multiColumn: true,
        repeatedHeaderFooterText: ["Confidential"],
      }),
      contactFields: { email: false, phone: false, linkedin: false, location: false },
      hasExperienceSection: false,
      hasAnyRecognizedSection: false,
    });
    expect(score).toBe(0);
    expect(issues.length).toBeGreaterThan(5);
  });

  it("deducts only the specific contact-field penalties for missing fields", () => {
    const { score } = computeParseability({
      document: doc(),
      contactFields: { email: true, phone: false, linkedin: true, location: true },
      hasExperienceSection: true,
      hasAnyRecognizedSection: true,
    });
    // Only -5 for missing phone
    expect(score).toBe(95);
  });

  it("includes penalty and severity metadata on every issue", () => {
    const { issues } = computeParseability({
      document: doc({ multiColumn: true }),
      contactFields: fullContact,
      hasExperienceSection: true,
      hasAnyRecognizedSection: true,
    });
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.code).toBe("multi-column-layout");
    expect(issue.severity).toBe("high");
    expect(issue.penalty).toBe(25);
    expect(issue.message).toMatch(/single-column/);
  });
});
