/**
 * Keyword alias dictionary — auditable, conservative, single source of
 * truth.
 *
 * Each entry is a synonym group: a canonical phrase plus a list of
 * accepted variants. Aliases apply ONLY to the lexical Keyword Match
 * dimension; they are not used for semantic similarity (the embedding
 * model handles that already) or hard requirements (which has its own
 * degree/title logic).
 *
 * Maintenance rules:
 *   1. Each alias must be defensible with one sentence: "everyone in
 *      <domain> uses these interchangeably."
 *   2. If you're not 80%+ confident an alias is correct, leave it out.
 *      Better to miss equivalences than over-match.
 *   3. Don't alias verbs (manage ↔ lead inflates almost every body
 *      match). Don't alias single-word ↔ multi-word equivalences where
 *      the multi-word adds meaningful specificity.
 *
 * Notes on entries deliberately omitted vs the original spec:
 *   - "configuration management ↔ Terraform": Terraform is IaC, not
 *     config management. Ansible/Chef/Puppet are config management.
 *     The categories are distinct; conflating them produces false
 *     positives on JDs asking for one but not the other.
 *   - "computer vision ↔ CV": "CV" almost always means curriculum
 *     vitae in resume context. Aliasing produces false positives
 *     against the candidate's own document.
 */

export type AliasGroup = {
  /** Display label — used as the JdKeyword.surface when this group fires. */
  canonical: string;
  /** Equivalent surface forms. Match is bidirectional. */
  variants: string[];
  /** Domain restriction. `unknown` = always apply. */
  domain: AliasDomain;
};

export type AliasDomain =
  | "unknown"
  | "tech"
  | "marketing"
  | "product"
  | "sales";

/**
 * The full dictionary. Order: canonical first, then variants. Both
 * canonical and variants are matched case-insensitively at runtime.
 */
