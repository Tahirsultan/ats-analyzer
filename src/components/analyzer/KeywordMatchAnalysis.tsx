"use client";

import { useState } from "react";
import type { JdKeyword, KeywordMatchResult, MatchedKeyword } from "@/lib/scoring/types";
import type { JdSectionKind } from "@/lib/jd/types";

interface Props {
  result: KeywordMatchResult;
  /** Optional total extracted count (matched + missing) — passed for the
      stats line so we don't recompute on every render. */
  extractedCount?: number;
}

const DEFAULT_VISIBLE_MISSING = 15;

/**
 * Full Keyword Match analysis surface. Replaces the old top-N bar chart.
 * Four blocks:
 *
 *   A. Mono summary stats (extracted / matched / missing / score)
 *   B. Missing-keyword table (all of them, sorted by weight desc, with
 *      tier, weight, JD frequency, source-section columns)
 *   C. Collapsible matched-keyword table including a foundIn snippet
 *      from the resume so users can verify the match isn't a false
 *      positive
 *   D. Collapsible "How this score was computed" math breakdown
 */
export function KeywordMatchAnalysis({ result, extractedCount }: Props) {
  const total = extractedCount ?? result.matched.length + result.missing.length;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Keyword match · full analysis
        </p>
        <h3 className="display text-xl text-foreground">
          Every keyword, traced.
        </h3>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Each keyword extracted from the JD is shown with its tier, weight,
          frequency, and source section. Matched terms include the resume
          excerpt that triggered the match — verify, don&apos;t trust.
        </p>
      </header>

      {/* Block A: stats */}
      <StatsLine
        extracted={total}
        matched={result.matched.length}
        missing={result.missing.length}
        score={result.score}
      />

      {/* Block B: missing table */}
      <MissingTable missing={result.missing} />

      {/* Block C: matched (collapsible) */}
      <MatchedDetails matched={result.matched} />

      {/* Block D: math (collapsible) */}
      <MathDetails result={result} />
    </section>
  );
}

function StatsLine({
  extracted,
  matched,
  missing,
  score,
}: {
  extracted: number;
  matched: number;
  missing: number;
  score: number;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card px-5 py-3">
      <div className="flex min-w-fit items-baseline gap-x-8 whitespace-nowrap font-mono text-[12px] tabular-nums text-muted-foreground">
        <span>
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Extracted{" "}
          </span>
          <span className="text-foreground">{extracted}</span>
          <span className="ml-1 text-[11px]">keywords</span>
        </span>
        <span>
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Matched{" "}
          </span>
          <span className="text-score-strong">{matched}</span>
        </span>
        <span>
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Missing{" "}
          </span>
          <span className="text-score-poor">{missing}</span>
        </span>
        <span>
          <span className="text-[10px] uppercase tracking-[0.18em]">
            Score{" "}
          </span>
          <span className="text-foreground">{score}</span>
          <span className="ml-1 text-[11px]">/ 100</span>
        </span>
      </div>
    </div>
  );
}

function MissingTable({ missing }: { missing: JdKeyword[] }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...missing].sort((a, b) => b.weight - a.weight);
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE_MISSING);
  const overflow = sorted.length - visible.length;

  if (sorted.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
        No missing keywords — every JD keyword was found in the resume.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <header className="border-b border-border px-5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Missing keywords ({sorted.length})
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-5 py-2 font-normal">Keyword</th>
              <th className="px-3 py-2 font-normal">Tier</th>
              <th className="px-3 py-2 text-right font-normal">Weight</th>
              <th className="px-3 py-2 text-right font-normal">Freq</th>
              <th className="px-5 py-2 font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((k, i) => (
              <KeywordRow key={`${k.lemma}-${i}`} kw={k} />
            ))}
          </tbody>
        </table>
      </div>
      {overflow > 0 && (
        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Show {overflow} more
          </button>
        </div>
      )}
    </div>
  );
}

