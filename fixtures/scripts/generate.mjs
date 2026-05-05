/* eslint-disable */
// @ts-nocheck
/**
 * Generate PDF and DOCX fixtures from the source-of-truth `.txt` and `.md`
 * files in `fixtures/resumes/`. Run with:
 *
 *   pnpm fixtures:generate
 *
 * Each generated PDF/DOCX is recreated on every run, so do not hand-edit them.
 *
 * Special variants:
 * - `*.multicolumn.pdf` — same content, rendered in two columns to exercise
 *   the parseability multi-column detector.
 * - `*.image.pdf`       — placeholder image-based PDF (a single page with a
 *   filled rectangle and no text content) to exercise image-based detection.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIX_ROOT = path.resolve(__dirname, "..");
const RESUMES = path.join(FIX_ROOT, "resumes");

async function main() {
  const entries = await fs.readdir(RESUMES);
  const sources = entries.filter(
    (f) => (f.endsWith(".txt") || f.endsWith(".md")) && !f.includes(".generated."),
  );
  for (const file of sources) {
    const baseName = file.replace(/\.(txt|md)$/, "");
    const sourcePath = path.join(RESUMES, file);
    const raw = await fs.readFile(sourcePath, "utf8");
    const lines = raw.split(/\r?\n/);

    await writePdf(path.join(RESUMES, `${baseName}.pdf`), lines, {
      multiColumn: false,
    });
    await writePdf(
      path.join(RESUMES, `${baseName}.multicolumn.pdf`),
      lines,
      { multiColumn: true },
    );
    await writeImagePdf(path.join(RESUMES, `${baseName}.image.pdf`));
    await writeDocx(path.join(RESUMES, `${baseName}.docx`), lines);
    console.log(`  generated fixtures for ${baseName}`);
  }
}

function writePdf(outPath, lines, opts) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 54, size: "LETTER" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", async () => {
      try {
        await fs.writeFile(outPath, Buffer.concat(chunks));
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);

    if (opts.multiColumn) {
      const half = Math.ceil(lines.length / 2);
      const left = lines.slice(0, half);
      const right = lines.slice(half);
      const colWidth = (612 - 54 * 3) / 2;
      doc.fontSize(10);
      doc.text(left.join("\n"), 54, 54, { width: colWidth });
      doc.text(right.join("\n"), 54 + colWidth + 54, 54, { width: colWidth });
    } else {
      doc.fontSize(10);
      doc.text(lines.join("\n"), { width: 504 });
    }
    doc.end();
  });
}

/**
 * Write an "image-based" PDF: a single page with a filled rectangle and no
 * text content. pdfjs will return zero text items, which is exactly the
 * signal our image-based detector looks for.
 */
function writeImagePdf(outPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "LETTER" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", async () => {
      try {
        await fs.writeFile(outPath, Buffer.concat(chunks));
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);
    doc.rect(50, 50, 500, 700).fill("#cccccc");
    doc.end();
  });
}

async function writeDocx(outPath, lines) {
  const paragraphs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      paragraphs.push(new Paragraph({}));
      continue;
    }
    // Promote ALL-CAPS lines and markdown headings to a heading level so DOCX
    // structure mirrors the text version.
    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      paragraphs.push(
        new Paragraph({
          text,
          heading:
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
        }),
      );
      continue;
    }
    if (/^[A-Z][A-Z\s]{3,}$/.test(trimmed) && trimmed.length < 40) {
      paragraphs.push(
        new Paragraph({ text: trimmed, heading: HeadingLevel.HEADING_2 }),
      );
      continue;
    }
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(line)],
      }),
    );
  }
  const doc = new DocxDocument({
    sections: [{ properties: {}, children: paragraphs }],
  });
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outPath, buffer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
