import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      {/* Hero */}
      <section className="grid gap-12 pt-20 pb-24 lg:grid-cols-[7fr_5fr] lg:items-end lg:gap-16">
        <div className="space-y-8">
          {/* Eyebrow — replaces the dated "FREE · PRIVATE · TRANSPARENT" pill */}
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-px w-8 bg-muted-foreground/60" />
            <span>Free</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Private</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Transparent</span>
          </p>

          <h1 className="display text-foreground">
            <span className="block text-[clamp(40px,5.5vw,72px)] leading-[1.05]">
              Honest ATS feedback,
            </span>
            <span
              className="block text-[clamp(40px,5.5vw,72px)] leading-[1.05] italic"
              style={{ color: "var(--primary)" }}
            >
              without uploading your resume.
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">
            A free, open-source analyzer that runs entirely in your browser.
            Compare your resume against any job description and get a
            multi-dimensional readiness report — keyword match, semantic
            similarity, hard requirements, and parseability — all explainable.
          </p>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-4 pt-2">
            <Link
              href="/analyze"
              className={buttonVariants({ size: "lg" })}
            >
              Analyze a resume
            </Link>
            <Link
              href="/analyze?demo=1"
              className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="border-b border-transparent transition-colors group-hover:border-foreground">
                Or try the demo
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* Right column — small editorial side note keeps the hero composed */}
        <aside className="hidden lg:block">
          <p className="border-l border-border pl-6 text-sm leading-relaxed text-muted-foreground">
            Paid tools charge subscriptions for analysis built on heuristics
            anyone can implement, and require you to upload personal documents
            to third-party servers.
            <br />
            <span className="mt-3 block text-foreground">
              This one does the same analysis, transparently, locally,{" "}
              <span className="italic" style={{ color: "var(--primary)" }}>
                for free.
              </span>
            </span>
          </p>
        </aside>
      </section>

      {/* Hairline divider between hero and steps */}
      <hr className="border-border" />

      {/* Three steps */}
      <section className="grid gap-y-12 gap-x-10 py-20 md:grid-cols-3">
        <Step
          n="01"
          title="Paste or upload"
          body="Drop in your resume (PDF, DOCX, TXT, MD) and the job description. Files are read in your browser — never sent to a server."
        />
        <Step
          n="02"
          title="See the math"
          body="Four independent scores show how your resume matches the JD. Every number traces back to its inputs — no black-box AI rating."
        />
        <Step
          n="03"
          title="Improve, then re-run"
          body="Get a prioritized list of missing keywords, uncovered requirements, and rewording opportunities. Edit and re-analyze in seconds."
        />
      </section>

      <hr className="border-border" />

      {/* Privacy */}
      <section className="grid gap-10 py-20 md:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Privacy
          </p>
          <h2 className="display text-3xl text-foreground">
            How it stays private.
          </h2>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            Most ATS tools require you to upload personal documents to their
            servers. This one doesn&apos;t. Parsing, NLP, and the embedding
            model all run inside your browser via WebAssembly.
          </p>
          <p>
            There is no backend, no database, no analytics on document
            content. The only network request beyond static assets is the
            one-time download of the open-source language model on first
            analysis.
          </p>
          <p>
            <Link
              href="/methodology"
              className="group inline-flex items-center gap-1.5 text-sm text-foreground"
            >
              <span className="border-b border-foreground/30 transition-colors group-hover:border-foreground">
                Read the full methodology
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
        {n}
      </p>
      <h3 className="display text-xl text-foreground">{title}</h3>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
