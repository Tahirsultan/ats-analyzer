/**
 * Output of every document parser. Downstream analyzers consume this shape and
 * never read the raw file again.
 */
export interface ParsedDocument {
  /** Plain text with paragraphs separated by `\n\n`. */
  text: string;
  /** Document format we parsed from. */
  format: DocumentFormat;
  /** Format-specific signals — populated only by parsers that can detect them. */
  signals: ParseSignals;
}

export type DocumentFormat = "pdf" | "docx" | "txt" | "md";

export interface ParseSignals {
  /** True if the PDF has two or more clearly distinct columns of text. */
  multiColumn?: boolean;
  /**
   * True when a PDF yields very little extractable text — usually means the
   * resume is a scanned image and ATSes will fail to parse it.
   */
  imageBased?: boolean;
  /** Number of pages (PDF only). */
  pageCount?: number;
  /**
   * Items found in header/footer regions across multiple pages. Empty array
   * if none detected.
   */
  repeatedHeaderFooterText?: string[];
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly format: DocumentFormat | "unknown",
  ) {
    super(message);
    this.name = "ParseError";
  }
}
