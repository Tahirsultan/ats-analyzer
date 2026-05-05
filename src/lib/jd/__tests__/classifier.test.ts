import { describe, expect, it } from "vitest";
import { classifyRequirement } from "../classifier";
import type { JdSection } from "../types";

const required: JdSection = { kind: "required", heading: "Required", lines: [] };
const preferred: JdSection = { kind: "preferred", heading: "Preferred", lines: [] };
const intro: JdSection = { kind: "intro", heading: "", lines: [] };

describe("classifyRequirement", () => {
  it("defaults required-section bullets to must-have", () => {
    const r = classifyRequirement(
      "5+ years of professional engineering experience",
      required,
    );
    expect(r.classification).toBe("must-have");
  });

  it("defaults preferred-section bullets to nice-to-have", () => {
    const r = classifyRequirement("Experience with Kubernetes", preferred);
    expect(r.classification).toBe("nice-to-have");
  });

  it("local 'preferred' marker overrides required-section default", () => {
    const r = classifyRequirement(
      "Experience with Rust is preferred",
      required,
    );
    expect(r.classification).toBe("nice-to-have");
    expect(r.reason).toBe("marker-nice");
  });

  it("local 'must have' marker overrides preferred-section default", () => {
    const r = classifyRequirement(
      "Must have at least 3 years of TypeScript",
      preferred,
    );
    expect(r.classification).toBe("must-have");
    expect(r.reason).toBe("marker-must");
  });

  it("intro/other sections default to nice-to-have", () => {
    const r = classifyRequirement(
      "Strong communication skills are valuable",
      intro,
    );
    expect(r.classification).toBe("nice-to-have");
  });
});
