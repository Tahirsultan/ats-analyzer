import type { Metadata } from "next";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Analyze",
  description:
    "Compare your resume against a job description, all in your browser.",
};

export default function AnalyzePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <ServiceWorkerRegistrar />
      <h1 className="text-3xl font-semibold tracking-tight">Analyze</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Upload a resume and paste or upload a job description. Everything is
        processed locally in your browser — no files leave your device.
      </p>

      <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground">
        Phase 4 placeholder. The upload form and report UI arrive in Phase 5;
        parsers and scoring engines are already in place under{" "}
        <code>src/lib/</code>.
      </div>
    </div>
  );
}
