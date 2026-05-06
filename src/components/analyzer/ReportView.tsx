"use client";

import { ScoreRadar } from "./ScoreRadar";
import { KeywordMatchAnalysis } from "./KeywordMatchAnalysis";
import { ExportActions } from "./ExportActions";
import type { AnalysisReport } from "@/lib/pipeline";
import { COMPOSITE_WEIGHTS } from "@/lib/pipeline";
import {
  BAND_TEXT_CLASS,
  bandFor,
  compositeInterpretation,
} from "@/lib/scoring/bands";

interface Props {
  report: AnalysisReport;
  onReset: () => void;
}

export function ReportView({ report, onReset }: Props) {
  const { scores } = report;
  const compositeBand = bandFor(scores.composite);

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Report
          </p>
          <h2 className="display text-3xl text-foreground">Your analysis</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Four independent scores, computed transparently. The composite is
            shown for convenience — the dimensions below are more informative.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <ExportActions report={report} />
          <button
            onClick={onReset}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Run a new analysis
          </button>
        </div>
      </header>

      {/* Composite + radar */}
      <section className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-start">
        <CompositeBlock composite={scores.composite} />
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Dimensions
          </p>
          <div className="mt-2">
            <ScoreRadar
              keyword={scores.keyword.score}
              semantic={scores.semantic.score}
              hardRequirements={scores.hardRequirements.score}
              parseability={scores.parseability.score}
            />
          </div>
        </div>
      </section>

      {/* Four dimension cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DimensionCard
          title="Keyword match"
          score={scores.keyword.score}
          weight={COMPOSITE_WEIGHTS.keyword}
          subtitle={`${scores.keyword.matched.length} of ${
            scores.keyword.matched.length + scores.keyword.missing.length
          } JD keywords found`}
        />
        <DimensionCard
          title="Semantic similarity"
          score={scores.semantic.score}
          weight={COMPOSITE_WEIGHTS.semantic}
          subtitle={`${
            scores.semantic.coverage.filter((c) => c.band === "well").length
          } well · ${
            scores.semantic.coverage.filter((c) => c.band === "weak").length
          } weak · ${
            scores.semantic.coverage.filter((c) => c.band === "uncovered").length
          } uncovered`}
        />
        <DimensionCard
          title="Hard requirements"
          score={scores.hardRequirements.score}
          weight={COMPOSITE_WEIGHTS.hardRequirements}
          subtitle={`${
            scores.hardRequirements.requirements.filter((r) => r.passed).length
          } of ${scores.hardRequirements.requirements.length} pass`}
        />
        <DimensionCard
          title="Parseability"
          score={scores.parseability.score}
          weight={COMPOSITE_WEIGHTS.parseability}
          subtitle={
            scores.parseability.issues.length === 0
              ? "No issues detected"
              : `${scores.parseability.issues.length} issue${
                  scores.parseability.issues.length === 1 ? "" : "s"
                }`
          }
        />
      </section>

      {/* Keyword Match — Full Analysis (replaces top-N bar chart). */}
      <KeywordMatchAnalysis result={scores.keyword} />

      {/* Hard requirements checklist */}
      <ReportSection
        title="Hard requirements"
        eyebrow="Pass / fail"
        description="Concrete, traceable asks extracted from the must-have section of the JD."
      >
        {scores.hardRequirements.requirements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hard requirements were extracted from this JD.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {scores.hardRequirements.requirements.map((req, i) => (
              <li
                key={`${req.code}-${i}`}
                className="flex items-start gap-4 py-4"
              >
                <PassFailDot passed={req.passed} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-relaxed text-foreground">
                    {req.detail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Source: {truncate(req.description, 130)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {req.code.replace(/-/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ReportSection>

      {/* Semantic coverage */}
      <ReportSection
        title="Semantic coverage"
        eyebrow="Per requirement"
        description="For each JD requirement we found the resume bullet with the highest semantic similarity. Coverage bands: well (cosine ≥ 0.7), weak (0.5–0.7), uncovered (< 0.5)."
      >
        <ul className="divide-y divide-border">
          {scores.semantic.coverage.map((c, i) => (
            <li key={i} className="space-y-2 py-4">
              <div className="flex items-start gap-3">
                <CoveragePill band={c.band} />
                <p className="flex-1 text-sm leading-relaxed text-foreground">
                  {c.requirement.text}
                </p>
              </div>
              {c.bestMatch && (
                <p className="ml-[5.25rem] text-xs leading-relaxed text-muted-foreground">
                  Best match{" "}
                  <span className="font-mono text-[11px]">
                    cos {c.bestMatch.similarity.toFixed(2)}
                  </span>
                  {" — "}
                  <span className="text-foreground">
                    {truncate(c.bestMatch.bullet.text, 140)}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </ReportSection>

      {/* Parseability issues */}
      {scores.parseability.issues.length > 0 && (
        <ReportSection
          title="Parseability issues"
          eyebrow="Formatting"
          description="Each issue deducts a fixed number of points from a starting score of 100. Severities are ranked by how much real ATS software typically struggles with each."
        >
          <ul className="space-y-4">
            {scores.parseability.issues.map((issue) => (
              <li
                key={issue.code}
                className="flex items-start gap-4 rounded-md border border-border bg-card p-4"
              >
                <SeverityDot severity={issue.severity} />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-foreground">
                    {issue.message}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    −{issue.penalty} points · {issue.severity} severity
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      <p className="border-t border-border pt-8 text-xs leading-relaxed text-muted-foreground">
        No real ATS — paid or free — produces a single &ldquo;true&rdquo;
        score, because real ATSes do not share a unified scoring standard.
        These four dimensions are heuristics that highlight specific gaps
        you can act on.
      </p>
    </div>
  );

  function CompositeBlock({ composite }: { composite: number }) {
    const bandTextCls = BAND_TEXT_CLASS[compositeBand];
    return (
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Composite score
        </p>
        <div className="mt-3 flex items-baseline gap-4">
          <span
            className={`display tabular-nums leading-none ${bandTextCls}`}
            style={{ fontSize: "clamp(96px, 13vw, 144px)" }}
          >
            {composite}
          </span>
          <span className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">
            / 100
          </span>
        </div>
        <p className="mt-4 max-w-md text-base leading-relaxed text-foreground">
          {compositeInterpretation(composite)}
        </p>
        <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
          Keyword 30% · Semantic 30% · Hard requirements 25% · Parseability 15%
        </p>
      </div>
    );
  }
}

function DimensionCard({
  title,
  score,
  weight,
  subtitle,
}: {
  title: string;
  score: number;
  weight: number;
  subtitle: string;
}) {
  const band = bandFor(score);
  // Top accent stripe in the band color — uses raw CSS-var reference so we
  // don't have to invent a new Tailwind utility for every band.
  const stripeColor = `var(--score-${band})`;
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-card p-5">
      <span
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: stripeColor }}
        aria-hidden
      />
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        {title}
      </p>
      <p
        className={`mt-3 display tabular-nums text-5xl leading-none ${BAND_TEXT_CLASS[band]}`}
      >
        {score}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {Math.round(weight * 100)}% weight
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}

function ReportSection({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="display text-xl text-foreground">{title}</h3>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function PassFailDot({ passed }: { passed: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        passed
          ? "bg-score-strong/12 text-score-strong"
          : "bg-score-poor/12 text-score-poor"
      }`}
      aria-label={passed ? "passed" : "failed"}
    >
      {passed ? "✓" : "✗"}
    </span>
  );
}

function CoveragePill({ band }: { band: "well" | "weak" | "uncovered" }) {
  const styles =
    band === "well"
      ? "bg-score-strong/10 text-score-strong"
      : band === "weak"
        ? "bg-score-decent/12 text-score-decent"
        : "bg-score-poor/12 text-score-poor";
  const label = band === "well" ? "Well" : band === "weak" ? "Weak" : "Uncovered";
  return (
    <span
      className={`mt-0.5 inline-flex h-5 w-[4.75rem] shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium uppercase tracking-[0.12em] ${styles}`}
    >
      {label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: "high" | "medium" | "low" }) {
  const color =
    severity === "high"
      ? "bg-score-poor"
      : severity === "medium"
        ? "bg-score-decent"
        : "bg-muted-foreground";
  return (
    <span
      className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
      aria-label={`${severity} severity`}
    />
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
