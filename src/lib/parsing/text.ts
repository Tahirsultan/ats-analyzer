import type { DocumentFormat, ParsedDocument } from "./types";

/**
 * Plain-text and Markdown passthrough. We intentionally do not strip Markdown
 * formatting — downstream lemmatization and section detection cope with the
 * markers fine, and stripping risks losing structural cues like `## Experience`.
 */
export function parseText(raw: string, format: DocumentFormat = "txt"): ParsedDocument {
  return {
    text: normalizeWhitespace(raw),
    format,
    signals: {},
  };
}

export function parseMarkdown(raw: string): ParsedDocument {
  return parseText(raw, "md");
}

/**
 * Collapse runs of trailing whitespace and CRLF line endings, but preserve
 * paragraph breaks (blank lines). Section detection later relies on blank
 * lines as a signal.
 */
export function normalizeWhitespace(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
