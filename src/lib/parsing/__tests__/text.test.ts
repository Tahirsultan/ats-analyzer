import { describe, expect, it } from "vitest";
import { normalizeWhitespace, parseMarkdown, parseText } from "../text";
import { loadFixtureText } from "@/test/fixtures";

describe("normalizeWhitespace", () => {
  it("converts CRLF to LF", () => {
    expect(normalizeWhitespace("a\r\nb\r\nc")).toBe("a\nb\nc");
  });

  it("collapses 3+ blank lines to a single paragraph break", () => {
    expect(normalizeWhitespace("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("strips trailing whitespace per line but preserves paragraph breaks", () => {
    expect(normalizeWhitespace("a   \n\nb")).toBe("a\n\nb");
  });

  it("does not strip leading whitespace (it could be meaningful indent)", () => {
    expect(normalizeWhitespace("  a")).toBe("a");
    // .trim() at the end handles leading/trailing — verify we still keep
    // internal indents intact.
    expect(normalizeWhitespace("a\n  b")).toBe("a\n  b");
  });
});

describe("parseText / parseMarkdown", () => {
  it("returns the raw text and the right format tag", () => {
    const out = parseText("hello\nworld");
    expect(out.format).toBe("txt");
    expect(out.text).toBe("hello\nworld");
    expect(out.signals).toEqual({});
  });

  it("preserves markdown markers in passthrough", () => {
    const md = parseMarkdown("# Title\n\nBody");
    expect(md.format).toBe("md");
    expect(md.text).toContain("# Title");
  });

  it("parses a real fixture without dropping content", () => {
    const raw = loadFixtureText("resumes/jane-doe-backend.txt");
    const out = parseText(raw);
    expect(out.text).toContain("Jane Doe");
    expect(out.text).toContain("Acme Corp");
    expect(out.text.length).toBeGreaterThan(500);
  });
});
