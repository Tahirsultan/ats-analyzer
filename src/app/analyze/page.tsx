"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { MobileGate } from "@/components/MobileGate";
import { AnalyzerWorkflow } from "@/components/analyzer/AnalyzerWorkflow";

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzePageInner />
    </Suspense>
  );
}

function AnalyzePageInner() {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  return (
    <MobileGate>
      <ServiceWorkerRegistrar />
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-8">
        <header className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {demo ? "Demo · Fictional resume + JD" : "New analysis"}
          </p>
          <h1 className="display text-3xl text-foreground">Analyze</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Upload a resume and paste or upload a job description. Everything
            is processed locally in your browser — nothing is uploaded.
          </p>
        </header>
        <div className="mt-12">
          {/*
            Key by the demo flag so navigating between /analyze and
            /analyze?demo=1 forces a fresh component instance. Without this
            the reducer's state (including the loaded demo resume + JD)
            persists across the URL change, leaking demo content into a
            user's "I want to analyze my own resume" flow.
          */}
          <AnalyzerWorkflow
            key={demo ? "demo" : "fresh"}
            initialDemo={demo}
          />
        </div>
      </div>
    </MobileGate>
  );
}
