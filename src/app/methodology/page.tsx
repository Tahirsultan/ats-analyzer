import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the ATS Resume Analyzer scores resumes against job descriptions.",
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="mt-3 text-muted-foreground">
        This page documents exactly how every score is computed. Heuristics are
        labeled as heuristics. No real ATS — paid or free — produces a
        &ldquo;true&rdquo; score, because actual ATS systems used by employers
        do not share a unified scoring standard.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Four independent dimensions
        </h2>
        <p className="text-muted-foreground">
          Every analysis produces four scores, each computed by a separate,
          independently auditable pipeline. The composite score is a weighted
          average of these four — it is shown for convenience, never alone.
        </p>
        <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong className="text-foreground">Keyword Match</strong> —
            lexical overlap between JD keywords and your resume, weighted by
            must-have vs. nice-to-have markers.
          </li>
          <li>
            <strong className="text-foreground">Semantic Similarity</strong> —
            embedding-based similarity between JD requirements and your resume
            bullets, computed in your browser via a quantized MiniLM model.
          </li>
          <li>
            <strong className="text-foreground">Hard Requirements</strong> —
            pass/fail checklist for years of experience, degree, certifications,
            work authorization, and travel.
          </li>
          <li>
            <strong className="text-foreground">Parseability</strong> — penalty
            score for formatting choices that real ATS systems struggle with
            (multi-column layouts, image-based text, unusual headers).
          </li>
        </ol>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Phase 1 placeholder
        </h2>
        <p className="text-muted-foreground">
          Detailed formulas and worked examples are added in Phase 5 alongside
          the scoring engines themselves.
        </p>
      </section>

      <p className="mt-12 text-sm text-muted-foreground">
        <Link href="/" className="underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
