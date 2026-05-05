"use client";

import jsPDF from "jspdf";
import type { AnalysisReport } from "@/lib/pipeline";

const MARGIN = 50;
const LINE_HEIGHT = 14;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Render the report to a downloadable PDF using jsPDF with manual
 * layout. We deliberately avoid html2canvas — capturing recharts SVGs to
 * canvas is flaky across browsers, and a clean text-based PDF is smaller
 * and re-parseable. The PDF mirrors the on-screen report's structure but
 * is single-column, plain-text-friendly.
 */
export function renderReportPdf(report: AnalysisReport): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = MARGIN;

  function ensureRoom(neededLines: number) {
    if (y + neededLines * LINE_HEIGHT > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function writeHeading(text: string, fontSize = 16) {
    ensureRoom(2);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "bold");
    doc.text(text, MARGIN, y);
    y += fontSize + 4;
    doc.setFont("helvetica", "normal");
  }

  function writeBody(text: string, fontSize = 10) {
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of wrapped) {
      ensureRoom(1);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }
  }

  function writeSpacer(lines = 0.5) {
    y += LINE_HEIGHT * lines;
  }

  // Header
  writeHeading("ATS Resume Analyzer — Report", 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleString()} · runs entirely in-browser`,
    MARGIN,
    y,
  );
  y += LINE_HEIGHT;
  doc.setTextColor(0);
  writeSpacer(0.5);

  // Composite + dimensions
  writeHeading("Scores", 14);
  const { scores } = report;
  writeBody(`Composite: ${scores.composite}/100`, 12);
  writeBody(`  • Keyword match:       ${scores.keyword.score}/100  (30% weight)`);
  writeBody(`  • Semantic similarity: ${scores.semantic.score}/100  (30% weight)`);
  writeBody(`  • Hard requirements:   ${scores.hardRequirements.score}/100  (25% weight)`);
  writeBody(`  • Parseability:        ${scores.parseability.score}/100  (15% weight)`);
  writeSpacer();

  // Top missing keywords
  writeHeading("Top missing JD keywords", 12);
  const topMissing = [...scores.keyword.missing]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12);
  if (topMissing.length === 0) {
    writeBody("None — every keyword we extracted appears in your resume.");
  } else {
    for (const k of topMissing) {
      writeBody(
        `  • ${k.surface}  [${k.classification}, weight ${k.weight.toFixed(1)}]`,
      );
    }
  }
  writeSpacer();

  // Hard requirements
  writeHeading("Hard requirements", 12);
  if (scores.hardRequirements.requirements.length === 0) {
    writeBody("No hard requirements were extracted from this JD.");
  } else {
    for (const r of scores.hardRequirements.requirements) {
      writeBody(`  ${r.passed ? "✓" : "✗"}  ${r.detail}`);
    }
  }
  writeSpacer();

  // Semantic coverage
  writeHeading("Semantic coverage", 12);
  for (const c of scores.semantic.coverage) {
    const tag = c.band === "well" ? "WELL" : c.band === "weak" ? "WEAK" : "UNCOV";
    writeBody(`  [${tag}] ${c.requirement.text}`);
    if (c.bestMatch) {
      writeBody(
        `         ↳ best (cos ${c.bestMatch.similarity.toFixed(2)}): ${c.bestMatch.bullet.text}`,
        9,
      );
    }
  }
  writeSpacer();

  // Parseability issues
  if (scores.parseability.issues.length > 0) {
    writeHeading("Parseability issues", 12);
    for (const issue of scores.parseability.issues) {
      writeBody(`  • [${issue.severity}] ${issue.message}`);
    }
    writeSpacer();
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120);
  ensureRoom(2);
  writeBody(
    "No real ATS — paid or free — produces a single 'true' score, because real ATSes do not share a unified scoring standard. These four dimensions are heuristics that highlight specific gaps you can act on.",
    8,
  );

  return doc.output("blob");
}

/** Trigger a browser download of the given Blob with the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