export const ALIAS_GROUPS: AliasGroup[] = [
  // ────────── Software / engineering ──────────
  {
    canonical: "ETL pipelines",
    variants: ["ETL workflows", "ETL jobs", "data pipelines", "ingestion pipelines"],
    domain: "tech",
  },
  { canonical: "unit tests", variants: ["unit testing", "unit-tested"], domain: "tech" },
  { canonical: "integration tests", variants: ["integration testing"], domain: "tech" },
  { canonical: "test-driven development", variants: ["TDD"], domain: "tech" },
  { canonical: "continuous integration", variants: ["CI", "CI/CD"], domain: "tech" },
  { canonical: "continuous deployment", variants: ["CD", "CI/CD"], domain: "tech" },
  { canonical: "version control", variants: ["Git", "source control"], domain: "tech" },
  { canonical: "code review", variants: ["code reviews", "peer review"], domain: "tech" },
  {
    canonical: "RESTful API",
    variants: ["REST API", "REST APIs", "RESTful APIs", "REST endpoints"],
    domain: "tech",
  },
  {
    canonical: "GraphQL API",
    variants: ["GraphQL APIs", "GraphQL endpoint"],
    domain: "tech",
  },
  {
    canonical: "microservices",
    variants: ["micro-services", "microservice architecture"],
    domain: "tech",
  },
  { canonical: "distributed systems", variants: ["distributed system"], domain: "tech" },
  {
    canonical: "relational database",
    variants: ["relational databases", "RDBMS", "SQL database"],
    domain: "tech",
  },
  {
    canonical: "NoSQL",
    variants: ["NoSQL databases", "document database", "document store"],
    domain: "tech",
  },
  {
    canonical: "object-oriented programming",
    variants: ["OOP", "object-oriented design", "OOD"],
    domain: "tech",
  },
  { canonical: "functional programming", variants: ["FP"], domain: "tech" },

  // ────────── Cloud / DevOps ──────────
  { canonical: "Amazon Web Services", variants: ["AWS"], domain: "tech" },
  { canonical: "Google Cloud Platform", variants: ["GCP", "Google Cloud"], domain: "tech" },
  { canonical: "Microsoft Azure", variants: ["Azure"], domain: "tech" },
  { canonical: "infrastructure as code", variants: ["IaC"], domain: "tech" },
  {
    canonical: "container orchestration",
    variants: ["Kubernetes", "K8s"],
    domain: "tech",
  },
  {
    // Terraform deliberately excluded — it's IaC, not config management.
    canonical: "configuration management",
    variants: ["Ansible", "Chef", "Puppet"],
    domain: "tech",
  },
  {
    canonical: "CI/CD pipelines",
    variants: ["CICD pipelines", "CI/CD workflows", "continuous integration pipelines"],
    domain: "tech",
  },
  {
    canonical: "observability",
    variants: ["monitoring and observability", "observability tooling"],
    domain: "tech",
  },
  { canonical: "site reliability engineering", variants: ["SRE"], domain: "tech" },
  {
    canonical: "incident response",
    variants: ["on-call", "on-call rotation", "incident management"],
    domain: "tech",
  },

  // ────────── AI / ML / Data ──────────
  { canonical: "machine learning", variants: ["ML", "machine-learning"], domain: "tech" },
  { canonical: "deep learning", variants: ["DL"], domain: "tech" },
  { canonical: "large language models", variants: ["LLMs", "LLM"], domain: "tech" },
  { canonical: "natural language processing", variants: ["NLP"], domain: "tech" },
  // "computer vision: [CV]" deliberately excluded — CV collides with
  // curriculum vitae in resume context.
  {
    canonical: "data warehouse",
    variants: ["data warehousing", "cloud data warehouse"],
    domain: "tech",
  },
  {
    canonical: "data lake",
    variants: ["data lakes", "data lakehouse"],
    domain: "tech",
  },
  {
    canonical: "feature engineering",
    variants: ["feature extraction"],
    domain: "tech",
  },
  {
    canonical: "model deployment",
    variants: ["model serving", "ML deployment"],
    domain: "tech",
  },
  // A/B testing exists in tech and product domains; declaring once with
  // domain "unknown" so it applies everywhere.
  { canonical: "A/B testing", variants: ["AB testing", "split testing"], domain: "unknown" },
  {
    canonical: "experimentation",
    variants: ["experimentation platform", "experimentation framework"],
    domain: "tech",
  },

  // ────────── Product management ──────────
  { canonical: "product roadmap", variants: ["roadmap", "product roadmaps"], domain: "product" },
  { canonical: "go-to-market", variants: ["GTM", "go to market"], domain: "product" },
  {
    canonical: "product-market fit",
    variants: ["PMF", "product market fit"],
    domain: "product",
  },
  {
    canonical: "key performance indicators",
    variants: ["KPIs", "KPI"],
    domain: "unknown",
  },
  { canonical: "objectives and key results", variants: ["OKRs", "OKR"], domain: "unknown" },
  {
    canonical: "user research",
    variants: ["customer research", "user interviews"],
    domain: "product",
  },
  {
    canonical: "product requirements document",
    variants: ["PRD", "PRDs"],
    domain: "product",
  },
  { canonical: "minimum viable product", variants: ["MVP"], domain: "product" },
  {
    canonical: "stakeholder management",
    variants: ["stakeholder engagement", "stakeholder communication"],
    domain: "unknown",
  },
  {
    canonical: "cross-functional teams",
    variants: ["cross-functional collaboration", "cross-functional partnership"],
    domain: "unknown",
  },

  // ────────── Marketing ──────────
  { canonical: "account-based marketing", variants: ["ABM"], domain: "marketing" },
  { canonical: "search engine optimization", variants: ["SEO"], domain: "marketing" },
  { canonical: "search engine marketing", variants: ["SEM"], domain: "marketing" },
  { canonical: "pay-per-click", variants: ["PPC", "paid search"], domain: "marketing" },
  {
    canonical: "customer relationship management",
    variants: ["CRM"],
    domain: "marketing",
  },
  {
    canonical: "conversion rate optimization",
    variants: ["CRO"],
    domain: "marketing",
  },
  {
    canonical: "marketing qualified lead",
    variants: ["MQL", "MQLs"],
    domain: "marketing",
  },
  {
    // SQL is ambiguous: "Sales Qualified Lead" in marketing JDs vs
    // "Structured Query Language" in tech JDs. Domain-restricted to
    // marketing so a tech JD's "SQL" stays a literal string match.
    canonical: "sales qualified lead",
    variants: ["SQL", "SQLs"],
    domain: "marketing",
  },
  {
    canonical: "demand generation",
    variants: ["demand gen", "lead generation", "lead gen"],
    domain: "marketing",
  },
  { canonical: "content marketing", variants: ["content strategy"], domain: "marketing" },
  { canonical: "email marketing", variants: ["email campaigns"], domain: "marketing" },
  { canonical: "return on investment", variants: ["ROI"], domain: "unknown" },
  { canonical: "return on ad spend", variants: ["ROAS"], domain: "marketing" },

  // ────────── Sales ──────────
  { canonical: "business development", variants: ["BD", "biz dev"], domain: "sales" },
  { canonical: "account executive", variants: ["AE"], domain: "sales" },
  { canonical: "sales development representative", variants: ["SDR"], domain: "sales" },
  { canonical: "business development representative", variants: ["BDR"], domain: "sales" },
  {
    canonical: "customer success",
    variants: ["CS", "customer success management"],
    domain: "sales",
  },
  {
    canonical: "quota attainment",
    variants: ["hit quota", "exceeded quota", "quota achievement"],
    domain: "sales",
  },
  {
    canonical: "pipeline generation",
    variants: ["pipe gen", "pipeline development"],
    domain: "sales",
  },
  {
    canonical: "closing deals",
    variants: ["deal closure", "closed deals"],
    domain: "sales",
  },
];

