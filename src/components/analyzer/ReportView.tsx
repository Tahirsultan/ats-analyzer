"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScoreRadar } from "./ScoreRadar";
import { MissingKeywordsBar } from "./MissingKeywordsBar";
import type { AnalysisReport } from "@/lib/pipeline";
import { COMPOSITE_WEIGHTS } from "@/lib/pipeline";

interface Props {
  report: AnalysisReport;
  onReset: () => void;
}

export function ReportView({ report, onReset }: Props) {
  const { scores } = report;
  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Four independent scores. The composite is shown for convenience —
            the dimensions below it are more informative.
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Run a new analysis
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <CompositeCard composite={scores.composite} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar
              keyword={scores.keyword.score}
              semantic={scores.semantic.score}
              hardRequirements={scores.hardRequirements.score}
              parseability={scores.parseability.score}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DimensionCard
          title="Keyword Match"
          score={scores.keyword.score}
          weight={COMPOSITE_WEIGHTS.keyword}
          subtitle={`${scores.keyword.matched.length} of ${
            scores.keyword.matched.length + scores.keyword.missing.length
          } JD keywords found`}
        />
        <DimensionCard
          title="Semantic Similarity"
          score={scores.semantic.score}
          weight={COMPOSITE_WEIGHTS.semantic}
          subtitle={`${
            scores.semantic.coverage.filter((c) => c.band === "well").length
          } well-covered · ${
            scores.semantic.coverage.filter((c) => c.band === "weak").length
          } weakly · ${
            scores.semantic.coverage.filter((c) => c.band === "uncovered").length
          } uncovered`}
        />
        <DimensionCard
          title="Hard Requirements"
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top missing JD keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Sorted by weight (must-have keywords carry 3× nice-to-have).
            Adding these to your resume — only where they accurately describe
            your work — is the highest-leverage edit.
          </p>
          <MissingKeywordsBar missing={scores.keyword.missing} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hard requirements checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {scores.hardRequirements.requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hard requirements were extracted from this JD.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {scores.hardRequirements.requirements.map((req, i) => (
                <li
                  key={`${req.code}-${i}`}
                  className="flex items-start gap-3 py-3"
                >
                  <span
                    className={[
                      "mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      req.passed
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-destructive/15 text-destructive",
                    ].join(" ")}
                  >
                    {req.passed ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">{req.detail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Source: {truncate(req.description, 110)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {req.code.replace(/-/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semantic coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            For each JD requirement we found the resume bullet with the
            highest semantic similarity. Coverage bands: well (cosine ≥ 0.7),
            weak (0.5–0.7), uncovered (&lt; 0.5).
          </p>
          <ul className="divide-y divide-border">
            {scores.semantic.coverage.map((c, i) => (
              <li key={i} className="space-y-2 py-3">
                <div className="flex items-start gap-3">
                  <CoverageBadge band={c.band} />
                  <p className="flex-1 text-sm">{c.requirement.text}</p>
                </div>
                {c.bestMatch && (
                  <p className="ml-9 text-xs text-muted-foreground">
                    Best match (cosine {c.bestMatch.similarity.toFixed(2)}):{" "}
                    <span className="text-foreground">
                      {truncate(c.bestMatch.bullet.text, 140)}
                    </span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {scores.parseability.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parseability issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {scores.parseability.issues.map((issue) => (
                <li key={issue.code} className="flex items-start gap-3">
                  <SeverityDot severity={issue.severity} />
                  <div>
                    <p className="text-sm">{issue.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      −{issue.penalty} points · {issue.severity} severity
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        No real ATS — paid or free — produces a single &ldquo;true&rdquo;
        score, because real ATSes do not share a unified scoring standard.
        These four dimensions are heuristics that highlight specific gaps you
        can act on.
      </p>
    </div>
  );
}

function CompositeCard({ composite }: { composite: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Composite</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-6xl font-semibold tabular-nums">{composite}</p>
        <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Weighted average of the four dimensions. Always shown alongside its
          components — never alone — because a single number hides where the
          gap is.
        </p>
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li>Keyword 30% · Semantic 30%</li>
          <li>Hard requirements 25% · Parseability 15%</li>
        </ul>
      </CardContent>
    </Card>
  );
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{score}</p>
        <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-wider">
          {Math.round(weight * 100)}% weight
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function CoverageBadge({ band }: { band: "well" | "weak" | "uncovered" }) {
  const styles =
    band === "well"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : band === "weak"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-destructive/15 text-destructive";
  const label =
    band === "well" ? "Well" : band === "weak" ? "Weak" : "Uncovered";
  return (
    <span
      className={[
        "mt-0.5 inline-flex h-6 w-16 shrink-0 items-center justify-center rounded-full text-[10px] font-medium uppercase tracking-wider",
        styles,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: "high" | "medium" | "low" }) {
  const color =
    severity === "high"
      ? "bg-destructive"
      : severity === "medium"
        ? "bg-amber-500"
        : "bg-muted-foreground";
  return (
    <span
      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
      aria-label={`${severity} severity`}
    />
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
