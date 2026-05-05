"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResumeInput, type ResumeInputValue } from "./ResumeInput";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { ReportView } from "./ReportView";
import { runAnalysis, type AnalysisReport, type AnalysisStage } from "@/lib/pipeline";
import { MiniLmEmbedder, preloadMiniLm } from "@/lib/embeddings/transformers";
import type { EmbedderProgress } from "@/lib/embeddings/types";
import { DEMO_JD, DEMO_RESUME_MD } from "@/lib/demo-data";

type State =
  | { kind: "idle"; resume: ResumeInputValue | null; jd: string; error: string | null }
  | { kind: "running"; resume: ResumeInputValue; jd: string; stage: AnalysisStage; modelProgress: EmbedderProgress | null }
  | { kind: "done"; report: AnalysisReport }
  | { kind: "failed"; error: string; resume: ResumeInputValue | null; jd: string };

type Action =
  | { type: "set-resume"; value: ResumeInputValue | null }
  | { type: "set-jd"; value: string }
  | { type: "set-error"; message: string | null }
  | { type: "start"; resume: ResumeInputValue; jd: string }
  | { type: "stage"; stage: AnalysisStage }
  | { type: "model-progress"; progress: EmbedderProgress }
  | { type: "complete"; report: AnalysisReport }
  | { type: "fail"; message: string }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-resume":
      if (state.kind === "idle") return { ...state, resume: action.value, error: null };
      if (state.kind === "failed") return { kind: "idle", resume: action.value, jd: state.jd, error: null };
      return state;
    case "set-jd":
      if (state.kind === "idle") return { ...state, jd: action.value, error: null };
      if (state.kind === "failed") return { kind: "idle", resume: state.resume, jd: action.value, error: null };
      return state;
    case "set-error":
      if (state.kind === "idle") return { ...state, error: action.message };
      return state;
    case "start":
      return {
        kind: "running",
        resume: action.resume,
        jd: action.jd,
        stage: "parsing",
        modelProgress: null,
      };
    case "stage":
      if (state.kind !== "running") return state;
      return { ...state, stage: action.stage };
    case "model-progress":
      if (state.kind !== "running") return state;
      return { ...state, modelProgress: action.progress };
    case "complete":
      return { kind: "done", report: action.report };
    case "fail":
      if (state.kind === "running") {
        return {
          kind: "failed",
          error: action.message,
          resume: state.resume,
          jd: state.jd,
        };
      }
      return state;
    case "reset":
      return { kind: "idle", resume: null, jd: "", error: null };
  }
}

const initial: State = { kind: "idle", resume: null, jd: "", error: null };

interface Props {
  initialDemo?: boolean;
}

