import { describe, expect, it } from "vitest";
import { parseDocx } from "../docx";
import { loadFixtureBuffer } from "@/test/fixtures";

describe("parseDocx", () => {
  it("extracts text from the jane-doe DOCX fixture", async () => {
    const buf = loadFixtureBuffer("resumes/jane-doe-backend.docx");
    const out = await parseDocx(buf);
    expect(out.format).toBe("docx");
    expect(out.text).toContain("Jane Doe");
    expect(out.text).toContain("Acme Corp");
    expect(out.text).toContain("PostgreSQL");
  });

  it("preserves paragraph structure (blank lines remain)", async () => {
    const buf = loadFixtureBuffer("resumes/jane-doe-backend.docx");
    const out = await parseDocx(buf);
    expect(out.text.split("\n\n").length).toBeGreaterThan(3);
  });

  it("rejects malformed DOCX with a ParseError", async () => {
    const garbage = new TextEncoder().encode("not a docx").buffer as ArrayBuffer;
    await expect(parseDocx(garbage)).rejects.toThrow(/mammoth/);
  });
});
