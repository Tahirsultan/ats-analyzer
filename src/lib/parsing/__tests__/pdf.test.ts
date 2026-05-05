import { describe, expect, it } from "vitest";
import { parsePdf } from "../pdf";
import { loadFixtureBuffer } from "@/test/fixtures";

describe("parsePdf", () => {
  it("extracts text from a single-column PDF fixture", async () => {
    const buf = loadFixtureBuffer("resumes/jane-doe-backend.pdf");
    const out = await parsePdf(buf);
    expect(out.format).toBe("pdf");
    expect(out.text).toContain("Jane Doe");
    expect(out.text).toContain("Acme Corp");
    expect(out.signals.imageBased).toBe(false);
    expect(out.signals.multiColumn).toBe(false);
    expect(out.signals.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("flags a multi-column PDF as multi-column", async () => {
    const buf = loadFixtureBuffer("resumes/jane-doe-backend.multicolumn.pdf");
    const out = await parsePdf(buf);
    expect(out.signals.multiColumn).toBe(true);
  });

  it("flags an image-based PDF as image-based with low text yield", async () => {
    const buf = loadFixtureBuffer("resumes/jane-doe-backend.image.pdf");
    const out = await parsePdf(buf);
    expect(out.signals.imageBased).toBe(true);
    expect(out.text.trim().length).toBeLessThan(50);
  });

  it("rejects non-PDF input with a ParseError", async () => {
    const garbage = new TextEncoder().encode("not a pdf").buffer as ArrayBuffer;
    await expect(parsePdf(garbage)).rejects.toThrow(/pdfjs/);
  });
});