export function AnalyzerWorkflow({ initialDemo = false }: Props) {
  const [state, dispatch] = useReducer(reducer, initial);
  const demoLoadedRef = useRef(false);

  // Demo mode: load fictional resume + JD into state once on mount.
  useEffect(() => {
    if (!initialDemo || demoLoadedRef.current) return;
    demoLoadedRef.current = true;
    dispatch({
      type: "set-resume",
      value: {
        kind: "text",
        format: "md",
        content: DEMO_RESUME_MD,
        filename: "jane-doe-backend.md",
      },
    });
    dispatch({ type: "set-jd", value: DEMO_JD });
  }, [initialDemo]);

  // Optimistic preload: kick the model download as soon as both inputs are
  // present so when the user clicks Analyze, MiniLM is usually already in
  // memory. We swallow errors here because preloading is a perf nicety.
  const preloadStartedRef = useRef(false);
  useEffect(() => {
    if (state.kind !== "idle") return;
    if (!state.resume || state.jd.trim().length < 50) return;
    if (preloadStartedRef.current) return;
    preloadStartedRef.current = true;
    void preloadMiniLm().catch(() => {
      preloadStartedRef.current = false;
    });
  }, [state]);

  const start = useCallback(async () => {
    if (state.kind !== "idle" || !state.resume || state.jd.trim().length === 0) {
      return;
    }
    const resume = state.resume;
    const jd = state.jd;
    dispatch({ type: "start", resume, jd });
    try {
      const embedder = new MiniLmEmbedder((progress) => {
        dispatch({ type: "model-progress", progress });
      });
      const report = await runAnalysis({
        resume,
        jdText: jd,
        embedder,
        onStage: (stage) => dispatch({ type: "stage", stage }),
      });
      dispatch({ type: "complete", report });
    } catch (err) {
      console.error("[ATS Analyzer] analysis failed:", err);
      const detail =
        err instanceof Error
          ? `${err.message}${err.stack ? `\n\n${err.stack.split("\n").slice(0, 4).join("\n")}` : ""}`
          : "Unknown analysis failure.";
      dispatch({ type: "fail", message: detail });
    }
  }, [state]);

  if (state.kind === "done") {
    return (
      <ReportView
        report={state.report}
        onReset={() => dispatch({ type: "reset" })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ResumeInput
          value={state.kind === "idle" ? state.resume : state.kind === "failed" ? state.resume : null}
          onChange={(value) => dispatch({ type: "set-resume", value })}
          onError={(message) => dispatch({ type: "set-error", message })}
        />
        <JobDescriptionInput
          value={state.kind === "idle" ? state.jd : state.kind === "failed" ? state.jd : ""}
          onChange={(value) => dispatch({ type: "set-jd", value })}
          onError={(message) => dispatch({ type: "set-error", message })}
        />
      </div>

      {state.kind === "idle" && state.error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t read that file</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.kind === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">
              {state.error}
            </pre>
            <p className="mt-3 text-xs">
              Check the browser console for the full stack. Reload to try
              again — the model may have failed to download.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {state.kind === "running" && (
        <RunningPanel stage={state.stage} modelProgress={state.modelProgress} />
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
        <Button
          size="lg"
          onClick={start}
          disabled={
            state.kind !== "idle" ||
            !state.resume ||
            state.jd.trim().length === 0
          }
          className="disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
        >
          {state.kind === "running" ? "Analyzing…" : "Analyze"}
        </Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          First run downloads a ~25MB language model. Subsequent runs use
          the cached copy.
        </p>
      </div>
    </div>
  );
}

const STAGES: { key: AnalysisStage; label: string }[] = [
  { key: "parsing", label: "Parsing resume" },
  { key: "structuring", label: "Detecting sections and experience" },
  { key: "extracting-jd", label: "Extracting JD requirements" },
  { key: "scoring-deterministic", label: "Computing keyword and hard-requirement scores" },
  { key: "embedding", label: "Preparing semantic model" },
  { key: "scoring-semantic", label: "Computing semantic similarity" },
  { key: "done", label: "Done" },
];

function RunningPanel({
  stage,
  modelProgress,
}: {
  stage: AnalysisStage;
  modelProgress: EmbedderProgress | null;
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === stage);
  const pct = Math.round(((currentIdx + 1) / STAGES.length) * 100);
  const isModelDownloading = modelProgress?.kind === "downloading";

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Working
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {pct}%
          </p>
        </div>
        <p className="text-base text-foreground">
          {STAGES[currentIdx]?.label ?? "Working"}…
        </p>
        <Progress value={pct} className="h-1 [&>div]:bg-primary" />
        {isModelDownloading && (
          <ModelDownloadIndicator progress={modelProgress} />
        )}
        <p className="text-xs text-muted-foreground">
          All processing happens in your browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}

function ModelDownloadIndicator({
  progress,
}: {
  progress: Extract<EmbedderProgress, { kind: "downloading" }>;
}) {
  const total = progress.bytesTotal ?? 0;
  const loaded = progress.bytesLoaded;
  const pct = total > 0 ? Math.round((loaded / total) * 100) : null;
  return (
    <div className="rounded-sm border-l-2 border-primary bg-primary/5 px-3 py-2.5">
      <p className="text-xs text-foreground">
        Loading language model — one-time, ~25MB
      </p>
      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
        {pct !== null
          ? `${pct}% · ${formatMb(loaded)} / ${formatMb(total)}`
          : `${formatMb(loaded)} so far`}
      </p>
    </div>
  );
}

function formatMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)}MB`;
}
