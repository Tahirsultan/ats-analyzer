import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      {/* Hero — tightened so CTAs sit above the fold at 100% zoom on standard
          1366×768 laptops. The previous pt-20 + clamp(40,5.5vw,72px) headline
          pushed buttons below the fold on smaller viewports. */}
      <section className="grid gap-10 pt-12 pb-20 lg:grid-cols-[7fr_5fr] lg:items-end lg:gap-16">
        <div className="space-y-6">
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-px w-8 bg-muted-foreground/60" />
            <span>Free</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Open</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Transparent</span>
          </p>

          <h1 className="display text-foreground">
            <span className="block text-[clamp(36px,4.4vw,60px)] leading-[1.05]">
              Honest ATS feedback,
            </span>
            <span
              className="block text-[clamp(36px,4.4vw,60px)] leading-[1.05] italic"
              style={{ color: "var(--primary)" }}
            >
              with every score explained.
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[16px]">
            A free, open-source analyzer that compares your resume against
            any job description. Four independent scores — keyword match,
            semantic similarity, hard requirements, and parseability — every
            number traces back to its inputs.
          </p>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-1">
            <Link href="/analyze" className={buttonVariants({ size: "lg" })}>
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

        {/* Right-column editorial side note. Repositioned around method,
            not data handling — the design pass dropped the privacy framing. */}
        <aside className="hidden lg:block">
          <p className="border-l border-border pl-6 text-sm leading-relaxed text-muted-foreground">
            Paid tools charge subscriptions for analysis built on heuristics
            anyone can implement, and present scores with false precision
            behind a black box.
            <br />
            <span className="mt-3 block text-foreground">
              This one shows the math behind every score,{" "}
              <span className="italic" style={{ color: "var(--primary)" }}>
                for free.
              </span>
            </span>
          </p>
        </aside>
      </section>

      <hr className="border-border" />

      <section className="grid gap-y-12 gap-x-10 py-20 md:grid-cols-3">
        <Step
          n="01"
          title="Paste or upload"
          body="Drop in your resume — PDF, DOCX, TXT, or MD — and the job description. Both inputs feed the same scoring pipeline."
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

      {/* Methodology teaser — replaces the previous privacy section. */}
      <section className="grid gap-10 py-20 md:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Methodology
          </p>
          <h2 className="display text-3xl text-foreground">
            Every score, documented.
          </h2>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            No real ATS — paid or free — produces a single &ldquo;true&rdquo;
            score, because actual systems used by employers do not share a
            unified standard. This tool is honest about that.
          </p>
          <p>
            Each of the four dimensions is computed by a small, auditable
            function. Heuristics are labeled as heuristics. Weights and
            thresholds are documented, not implied. The composite score is
            always shown alongside its components — never alone.
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
