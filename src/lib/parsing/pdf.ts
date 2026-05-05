import type { ParsedDocument, ParseSignals } from "./types";
import { ParseError } from "./types";
import { normalizeWhitespace } from "./text";

/**
 * Threshold below which a PDF is considered image-based. A typical 1-page
 * resume has ~250-500 words; below 30 means the page is almost certainly an
 * image scan with no extractable text.
 */
const IMAGE_BASED_WORD_THRESHOLD = 30;

/**
 * Minimum gap between two x-clusters (in PDF user units, ~points) for the
 * page to count as multi-column. 80 points ≈ 1.1 inches, comfortably wider
 * than typical inter-paragraph spacing within a single column.
 */
const MULTI_COLUMN_GAP = 80;

/**
 * Minimum share of items that must fall in EACH cluster for multi-column
 * detection to fire. Stops single-column resumes with stray right-aligned
 * dates from being misclassified.
 */
const MULTI_COLUMN_MIN_SHARE = 0.2;

/** Vertical band (fraction of page height) considered "header" or "footer". */
const HEADER_FOOTER_BAND = 0.08;

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  pageHeight: number;
}

/**
 * pdf.js worker URL pinned to the same patch version as the npm package
 * (see package.json). Loaded from jsDelivr's npm mirror — same-origin
 * caching via service worker, ~1MB compressed. Pinning the version means
 * the worker matches the main library's serialization format exactly.
 */
const PDFJS_WORKER_URL =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/legacy/build/pdf.worker.mjs";

/**
 * Parse a PDF ArrayBuffer to plain text plus structural signals. Runs in any
 * environment that supports pdfjs-dist's legacy build (browser, jsdom, Node).
 */
export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedDocument> {
  const pdfjs = await loadPdfJs();
  // pdfjs needs `GlobalWorkerOptions.workerSrc` set before the first
  // `getDocument` call. The worker is a separate file the library spawns
  // a Web Worker from. In tests we wire it up via vitest.setup.ts; in the
  // browser we point at jsDelivr at the matching version.
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
    }).promise;
  } catch (err) {
    throw new ParseError(
      `pdfjs failed to open PDF: ${(err as Error).message}`,
      "pdf",
    );
  }

  const items: PdfTextItem[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const item of content.items) {
      // pdf.js TextItem has `str`, `transform`, `width`, `height`. The
      // transform matrix's [4],[5] are absolute x,y in PDF user units.
      if (!("str" in item)) continue;
      const transform = (item as { transform: number[] }).transform;
      const tx = transform[4];
      const ty = transform[5];
      if (tx === undefined || ty === undefined) continue;
      const width = (item as { width?: number }).width ?? 0;
      const height = (item as { height?: number }).height ?? 0;
      items.push({
        str: item.str,
        x: tx,
        y: ty,
        width,
        height,
        pageIndex: i - 1,
        pageHeight: viewport.height,
      });
    }
  }

  const signals = computeSignals(items, doc.numPages);
  const text = stitchText(items);

  return {
    text: normalizeWhitespace(text),
    format: "pdf",
    signals,
  };
}

async function loadPdfJs() {
  // Legacy build is the one that works without a Web Worker.
  return await import("pdfjs-dist/legacy/build/pdf.mjs");
}

/**
 * Walk text items in reading order (top-to-bottom, left-to-right) and join
 * them into paragraphs. Items on the same line (similar y) get joined with a
 * space; new lines insert a single newline; large vertical gaps insert a
 * blank line so paragraph boundaries survive.
 */
