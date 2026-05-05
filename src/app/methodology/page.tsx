import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the ATS Resume Analyzer scores resumes against job descriptions.",
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="mt-3 text-muted-foreground">
        Every score is computed by a small, auditable function. Heuristics
        are labeled as heuristics. No real ATS — paid or free — produces a
        single &ldquo;true&rdquo; score, because actual ATS systems used by
        employers do not share a unified scoring standard. What this tool
        does is surface the gaps a human reviewer would catch.
      </p>

      <Section title="The four dimensions">
        <p>
          Each analysis produces four scores on a 0–100 scale, each from a
          separate pipeline. The composite is a weighted average shown for
          convenience — the dimensions are more informative.
        </p>
      </Section>

      <Section title="1. Keyword match (30% of composite)">
        <p>
          We extract keywords from the JD: title-case multi-word phrases,
          tech tokens with internal punctuation (Node.js, CI/CD, C++),
          mixed-case names (PostgreSQL, JavaScript), and mid-sentence
          capitalized terms. A curated stopword list filters boilerplate
          (&ldquo;experience&rdquo;, &ldquo;team&rdquo;,
          &ldquo;qualification&rdquo;).
        </p>
        <p>
          Each keyword is weighted: must-have terms get 3×, nice-to-have get
          1×. A frequency multiplier (<code>1 + log(frequency)</code>)
          applies on top.
        </p>
        <p>
          Matching uses lemmatization (compromise) plus a Porter-style
          stemmer so &ldquo;managed&rdquo;, &ldquo;managing&rdquo;, and
          &ldquo;manage&rdquo; collapse to a single root.{" "}
          <em>
            Score = matched weight ÷ total weight × 100
          </em>
          .
        </p>
      </Section>

      <Section title="2. Semantic similarity (30% of composite)">
        <p>
          Each JD requirement and each resume bullet is embedded with{" "}
          <code>Xenova/all-MiniLM-L6-v2</code> running in your browser via
          transformers.js. For each JD requirement, we find the single best
          resume bullet by cosine similarity.
        </p>
        <p>
          Cosine values are scaled linearly: 0.3 maps to 0, 0.8 maps to 100.
          The score is the mean across requirements. Per-requirement
          coverage bands are reported alongside: <strong>well</strong> (≥
          0.7), <strong>weak</strong> (0.5–0.7), <strong>uncovered</strong>{" "}
          (&lt; 0.5).
        </p>
      </Section>

      <Section title="3. Hard requirements (25% of composite)">
        <p>Pass/fail checklist over five concrete asks:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Years of experience</strong> — highest{" "}
            <code>X+ years</code> in any must-have bullet.
          </li>
          <li>
            <strong>Degree level + field</strong> — for
            &ldquo;M.S. or Ph.D.&rdquo; we record the lowest acceptable
            level (master), not the highest. Two-letter abbreviations (B.S.,
            M.A.) require periods to avoid colliding with state codes
            (&ldquo;Boston, MA&rdquo;).
          </li>
          <li>
            <strong>Certifications</strong> — vendor-anchored regex (AWS
            Certified, Microsoft Certified, etc.).
          </li>
          <li>
            <strong>Work authorization</strong> — surfaced for the user to
            confirm; passes by default.
          </li>
          <li>
            <strong>Travel</strong> — extracts a percentage if specified;
            surfaced for confirmation.
          </li>
        </ul>
        <p>
          <em>Score = passed ÷ total × 100.</em>
        </p>
      </Section>

      <Section title="4. Parseability (15% of composite)">
        <p>
          Starts at 100 and deducts per detected formatting issue. The
          deductions are:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Image-based PDF: −60</li>
          <li>Multi-column layout: −25</li>
          <li>Repeated header/footer text: −10</li>
          <li>No recognized sections: −30</li>
          <li>No experience section: −20</li>
          <li>Missing email: −15 · phone: −5 · location: −5</li>
        </ul>
        <p>
          Multi-column detection looks for a bimodal distribution of
          x-coordinates on each page (using pdf.js item positioning).
          Image-based detection fires when total extracted text is
          implausibly low for a resume.
        </p>
      </Section>

      <Section title="The composite">
        <p>
          <code>composite = 0.30 × keyword + 0.30 × semantic + 0.25 × hard + 0.15 × parseability</code>
        </p>
        <p>
          We always show this number alongside its components — never alone
          — because a single number hides where the gap is.
        </p>
      </Section>

      <Section title="What this tool can and cannot do">
        <p>
          <strong>Can:</strong> highlight specific keyword gaps, point at JD
          requirements your resume does not address, flag formatting choices
          that hurt ATS parsing, surface hard pass/fail asks (years, degree,
          certs).
        </p>
        <p>
          <strong>Cannot:</strong> tell you whether you will get an
          interview. Predict a real ATS&apos;s output. Replace human review.
          Generate rewrites for you (planned for v2).
        </p>
      </Section>

      <Section title="Privacy">
        <p>
          Resumes and job descriptions never leave your browser. Parsing
          (pdf.js, mammoth), NLP (compromise, custom heuristics), and the
          embedding model (transformers.js + WebAssembly) all run locally.
          The only network requests beyond static assets are the one-time
          download of the open-source MiniLM model (~25MB), cached via a
          service worker.
        </p>
        <p>
          The full source is on GitHub:{" "}
          <a
            href="https://github.com/Tahirsultan/ats-analyzer"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Tahirsultan/ats-analyzer
          </a>
          .
        </p>
      </Section>

      <p className="mt-12 text-sm text-muted-foreground">
        <Link href="/" className="underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
