import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the ATS Resume Analyzer scores resumes against job descriptions.",
};

export default function MethodologyPage() {
  return (
    <article className="mx-auto w-full max-w-[68ch] px-6 pt-16 pb-20">
      <header className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Methodology
        </p>
        <h1 className="display text-4xl text-foreground">
          How every score is computed.
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Every score is produced by a small, auditable function. Heuristics
          are labeled as heuristics. No real ATS — paid or free — produces a
          single &ldquo;true&rdquo; score, because actual ATS systems used
          by employers do not share a unified scoring standard. What this
          tool does is surface the gaps a human reviewer would catch.
        </p>
      </header>

      <Section
        id="four-dimensions"
        eyebrow="Overview"
        title="Four independent dimensions"
      >
        <p>
          Each analysis produces four scores on a 0–100 scale, each from a
          separate pipeline. The composite is a weighted average shown for
          convenience — the dimensions are more informative.
        </p>
      </Section>

      <Section
        id="keyword-match"
        eyebrow="30% of composite"
        title="1. Keyword match"
      >
        <p>
          We extract keywords from the JD: title-case multi-word phrases,
          tech tokens with internal punctuation (Node.js, CI/CD, C++),
          mixed-case names (PostgreSQL, JavaScript), and mid-sentence
          capitalized terms. A curated stopword list filters boilerplate
          like &ldquo;experience&rdquo;, &ldquo;team&rdquo;, and
          &ldquo;qualification&rdquo;.
        </p>
        <p>
          Each keyword is weighted: must-have terms get 3×, nice-to-have
          terms get 1×. A frequency multiplier of{" "}
          <Mono>1 + log(frequency)</Mono> applies on top.
        </p>
        <p>
          Matching uses lemmatization (compromise) plus a Porter-style
          suffix stemmer so &ldquo;managed&rdquo;, &ldquo;managing&rdquo;,
          and &ldquo;manage&rdquo; collapse to a single root.
        </p>
        <Formula>
          Score = matched weight ÷ total weight × 100
        </Formula>
      </Section>

      <Section
        id="semantic"
        eyebrow="30% of composite"
        title="2. Semantic similarity"
      >
        <p>
          Each JD requirement and each resume bullet is embedded with{" "}
          <Mono>Xenova/all-MiniLM-L6-v2</Mono> via transformers.js. For each
          JD requirement, we find the single best resume bullet by cosine
          similarity.
        </p>
        <p>
          Cosine values are scaled linearly: 0.3 → 0, 0.8 → 100. The score
          is the mean across all requirements. Per-requirement coverage
          bands are reported alongside:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="font-medium text-foreground">Well</span> —
            cosine ≥ 0.7
          </li>
          <li>
            <span className="font-medium text-foreground">Weak</span> —
            cosine 0.5–0.7
          </li>
          <li>
            <span className="font-medium text-foreground">Uncovered</span> —
            cosine &lt; 0.5
          </li>
        </ul>
      </Section>

      <Section
        id="hard-requirements"
        eyebrow="25% of composite"
        title="3. Hard requirements"
      >
        <p>Pass/fail checklist over five concrete asks:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <span className="font-medium text-foreground">
              Years of experience
            </span>{" "}
            — highest <Mono>X+ years</Mono> in any must-have bullet.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Degree level + field
            </span>{" "}
            — for &ldquo;M.S. or Ph.D.&rdquo; we record the lowest
            acceptable level (master), not the highest. Two-letter
            abbreviations (B.S., M.A.) require periods to avoid colliding
            with state codes (&ldquo;Boston, MA&rdquo;).
          </li>
          <li>
            <span className="font-medium text-foreground">
              Certifications
            </span>{" "}
            — vendor-anchored regex (AWS Certified, Microsoft Certified,
            etc.).
          </li>
          <li>
            <span className="font-medium text-foreground">
              Work authorization
            </span>{" "}
            — surfaced for the user to confirm; passes by default.
          </li>
          <li>
            <span className="font-medium text-foreground">Travel</span> —
            extracts a percentage if specified; surfaced for confirmation.
          </li>
        </ul>
        <Formula>Score = passed ÷ total × 100</Formula>
      </Section>

      <Section
        id="parseability"
        eyebrow="15% of composite"
        title="4. Parseability"
      >
        <p>
          Starts at 100 and deducts per detected formatting issue:
        </p>
        <ul className="ml-5 list-disc space-y-1.5 font-mono text-[13px]">
          <li>Image-based PDF: −60</li>
          <li>Multi-column layout: −25</li>
          <li>Repeated header/footer text: −10</li>
          <li>No recognized sections: −30</li>
          <li>No experience section: −20</li>
          <li>Missing email: −15 · phone: −5 · location: −5</li>
        </ul>
        <p>
          Multi-column detection looks for a bimodal distribution of
          x-coordinates on each page using pdf.js item positioning.
          Image-based detection fires when total extracted text is
          implausibly low for a resume.
        </p>
      </Section>

      <Section id="composite" eyebrow="Aggregation" title="The composite">
        <Formula>
          composite = 0.30 · keyword + 0.30 · semantic + 0.25 · hard + 0.15 · parseability
        </Formula>
        <p>
          We always show this number alongside its components — never alone
          — because a single number hides where the gap is.
        </p>
      </Section>

      <Section id="limits" eyebrow="Honest scope" title="What this tool can and cannot do">
        <p>
          <span className="font-medium text-foreground">Can:</span> highlight
          specific keyword gaps, point at JD requirements your resume does
          not address, flag formatting choices that hurt ATS parsing,
          surface hard pass/fail asks (years, degree, certs).
        </p>
        <p>
          <span className="font-medium text-foreground">Cannot:</span> tell
          you whether you will get an interview. Predict a real ATS&apos;s
          output. Replace human review. Generate rewrites for you (planned
          for v2).
        </p>
      </Section>

      <Section id="open-source" eyebrow="Open source" title="Built in the open">
        <p>
          Every scoring function is small, deterministic, and unit-tested
          against the same fixtures the demo uses. Heuristics are documented
          inline next to the code that implements them. There is no model
          dashboard, no proprietary signal, no &ldquo;trust us.&rdquo;
        </p>
        <p>
          The full source is on GitHub:{" "}
          <a
            href="https://github.com/Tahirsultan/ats-analyzer"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-baseline gap-1 text-foreground"
          >
            <span className="border-b border-foreground/30 transition-colors group-hover:border-foreground">
              Tahirsultan/ats-analyzer
            </span>
            <ArrowUpRight
              className="h-3.5 w-3.5 self-center transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
          .
        </p>
      </Section>

      <p className="mt-16 text-sm text-muted-foreground">
        <Link
          href="/"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to home
        </Link>
      </p>
    </article>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24 space-y-4">
      <header className="space-y-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="group relative display text-2xl text-foreground">
          {title}
          <a
            href={`#${id}`}
            aria-label={`Link to ${title}`}
            className="ml-2 align-middle font-mono text-xs text-muted-foreground/0 transition-opacity hover:text-foreground group-hover:text-muted-foreground"
          >
            #
          </a>
        </h2>
      </header>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-muted/70 px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">
      {children}
    </code>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border-l-2 border-primary bg-primary/5 px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground">
      {children}
    </div>
  );
}