function stitchText(items: PdfTextItem[]): string {
  if (items.length === 0) return "";

  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!byPage.has(item.pageIndex)) byPage.set(item.pageIndex, []);
    byPage.get(item.pageIndex)!.push(item);
  }

  const out: string[] = [];
  for (const pageItems of byPage.values()) {
    // pdf.js gives items roughly in reading order but y descending (top of
    // page is high). Sort by y desc then x asc for safety.
    pageItems.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: PdfTextItem[][] = [];
    let currentLine: PdfTextItem[] = [];
    let lastY: number | null = null;
    for (const item of pageItems) {
      if (lastY === null || Math.abs(item.y - lastY) <= 2) {
        currentLine.push(item);
      } else {
        if (currentLine.length) lines.push(currentLine);
        currentLine = [item];
      }
      lastY = item.y;
    }
    if (currentLine.length) lines.push(currentLine);

    let prevY: number | null = null;
    const pageOut: string[] = [];
    for (const line of lines) {
      const firstItem = line[0];
      if (!firstItem) continue;
      const gap = prevY === null ? 0 : prevY - firstItem.y;
      const lineText = line
        .map((it) => it.str)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (!lineText) {
        prevY = firstItem.y;
        continue;
      }
      // Heuristic: a gap larger than ~1.6× the line height implies a blank
      // line between paragraphs.
      const lineHeight = firstItem.height || 12;
      if (gap > lineHeight * 1.6 && pageOut.length > 0) {
        pageOut.push("");
      }
      pageOut.push(lineText);
      prevY = firstItem.y;
    }
    out.push(pageOut.join("\n"));
  }
  return out.join("\n\n");
}

/**
 * Compute structural signals from the raw item stream:
 * - multiColumn: bimodal x-distribution on at least one page
 * - imageBased: total extracted word count is implausibly low
 * - repeatedHeaderFooterText: short strings that appear in the top/bottom
 *   band of two or more pages
 */
function computeSignals(items: PdfTextItem[], pageCount: number): ParseSignals {
  const totalWords = items
    .map((i) => i.str)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const imageBased = totalWords < IMAGE_BASED_WORD_THRESHOLD;

  let multiColumn = false;
  const pageGroups = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    if (!pageGroups.has(item.pageIndex)) pageGroups.set(item.pageIndex, []);
    pageGroups.get(item.pageIndex)!.push(item);
  }
  for (const pageItems of pageGroups.values()) {
    if (detectMultiColumn(pageItems)) {
      multiColumn = true;
      break;
    }
  }

  const repeatedHeaderFooterText = detectRepeatedHeaderFooter(pageGroups);

  return {
    multiColumn,
    imageBased,
    pageCount,
    repeatedHeaderFooterText,
  };
}

/**
 * Cluster the x-coordinates of items on a page using a 1D pass: sort, then
 * split clusters wherever the gap between consecutive x's exceeds
 * `MULTI_COLUMN_GAP`. Multi-column iff there are 2+ clusters that each hold
 * at least `MULTI_COLUMN_MIN_SHARE` of items.
 */
function detectMultiColumn(items: PdfTextItem[]): boolean {
  if (items.length < 20) return false;
  const xs = items.map((i) => i.x).sort((a, b) => a - b);
  const clusters: number[][] = [];
  let current: number[] = [];
  let last: number | null = null;
  for (const x of xs) {
    if (last === null || x - last > MULTI_COLUMN_GAP) {
      if (current.length) clusters.push(current);
      current = [x];
    } else {
      current.push(x);
    }
    last = x;
  }
  if (current.length) clusters.push(current);
  if (clusters.length < 2) return false;
  const total = items.length;
  const big = clusters.filter((c) => c.length / total >= MULTI_COLUMN_MIN_SHARE);
  return big.length >= 2;
}

function detectRepeatedHeaderFooter(
  pages: Map<number, PdfTextItem[]>,
): string[] {
  if (pages.size < 2) return [];
  const perPageBandText = new Map<number, Set<string>>();
  for (const [pageIndex, pageItems] of pages.entries()) {
    if (!pageItems.length) continue;
    const firstItem = pageItems[0];
    if (!firstItem) continue;
    const pageHeight = firstItem.pageHeight;
    const bandSize = pageHeight * HEADER_FOOTER_BAND;
    const bandStrings = new Set<string>();
    for (const item of pageItems) {
      const inHeader = item.y > pageHeight - bandSize;
      const inFooter = item.y < bandSize;
      if (!inHeader && !inFooter) continue;
      const trimmed = item.str.trim();
      if (trimmed.length >= 3) bandStrings.add(trimmed);
    }
    perPageBandText.set(pageIndex, bandStrings);
  }
  const counts = new Map<string, number>();
  for (const set of perPageBandText.values()) {
    for (const s of set) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const repeated: string[] = [];
  for (const [s, count] of counts.entries()) {
    if (count >= 2) repeated.push(s);
  }
  return repeated.sort();
}