/**
 * Detect which domain (or unknown) a JD text belongs to. Used to
 * disambiguate domain-restricted aliases — most importantly the
 * `SQL → sales qualified lead` mapping which only applies in marketing
 * JDs.
 *
 * Returns the highest-scoring domain by token count, with `unknown`
 * fallback when no domain has a clear majority.
 */
export function detectDomain(jdText: string): AliasDomain {
  const text = jdText.toLowerCase();
  const SCORE_THRESHOLD = 2;

  // Marketing-domain signals
  const mktSignals = [
    "marketing",
    "campaign",
    "brand",
    "lead generation",
    "demand gen",
    "mql",
    "abm",
    "seo",
    "sem",
    "crm",
    "roi",
    "ppc",
    "audience",
    "funnel",
    "go-to-market",
  ];
  // Tech-domain signals
  const techSignals = [
    "python",
    "javascript",
    "typescript",
    "java ",
    "golang",
    " go ",
    "rust",
    "kubernetes",
    "docker",
    "kafka",
    "postgres",
    "etl",
    "api",
    "microservices",
    "git",
    "aws",
    "gcp",
    "azure",
    "machine learning",
    "model",
  ];
  // Product signals
  const productSignals = [
    "product manager",
    "product roadmap",
    "user research",
    "stakeholder",
    "prd",
    "okr",
    "go-to-market",
    "product-market fit",
    "north star",
  ];
  // Sales signals
  const salesSignals = [
    "quota",
    "pipeline generation",
    "outbound",
    "prospecting",
    "closing",
    "account executive",
    "sales development",
    "sdr",
    "ae",
  ];

  const score = (signals: string[]) =>
    signals.reduce((c, s) => c + (text.includes(s) ? 1 : 0), 0);

  const scores: Array<[AliasDomain, number]> = [
    ["tech", score(techSignals)],
    ["marketing", score(mktSignals)],
    ["product", score(productSignals)],
    ["sales", score(salesSignals)],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [topDomain, topScore] = scores[0]!;
  if (topScore < SCORE_THRESHOLD) return "unknown";
  return topDomain;
}

/**
 * Build a runtime lookup: form → group it belongs to. Each form is
 * indexed under multiple keys: lowercased surface, lowercased + final-s
 * stripped, and a hyphen-collapsed form ("micro-services" → "microservices").
 * This catches singular/plural pairs and minor spelling variations
 * without bloating the dictionary itself.
 *
 * Domain-restricted groups are skipped if the JD's domain doesn't
 * match. Groups with `domain: "unknown"` apply universally.
 */
export function buildAliasIndex(domain: AliasDomain): Map<string, AliasGroup> {
  const index = new Map<string, AliasGroup>();
  const insert = (key: string, group: AliasGroup) => {
    if (!index.has(key)) index.set(key, group);
  };

  for (const group of ALIAS_GROUPS) {
    if (group.domain !== "unknown" && group.domain !== domain) continue;
    const allForms = [group.canonical, ...group.variants];
    for (const form of allForms) {
      const lower = form.toLowerCase();
      insert(lower, group);
      // Singular/plural collapse: drop a trailing `s` if present.
      // "data pipelines" → "data pipeline", "ETL workflows" → "ETL workflow"
      if (lower.endsWith("s")) insert(lower.slice(0, -1), group);
      // Some forms have an es: "matrices" → "matrice". Skip — too noisy.
      // Hyphen collapse: "micro-services" → "microservices".
      if (lower.includes("-")) insert(lower.replace(/-/g, ""), group);
      if (lower.includes("-")) insert(lower.replace(/-/g, " "), group);
    }
  }
  return index;
}
