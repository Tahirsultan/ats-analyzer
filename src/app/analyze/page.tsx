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
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Analyze</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Upload a resume and paste or upload a job description. Everything
          is processed locally in your browser — no files leave your device.
        </p>
        <div className="mt-10">
          <AnalyzerWorkflow initialDemo={demo} />
        </div>
      </div>
    </MobileGate>
  );
}
