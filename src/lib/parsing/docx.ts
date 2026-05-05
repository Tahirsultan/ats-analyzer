import mammoth from "mammoth";
import type { ParsedDocument } from "./types";
import { ParseError } from "./types";
import { normalizeWhitespace } from "./text";

/**
 * Parse a `.docx` ArrayBuffer to plain text using mammoth. Mammoth's
 * `extractRawText` flattens the document into paragraphs separated by `\n`,
 * which we then normalize.
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<ParsedDocument> {
  let result;
  try {
    // Mammoth's `buffer` option accepts an ArrayBuffer, Uint8Array, or Node
    // Buffer — JSZip.loadAsync handles all three. Despite the README, there
    // is no `arrayBuffer` option; mammoth/lib/unzip.js only checks
    // `path`, `buffer`, `file`.
    result = await mammoth.extractRawText({
      buffer: buffer as unknown as Buffer,
    });
  } catch (err) {
    throw new ParseError(
      `mammoth failed to read DOCX: ${(err as Error).message}`,
      "docx",
    );
  }

  return {
    text: normalizeWhitespace(result.value),
    format: "docx",
    signals: {},
  };
}
