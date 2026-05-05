import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <section className="flex flex-col items-start gap-6 py-12">
        <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
          Free · Private · Transparent
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Honest ATS feedback,
          <br />
          without uploading your resume anywhere.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A free, open-source resume analyzer that runs entirely in your
          browser. Compare your resume against any job description and get a
          multi-dimensional readiness report — keyword match, semantic
          similarity, hard requirements, and parseability — all explainable.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/analyze" className={buttonVariants({ size: "lg" })}>
            Analyze a resume
          </Link>
          <Link
            href="/analyze?demo=1"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Try the demo
          </Link>
        </div>
      </section>

      <section className="grid gap-6 border-t border-border py-12 md:grid-cols-3">
        <Step
          n="1"
          title="Paste or upload"
          body="Drop in your resume (PDF, DOCX, TXT) and the job description. Files are read in your browser — never sent to a server."
        />
        <Step
          n="2"
          title="See the math"
          body="Four independent scores show how your resume matches the JD. Every number traces back to its inputs — no black-box AI rating."
        />
        <Step
          n="3"
          title="Improve, then re-run"
          body="Get a prioritized list of missing keywords, uncovered requirements, and rewording opportunities. Edit and re-analyze."
        />
      </section>

      <section className="rounded-2xl border border-border bg-muted/40 p-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          How privacy works
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Most ATS tools require you to upload personal documents to their
          servers. This one doesn&apos;t. Parsing, NLP, and even the embedding
          model all run inside your browser via WebAssembly. There is no
          backend, no database, no analytics on document content. The only
          network request is the one-time download of the open-source language
          model on first analysis.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <Link href="/methodology" className="underline">
            Read the full methodology →
          </Link>
        </p>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-mono text-muted-foreground">{n}</span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