function KeywordRow({ kw }: { kw: JdKeyword }) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="px-5 py-3 align-top">
        <span className="text-foreground">{kw.surface}</span>
        {kw.aliases.length > 0 && (
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            ({kw.aliases.join(", ")})
          </span>
        )}
      </td>
      <td className="px-3 py-3 align-top">
        <TierPill tier={kw.tier} />
      </td>
      <td className="px-3 py-3 text-right align-top font-mono tabular-nums text-foreground">
        {kw.weight.toFixed(2)}
      </td>
      <td className="px-3 py-3 text-right align-top font-mono tabular-nums text-muted-foreground">
        {kw.frequency}
      </td>
      <td className="px-5 py-3 align-top text-xs text-muted-foreground">
        {sourceLabel(kw.sourceSection)}
      </td>
    </tr>
  );
}

function MatchedDetails({ matched }: { matched: MatchedKeyword[] }) {
  if (matched.length === 0) return null;
  const sorted = [...matched].sort((a, b) => b.weight - a.weight);
  return (
    <details className="group rounded-md border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Matched keywords ({sorted.length})</span>
        <span className="font-sans text-xs normal-case tracking-normal text-muted-foreground transition-transform group-open:rotate-180">
          ⌃
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-5 py-2 font-normal">Keyword</th>
              <th className="px-3 py-2 font-normal">Tier</th>
              <th className="px-3 py-2 text-right font-normal">Weight</th>
              <th className="px-5 py-2 font-normal">Found in resume</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((k, i) => (
              <tr
                key={`${k.lemma}-${i}`}
                className="border-b border-border/60 last:border-b-0"
              >
                <td className="px-5 py-3 align-top">
                  <span className="text-foreground">{k.surface}</span>
                  {k.aliases.length > 0 && (
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      ({k.aliases.join(", ")})
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <TierPill tier={k.tier} />
                </td>
                <td className="px-3 py-3 text-right align-top font-mono tabular-nums text-foreground">
                  {k.weight.toFixed(2)}
                </td>
                <td className="px-5 py-3 align-top text-xs leading-relaxed text-muted-foreground">
                  &ldquo;{k.foundIn}&rdquo;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function MathDetails({ result }: { result: KeywordMatchResult }) {
  const matched = result.matchedWeight;
  const total = result.totalWeight;
  const ratio = total === 0 ? 1 : matched / total;
  const rawScore = ratio * 100;
  return (
    <details className="group rounded-md border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>How this score was computed</span>
        <span className="font-sans text-xs normal-case tracking-normal text-muted-foreground transition-transform group-open:rotate-180">
          ⌃
        </span>
      </summary>
      <div className="space-y-4 border-t border-border px-5 py-4">
        <div className="rounded-sm border-l-2 border-primary bg-primary/5 px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground">
          <div className="flex justify-between">
            <span>Total weight in JD</span>
            <span className="tabular-nums">{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Matched weight</span>
            <span className="tabular-nums">{matched.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span>Raw match ratio</span>
            <span className="tabular-nums">
              {matched.toFixed(2)} / {total.toFixed(2)} = {ratio.toFixed(3)}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-primary/20 pt-2">
            <span>Final score</span>
            <span className="tabular-nums text-foreground">
              {rawScore.toFixed(1)} → {result.score}
            </span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each keyword is weighted by tier (must-have ×3, nice-to-have ×1,
          body ×1) and a frequency multiplier of{" "}
          <code className="rounded-sm bg-muted/70 px-1 font-mono text-[11px]">
            1 + log(frequency)
          </code>
          . Score is matched weight divided by total weight, scaled to 100.
        </p>
      </div>
    </details>
  );
}

function TierPill({ tier }: { tier: JdKeyword["tier"] }) {
  const styles =
    tier === "must-have"
      ? "border-primary/30 text-primary"
      : tier === "nice-to-have"
        ? "border-border text-muted-foreground"
        : "border-border/60 text-muted-foreground";
  const label =
    tier === "must-have"
      ? "Must-have"
      : tier === "nice-to-have"
        ? "Nice-to-have"
        : "Body";
  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        styles,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function sourceLabel(kind: JdSectionKind): string {
  switch (kind) {
    case "required":
      return "Required Qualifications";
    case "preferred":
      return "Preferred Qualifications";
    case "responsibilities":
      return "Responsibilities";
    case "intro":
      return "Role Description";
    case "logistics":
      return "Logistics";
    default:
      return "Other";
  }
}
