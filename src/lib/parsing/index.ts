import type { DocumentFormat, ParsedDocument } from "./types";
import { ParseError } from "./types";
import { parseDocx } from "./docx";
import { parsePdf } from "./pdf";
import { parseMarkdown, parseText } from "./text";

export type { DocumentFormat, ParsedDocument, ParseSignals } from "./types";
export { ParseError } from "./types";

/**
 * Detect format from filename + MIME type. Falls back to extension when MIME
 * is missing (browsers sometimes serve PDFs as `application/octet-stream`).
 */
export function detectFormat(
  filename: string,
  mimeType?: string,
): DocumentFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return "docx";
    }
    if (mimeType === "text/markdown") return "md";
    if (mimeType.startsWith("text/")) return "txt";
  }
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
      return "docx";
    case "md":
    case "markdown":
      return "md";
    case "txt":
    case "text":
      return "txt";
    default:
      return null;
  }
}

/**
 * Single entry point for the parsing layer. Pass either an ArrayBuffer
 * (binary formats) or a string (text formats) along with the detected format.
 * Mismatches throw a ParseError immediately.
 */
export async function parseDocument(
  input: ArrayBuffer | string,
  format: DocumentFormat,
): Promise<ParsedDocument> {
  if (format === "txt" || format === "md") {
    if (typeof input !== "string") {
      throw new ParseError(
        `Format ${format} expects a string, received ${typeof input}`,
        format,
      );
    }
    return format === "md" ? parseMarkdown(input) : parseText(input, format);
  }
  if (typeof input === "string") {
    throw new ParseError(
      `Format ${format} expects an ArrayBuffer, received a string`,
      format,
    );
  }
  if (format === "docx") return parseDocx(input);
  if (format === "pdf") return parsePdf(input);
  throw new ParseError(`Unsupported format: ${format}`, format);
}
