import { describe, expect, it } from "vitest";
import { detectFormat, parseDocument } from "../index";
import { loadFixtureBuffer, loadFixtureText } from "@/test/fixtures";

describe("detectFormat", () => {
  it("recognizes by extension", () => {
    expect(detectFormat("resume.pdf")).toBe("pdf");
    expect(detectFormat("resume.docx")).toBe("docx");
    expect(detectFormat("resume.txt")).toBe("txt");
    expect(detectFormat("resume.md")).toBe("md");
  });

  it("recognizes by MIME type", () => {
    expect(detectFormat("blob", "application/pdf")).toBe("pdf");
    expect(
      detectFormat(
        "blob",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
    expect(detectFormat("blob", "text/plain")).toBe("txt");
    expect(detectFormat("blob", "text/markdown")).toBe("md");
  });

  it("returns null for unknown formats", () => {
    expect(detectFormat("file.xls")).toBeNull();
    expect(detectFormat("README", "application/octet-stream")).toBeNull();
  });
});

describe("parseDocument", () => {
  it("dispatches text formats with a string input", async () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const out = await parseDocument(raw, "txt");
    expect(out.format).toBe("txt");
    expect(out.text).toContain("Jane Doe");
  });

  it("dispatches markdown with a string input", async () => {
    const raw = loadFixtureText("resumes/alex-kim-frontend.md");
    const out = await parseDocument(raw, "md");
    expect(out.format).toBe("md");
    expect(out.text).toContain("Alex Kim");
  });

  it("dispatches DOCX with an ArrayBuffer input", async () => {
    const buf = loadFixtureBuffer("resumes/jane-doe-backend.docx");
    const out = await parseDocument(buf, "docx");
    expect(out.format).toBe("docx");
  });

  it("rejects mismatched input types", async () => {
    await expect(parseDocument("hello", "pdf")).rejects.toThrow(/ArrayBuffer/);
    await expect(
      parseDocument(new ArrayBuffer(0), "txt"),
    ).rejects.toThrow(/string/);
  });
});
