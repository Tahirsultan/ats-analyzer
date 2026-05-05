"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { AnalysisReport } from "@/lib/pipeline";
import { serializeReport } from "@/lib/export/json";
import { formatTextSummary } from "@/lib/export/text";

interface Props {
  report: AnalysisReport;
}

export function ExportActions({ report }: Props) {
  const [copied, setCopied] = useState(false);

  const downloadJson = () => {
    const data = serializeReport(report);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, "ats-report.json");
  };

  const downloadPdf = async () => {
    // Lazy-load jsPDF only when the user actually clicks export — keeps it
    // out of the initial analyze-page bundle (~150KB minified).
    const { renderReportPdf, downloadBlob } = await import("@/lib/export/pdf");
    const blob = renderReportPdf(report);
    downloadBlob(blob, "ats-report.pdf");
  };

  const copySummary = async () => {
    const text = formatTextSummary(report);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API blocked (insecure context, permissions): fall back
      // to a download instead so the user still gets the text.
      const blob = new Blob([text], { type: "text/plain" });
      triggerDownload(blob, "ats-summary.txt");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={downloadPdf}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Download PDF
      </button>
      <button
        onClick={downloadJson}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Download JSON
      </button>
      <button
        onClick={copySummary}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        {copied ? "Copied!" : "Copy summary"}
      </button>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
