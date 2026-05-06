import nlp from "compromise";
import type { JdAnalysis, JdSectionKind } from "@/lib/jd/types";
import type { JdKeyword, KeywordTier } from "./types";
import { lemmatizePhrase } from "./lemmatize";
import { buildAliasIndex, detectDomain } from "./keyword-aliases";

const MUST_WEIGHT = 3;
const NICE_WEIGHT = 1;

/**
 * Tokens that have no information value as standalone keywords. We KEEP
 * them when they appear inside a multi-token phrase — "lead qualification"
 * is useful even though "lead" alone is a stopword.
 */
const SINGLE_TOKEN_STOPWORDS = new Set([
  "ability",
  "abilities",
  "approach",
  "background",
  "best",
  "both",
  "candidate",
  "collaboration",
  "communication",
  "company",
  "criteria",
  "culture",
  "department",
  "engineer",
  "engineering",
  "environment",
  "expertise",
  "experience",
  "experiences",
  "exposure",
  "field",
  "goal",
  "goals",
  "growth",
  "history",
  "ideal",
  "industry",
  "knowledge",
  "level",
  "manager",
  "marketing",
  "model",
  "models",
  "opportunity",
  "people",
  "performance",
  "person",
  "platform",
  "plus",
  "position",
  "problem",
  "problems",
  "process",
  "product",
  "production",
  "products",
  "program",
  "programs",
  "project",
  "projects",
  "qualification",
  "qualifications",
  "quality",
  "replication",
  "responsibility",
  "responsibilities",
  "result",
  "results",
  "role",
  "roles",
  "skill",
  "skills",
  "software",
  "solution",
  "solutions",
  "specialist",
  "specialists",
  "stack",
  "state",
  "states",
  "strategy",
  "system",
  "systems",
  "task",
  "tasks",
  "team",
  "teams",
  "technology",
  "technologies",
  "thing",
  "things",
  "time",
  "tooling",
  "tools",
  "track",
  "understanding",
  "united",
  "use",
  "user",
  "users",
  "way",
  "work",
  "world",
  "year",
  "years",
  // Common adjectives that compromise sometimes treats as nouns.
  "strong",
  "excellent",
  "proven",
  "familiar",
  "familiarity",
  "prior",
  "advanced",
  "annual",
  "qualified",
  "related",
  "other",
  "various",
  "general",
]);

/**
 * Phrases that look like keywords syntactically but carry no signal
 * (boilerplate). Filtered after extraction.
 */
const PHRASE_BLOCKLIST = new Set([
  "track record",
  "written communication",
  "verbal communication",
  // Generic degree-field qualifiers — the JD's permissive language
  // ("or a related quantitative field", "or relevant experience").
  // These are not skill names; they widen the field-acceptance window.
  "related field",
  "relevant field",
  "similar field",
  "quantitative field",
  "related quantitative field",
  "relevant quantitative field",
  "equivalent experience",
  "relevant experience",
  "advanced degree",
  "prior experience",
  "technology company",
  "technology companies",
  "saas platform",
  "b2b saa platform",
  "b2b saas platform",
  "marketing specialist",
  "marketing specialists",
  "revenue goals",
  "revenue goal",
  "marketing manager",
  "qualified pipeline",
  // Common JD-body framing phrases that aren't skills
  "production experience",
  "open source",
  "open source data tooling",
]);

/**
 * Phrases (or single tokens) that override the blocklist and the
 * single-token stopword filter. Single-token entries are also the only
 * lowercase common nouns the standalone-noun pass will emit — this is
 * how we keep the keyword list focused on domain-specific terms instead
 * of every noun in the JD.
 */
const PHRASE_ALLOWLIST = new Set([
  // Marketing-domain compounds
  "team leadership",
  "lead qualification",
  "lead nurturing",
  "demand generation",
  "content marketing",
  "brand strategy",
  "marketing strategy",
  "marketing budget",
  "marketing roadmap",
  "marketing campaigns",
  "marketing campaign",
  "organic traffic",
  "paid search",
  "executive team",
  "sales team",
  "qualified pipeline",
  "account-based marketing",
  "account based marketing",
  "google analytics",
  "email marketing",
  "b2b marketing",
  "b2c marketing",
  "growth marketing",
  "communication skills",
  "analytical skills",
  // Single-token domain nouns (allowlisted, escape stopword filter)
  "saas",
  "abm",
  "mba",
  "seo",
  "sem",
  "roi",
  "kpi",
  "crm",
  "hubspot",
  "salesforce",
  "pipeline",
  "conversion",
  "mentor",
  "email",
  "b2b",
  "b2c",
  "communication",
]);

/**
 * 2-token sub-phrase preferences. When the extractor captures a 3-token
 * phrase, we check whether the leading 2 tokens form one of these
 * canonical phrases — if so, emit the 2-token form instead. So
 * "demand generation campaigns" becomes "demand generation",
 * "lead qualification criteria" becomes "lead qualification".
 */
const PREFERRED_SUBPHRASES = new Set([
  // Marketing
  "demand generation",
  "lead qualification",
  "lead nurturing",
  "content marketing",
  "brand strategy",
  "marketing strategy",
  "marketing budget",
  "marketing roadmap",
  "marketing campaign",
  "marketing campaigns",
  "executive team",
  "sales team",
  "qualified pipeline",
  "google analytics",
  "email marketing",
  "b2b marketing",
  "paid search",
  "organic traffic",
  "account-based marketing",
  // Tech / data
  "data pipelines",
  "data pipeline",
  "machine learning",
  "data warehouse",
  "data science",
  "data infrastructure",
  "data quality",
  "etl pipelines",
  "etl pipeline",
  "etl workflows",
  "etl workflow",
]);

/**
 * Imperative verbs that frequently begin bullet lines and get mis-tagged
 * as nouns by compromise. Always filter — even inside multi-token phrases
 * we strip them via cleanPhrase before lemmatizing.
 */
const IMPERATIVE_VERB_HEADS = new Set([
  "develop",
  "lead",
  "manage",
  "mentor",
  "oversee",
  "work",
  "support",
  "provide",
  "ensure",
  "drive",
  "build",
  "create",
  "execute",
  "partner",
  "deliver",
  "own",
  "design",
  "implement",
  "produce",
  "report",
  "monitor",
  "improve",
  "grow",
  "establish",
  "define",
  "evaluate",
  "increase",
]);

/** Convert internal section kind → user-facing tier. */
function tierForSection(section: JdSectionKind): KeywordTier {
  if (section === "required") return "must-have";
  if (section === "preferred") return "nice-to-have";
  return "body";
}

function classificationForSection(section: JdSectionKind) {
  return section === "required" ? ("must-have" as const) : ("nice-to-have" as const);
}

function baseWeightForSection(section: JdSectionKind): number {
  return section === "required" ? MUST_WEIGHT : NICE_WEIGHT;
}

const SECTION_PRIORITY: Record<JdSectionKind, number> = {
  required: 4,
  preferred: 3,
  responsibilities: 2,
  intro: 1,
  logistics: 1,
  other: 0,
};

interface RawKeyword {
  surface: string;
}

/**
 * Strip noise off the head and tail of a candidate phrase so that
 * "the marketing budget" / "a marketing budget" / "marketing budget"
 * all collapse to a single keyword. Handles:
 *
 *   • leading bullets and dashes (`- foo`, `• foo`)
 *   • leading articles + determiners (`the`, `a`, `an`, `our`, `your`,
 *     `this`, `that`, `these`, `those`)
 *   • leading function words (`with`, `of`, `to`, `in`, `on`, `for`,
 *     `by`, `from`, `at`, `as`, `or`, `and`)
 *   • trailing punctuation (`.`, `,`, `;`, `:`, `!`, `?`)
 *   • leading "Strong / Excellent / Proven / Prior" adjectives that
 *     compromise sometimes glues to the head noun
 */
/**
 * Find capitalized field names that appear in a "degree in X, Y, or Z"
 * enumeration. These are degree-field examples, not skill keywords.
 * Returns the lowercase field words to mark as consumed.
 */
function collectDegreeFieldEnumerations(text: string): string[] {
  const out: string[] = [];
  // Match "degree in <list>" and "field of <list>". The list is captured
  // up to the next sentence-end or an "or a related/relevant/similar
  // <X> field" clause that often closes the enumeration. We also capture
  // a trailing "or related/equivalent experience" qualifier.
  const re =
    /\b(?:degree|field)\s+(?:in|of)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?(?:\s*,\s*(?:and\s+|or\s+)?[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)+(?:\s*,?\s*(?:or|and)\s+(?:a\s+|the\s+)?(?:related|relevant|similar|equivalent)(?:\s+\w+)?\s+\w+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const list = m[1] ?? "";
    for (const segment of list.split(/\s*,\s*|\s+or\s+|\s+and\s+/)) {
      const seg = segment.trim();
      // Strip generic qualifier tails: "a related quantitative field" /
      // "a relevant field" / "equivalent experience". These are
      // permissive language, not actual field names.
      if (/^(?:a\s+|the\s+)?(?:related|relevant|similar|equivalent)\b/i.test(seg)) {
        continue;
      }
      // Capitalized field names like "Computer Science", "Engineering"
      if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?$/.test(seg)) out.push(seg);
    }
  }
  return out;
}

/**
 * Collect role-title surfaces to filter from the keyword list. Derived
 * from the JD's first non-empty line plus a "(Senior|Junior|Lead|...)
 * <Role>" pattern across all sections. The role being applied to is
 * never a useful keyword — the candidate's resume isn't expected to
 * include the JD's title verbatim.
 *
 * Returns a Set of LOWERCASE surfaces to drop. We add three forms per
 * detected title:
 *   1. Full title ("Senior Data Engineer")
 *   2. Role noun without seniority ("Data Engineer")
 *   3. Bare seniority modifier ("Senior")
 */
function collectRoleTitleSurfaces(analysis: JdAnalysis): Set<string> {
  const out = new Set<string>();
  const SENIORITY = "(?:Senior|Junior|Lead|Principal|Staff|Chief|Head\\s+of|VP|Vice\\s+President|Director|Manager)";
  // The bare seniority words by themselves are filtered too — these
  // describe the role's level, not a skill.
  const SENIORITY_BARE = ["Senior", "Junior", "Lead", "Principal", "Staff", "Chief", "VP", "Director", "Manager"];

  const harvest = (line: string) => {
    // 1. Match a "Senior Data Engineer" pattern: seniority + 1-3 caps words.
    const titleRe = new RegExp(
      String.raw`\b${SENIORITY}\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\b`,
      "g",
    );
    let m: RegExpExecArray | null;
    while ((m = titleRe.exec(line)) !== null) {
      const full = m[0].replace(/\s+/g, " ").trim();
      const seniorityWord = full.split(/\s+/)[0]!;
      const roleNoun = m[1]!.trim();
      out.add(full.toLowerCase());
      out.add(roleNoun.toLowerCase());
      out.add(seniorityWord.toLowerCase());
    }
    // 2. The bare seniority words.
    for (const s of SENIORITY_BARE) {
      if (new RegExp(`\\b${s}\\b`, "i").test(line)) out.add(s.toLowerCase());
    }
  };

  // First non-empty line of the intro section is almost always the JD
  // title — that's where the "Senior Data Engineer — Northwind Analytics"
  // line sits. Include it.
  const introLines = analysis.sections.find((s) => s.kind === "intro")?.lines ?? [];
  for (const l of introLines) {
    if (l.trim()) {
      harvest(l);
      break;
    }
  }
  // Also scan the full JD for the same pattern — picks up "mentor a
  // Senior Data Engineer" style phrases.
  const fullText = analysis.sections.map((s) => s.lines.join("\n")).join("\n");
  harvest(fullText);

  return out;
}

function cleanPhrase(raw: string): string {
  let s = raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Strip possessive 's → "Bachelor's degree" → "Bachelor degree"
    .replace(/'s\b/g, "")
    .replace(/[^A-Za-z0-9+#./\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Strip leading bullets and trailing punctuation/hyphens that the
  // char-class pass kept (- is in the kept set so it survives there).
  s = s.replace(/^[\-•*·●○◦▪▫\s]+/, "").replace(/[\-.,:;!?]+$/g, "");
  // Strip leading filler tokens iteratively. The "skill-prefix" words
  // (experience, familiarity, knowledge, understanding) live here so
  // "Experience with account-based marketing" reduces to
  // "account-based marketing".
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(
      /^(?:the|a|an|our|your|my|this|that|these|those|with|of|to|in|on|for|by|from|at|as|or|and|excellent|strong|proven|prior|advanced|annual|qualified|related|other|various|general|familiar|familiarity|knowledge|understanding|experience|exposure|deep|modern|production|senior|junior|new|next|core|major|minor|professional|scalable|critical|multiple|long-term|production-grade)\s+/i,
      "",
    );
  }
  // Drop trailing filler (commonly "experience" appended to skill names).
  s = s.replace(/\s+(?:experience|skills?|skill|knowledge|exposure)$/i, "");
  return s.trim();
}

/**
 * Extract candidate keyword surfaces from a slab of text using compromise
 * noun-phrase passes plus regex fallbacks for tech tokens, mixed-case
 * names, and proper-noun acronyms.
 */
function extractKeywordSurfaces(text: string): RawKeyword[] {
  const out: RawKeyword[] = [];
  const consumed = new Set<string>();
  // Degree-field enumeration boilerplate: "Bachelor's degree in Marketing,
  // Business, or a related field" — the comma-separated nouns are
  // examples of acceptable degree fields, not skills. Mark each
  // multi-word field name AND its individual constituent words so the
  // cap-noun pass doesn't extract "Computer" or "Science" separately
  // when the phrase "Computer Science" was filtered as a unit.
  const fieldEnumBoilerplate = collectDegreeFieldEnumerations(text);
  for (const f of fieldEnumBoilerplate) {
    consumed.add(f.toLowerCase());
    for (const word of f.split(/\s+/)) consumed.add(word.toLowerCase());
  }

  // Split on commas / sentence ends BEFORE feeding compromise so phrases
  // like "Marketing, Business" don't fuse into a single noun chunk
  // ("Marketing Business" was a regression from compromise treating the
  // comma as part of a continuous phrase).
  const chunks = text
    .split(/(?<=[.?!])\s+|,\s+|\n+/g)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const doc = nlp(chunk);
    // 1. Compromise compound-noun passes (2-3 tokens).
    const adjNounPhrases = doc.match("#Adjective+ #Noun+").out("array") as string[];
    const nounNounPhrases = doc.match("#Noun+ #Noun+").out("array") as string[];
    for (const raw of [...adjNounPhrases, ...nounNounPhrases]) {
      const cleaned = cleanPhrase(raw);
      if (!cleaned) continue;
      const toks = cleaned.split(/\s+/).filter(Boolean);
      if (toks.length < 2 || toks.length > 3) continue;
      // For 3-token phrases, prefer a 2-token canonical sub-phrase when
      // either the leading or trailing pair is in the preferred set.
      // Examples:
      //   "demand generation campaigns" → "demand generation" (leading)
      //   "scalable data pipelines"     → "data pipelines"    (trailing)
      let surface = cleaned;
      if (toks.length === 3) {
        const head = `${toks[0]} ${toks[1]}`.toLowerCase();
        const tail = `${toks[1]} ${toks[2]}`.toLowerCase();
        if (PREFERRED_SUBPHRASES.has(head)) surface = `${toks[0]} ${toks[1]}`;
        else if (PREFERRED_SUBPHRASES.has(tail)) surface = `${toks[1]} ${toks[2]}`;
      }
      const key = surface.toLowerCase();
      if (consumed.has(key)) continue;
      consumed.add(key);
      out.push({ surface });
    }
    // 2. Allowlisted single-token nouns. Compromise's standalone-noun
    // pass produces too much noise for general use; this filters it
    // down to the small set of single-word terms we explicitly want
    // (pipeline, conversion, mentor, email, ...).
    const nounsList = doc.nouns().out("array") as string[];
    for (const raw of nounsList) {
      const cleaned = cleanPhrase(raw);
      if (!cleaned) continue;
      const toks = cleaned.split(/\s+/).filter(Boolean);
      if (toks.length !== 1) continue;
      const lower = cleaned.toLowerCase();
      if (!PHRASE_ALLOWLIST.has(lower)) continue;
      if (consumed.has(lower)) continue;
      consumed.add(lower);
      out.push({ surface: cleaned });
    }
  }

  // 3. Tech tokens (acronyms, internal punctuation).
  const techRe =
    /\b(?:[A-Za-z][A-Za-z0-9]*[+#][A-Za-z0-9+#]*|[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9.]+|[A-Za-z][A-Za-z0-9]*\/[A-Za-z0-9/]+|[A-Z][A-Z0-9]{1,5})\b/g;
  let m: RegExpExecArray | null;
  while ((m = techRe.exec(text)) !== null) {
    const tok = m[0];
    if (/^(IS|AS|OR|AND|TO|IN|ON|OF|FOR|BY|WITH|FROM|AT|THE|A|AN)$/i.test(tok)) {
      continue;
    }
    const key = tok.toLowerCase();
    if (consumed.has(key)) continue;
    consumed.add(key);
    out.push({ surface: tok });
  }

  // 4. Mixed-case identifiers (HubSpot, JavaScript, PostgreSQL, SaaS).
  const mixedRe = /\b[a-zA-Z]*[a-z][A-Z][a-zA-Z]+\b/g;
  while ((m = mixedRe.exec(text)) !== null) {
    const key = m[0].toLowerCase();
    if (consumed.has(key)) continue;
    consumed.add(key);
    out.push({ surface: m[0] });
  }

  // 5. Capitalized proper nouns that aren't sentence-initial OR
  // bullet-initial. Catches Salesforce mid-sentence, but skips Mentor at
  // the start of a "- Mentor and develop..." bullet.
  const capRe = /\b[A-Z][a-z]{2,}\b/g;
  while ((m = capRe.exec(text)) !== null) {
    const tok = m[0];
    const key = tok.toLowerCase();
    if (consumed.has(key)) continue;
    const idx = m.index;
    // Look back through whitespace + a single bullet marker to detect
    // line-/sentence-initial captures.
    const before = idx > 0 ? text.slice(0, idx) : "";
    const trimmed = before.replace(/[\s\-•*·●○◦▪▫]+$/, "");
    if (trimmed === "" || /[.!?]$/.test(trimmed)) continue;
    consumed.add(key);
    out.push({ surface: tok });
  }

  // 5b. Years-of-experience pattern. "5+ years", "10 years", "3-5 years"
  // — these are weighted asks that compromise won't catch as a noun
  // phrase.
  const yearsRe = /\b(\d{1,2})\s*(?:\+|-\s*\d{1,2})?\s*(?:years?|yrs?)\b/gi;
  while ((m = yearsRe.exec(text)) !== null) {
    const surface = `${m[1]}+ years`;
    const key = surface.toLowerCase();
    if (consumed.has(key)) continue;
    consumed.add(key);
    out.push({ surface });
  }

  // 5c. Allowlist literal-phrase scan. Compromise's POS tagger is lossy
  // on certain sentence shapes ("lead demand generation and brand
  // strategy" sometimes mis-tags "brand"); scanning the text directly
  // for known canonical phrases catches what slips through.
  for (const phrase of PHRASE_ALLOWLIST) {
    if (!phrase.includes(" ")) continue;
    const re = new RegExp(`\\b${phrase.replace(/[-]/g, "[- ]")}\\b`, "gi");
    while ((m = re.exec(text)) !== null) {
      const surface = m[0];
      const key = surface.toLowerCase();
      if (consumed.has(key)) continue;
      consumed.add(key);
      out.push({ surface });
    }
  }

  // 6. Dedup pass: drop single-token surfaces whose lowercase token
  // already appears as a constituent of a captured multi-word surface.
  // Without this, "Google Analytics" + "Google" + "Analytics" all get
  // emitted as separate keywords.
  const multiWordTokens = new Set<string>();
  for (const { surface } of out) {
    const toks = surface.split(/\s+/).filter(Boolean);
    if (toks.length > 1) {
      for (const t of toks) multiWordTokens.add(t.toLowerCase());
    }
  }
  return out.filter(({ surface }) => {
    const toks = surface.split(/\s+/).filter(Boolean);
    if (toks.length !== 1) return true;
    const lower = toks[0]!.toLowerCase();
    // Allowlisted single tokens always survive (HubSpot, ROI, SEO, MBA,
    // Salesforce, SaaS, ABM, …) even when they're constituents of a
    // captured phrase.
    if (PHRASE_ALLOWLIST.has(lower)) return true;
    // All-caps acronyms (length ≤ 6) survive — these are never noise.
    if (/^[A-Z][A-Z0-9]{1,5}$/.test(surface)) return true;
    // Mixed-case identifiers survive — they're domain tokens.
    if (/[a-z][A-Z]/.test(surface)) return true;
    return !multiWordTokens.has(lower);
  });
}

/**
 * Detect "phrase (ACRONYM)" patterns and return a map from canonical
 * lemma to a tuple of (canonical surface, acronym). The phrase capture
 * stops at the first comma/period/semicolon to avoid eating an entire
 * sentence preceding the parenthetical.
 */
function detectAcronymAliases(
  text: string,
): Map<string, { surface: string; acronym: string }> {
  const map = new Map<string, { surface: string; acronym: string }>();
  // Phrase = up to 5 words of letters+hyphens, preceded by something not
  // a letter (so we don't grab mid-word fragments).
  const re =
    /(?:^|[^A-Za-z])([A-Za-z][A-Za-z\-]+(?:\s+[A-Za-z][A-Za-z\-]+){1,4})\s*\(\s*([A-Z]{2,6})\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const phrase = (m[1] ?? "").trim();
    const acronym = m[2];
    if (!phrase || !acronym) continue;
    const cleaned = cleanPhrase(phrase);
    if (!cleaned) continue;
    const lemma = lemmatizePhrase(cleaned);
    if (!lemma) continue;
    map.set(lemma, { surface: cleaned, acronym });
  }
  return map;
}

/** Top-level extractor: walks every JD section and returns weighted keywords. */
export function extractJdKeywords(analysis: JdAnalysis): JdKeyword[] {
  const buckets = new Map<
    string,
    {
      surface: string;
      aliases: Set<string>;
      sourceSection: JdSectionKind;
      frequency: number;
    }
  >();

  // Role-title filter — derived from the JD title and the
  // "(Senior|Junior|...) <Noun>" pattern. The role being applied to
  // shouldn't score: a candidate's resume might or might not literally
  // include "Senior Data Engineer", but that's not a skill match. We
  // filter the title, the role-noun (title minus seniority modifier),
  // and the bare seniority modifier.
  const roleFilter = collectRoleTitleSurfaces(analysis);

  // Acronym alias detection runs over the whole JD first so a phrase
  // defined in one section and used as a bare acronym in another still
  // collapses to a single canonical entry.
  const fullText = analysis.sections.map((s) => s.lines.join("\n")).join("\n\n");

  // Alias dictionary — domain-aware. The SQL alias (→ "sales qualified
  // lead") only fires on marketing JDs; tech JDs keep SQL as a literal
  // string match.
  const domain = detectDomain(fullText);
  const aliasIndex = buildAliasIndex(domain);
  const aliasMap = detectAcronymAliases(fullText);
  // Reverse lookup: acronym → canonical lemma.
  const acronymToCanonical = new Map<string, string>();
  for (const [canonicalLemma, { acronym }] of aliasMap) {
    acronymToCanonical.set(acronym.toLowerCase(), canonicalLemma);
  }
  // Seed buckets with the canonical phrases so they exist even if the
  // detector found them only in the parenthetical line.
  for (const [canonicalLemma, { surface, acronym }] of aliasMap) {
    buckets.set(canonicalLemma, {
      surface,
      aliases: new Set([acronym]),
      sourceSection: "preferred",
      frequency: 1,
    });
  }

  for (const section of analysis.sections) {
    if (!section.lines.length) continue;
    if (section.kind === "logistics" || section.kind === "other") continue;
    let lines = section.lines;
    // The intro section's first non-empty line is almost always the JD
    // title ("Marketing Manager — Acme Software"). Skip it; the rest of
    // the intro often contains substantive role context (brand strategy,
    // marketing roadmap, qualified pipeline) we DO want to extract.
    if (section.kind === "intro") {
      let skipped = false;
      lines = lines.filter((l) => {
        if (skipped) return true;
        if (l.trim() !== "") {
          skipped = true;
          return false;
        }
        return true;
      });
    }
    const text = lines.join("\n");
    const surfaces = extractKeywordSurfaces(text);
    for (const { surface } of surfaces) {
      addCandidate(buckets, surface, section.kind, acronymToCanonical, aliasMap);
    }
  }

  const keywords: JdKeyword[] = [];
  for (const { surface, aliases, sourceSection, frequency } of buckets.values()) {
    const lemma = lemmatizePhrase(surface);
    if (!lemma) continue;
    const tokens = lemma.split(" ").filter(Boolean);
    if (tokens.length === 0) continue;

    const surfaceLower = surface.toLowerCase();
    // Role-title filter (Fix 1): drop the JD's role title, the role
    // noun without seniority, and the bare seniority modifier.
    if (roleFilter.has(surfaceLower) || roleFilter.has(lemma)) continue;

    const isBlocked =
      PHRASE_BLOCKLIST.has(lemma) || PHRASE_BLOCKLIST.has(surfaceLower);
    if (isBlocked && !PHRASE_ALLOWLIST.has(lemma)) continue;
    // Single-token stopword filter (multi-word phrases pass through
    // even if they contain stopwords — keeps "lead qualification").
    if (
      tokens.length === 1 &&
      SINGLE_TOKEN_STOPWORDS.has(tokens[0]!) &&
      !PHRASE_ALLOWLIST.has(lemma)
    ) {
      continue;
    }
    if (
      tokens.length === 1 &&
      IMPERATIVE_VERB_HEADS.has(tokens[0]!) &&
      !PHRASE_ALLOWLIST.has(lemma)
    ) {
      continue;
    }

    const classification = classificationForSection(sourceSection);
    const tier = tierForSection(sourceSection);
    const baseWeight = baseWeightForSection(sourceSection);
    const weight = baseWeight * (1 + Math.log(frequency));

    // Apply alias dictionary: if this surface (or any of its existing
    // aliases) appears in a synonym group for the JD's domain, attach
    // ALL other forms in that group as aliases. The matcher checks
    // canonical + every alias, so JD "ETL pipelines" hits resume "ETL
    // workflows" and vice versa.
    const allAliases = new Set(aliases);
    const candidates = [surface, lemma, ...allAliases].map((s) =>
      s.toLowerCase(),
    );
    for (const cand of candidates) {
      const group = aliasIndex.get(cand);
      if (!group) continue;
      const allForms = [group.canonical, ...group.variants];
      for (const form of allForms) {
        if (form.toLowerCase() === surface.toLowerCase()) continue;
        allAliases.add(form);
      }
    }

    // Auto-attach degree-equivalence regex when the keyword looks like
    // a degree requirement, and YOE numeric matcher when it's a years
    // pattern. Both bypass the literal-text matcher in keyword-match.ts.
    const enriched = enrichWithCustomMatchers({
      surface,
      lemma,
      aliases: Array.from(allAliases),
      classification,
      tier,
      sourceSection,
      frequency,
      weight: Math.round(weight * 100) / 100,
    });
    keywords.push(enriched);
  }

  // Sort: must-have first by descending weight, then everything else.
  keywords.sort((a, b) => {
    if (a.classification !== b.classification) {
      return a.classification === "must-have" ? -1 : 1;
    }
    return b.weight - a.weight;
  });

  // Constituent dedup: drop a single-token keyword K if there is another
  // keyword K' from the same source section whose lemma contains K's
  // lemma as a constituent token. This is stronger than the in-extractor
  // dedup pass because it runs across all extraction sources and ignores
  // the allowlist/acronym escape hatches — the user's call: when the JD
  // says "qualified pipeline" you want "qualified pipeline", not
  // "qualified pipeline" AND "pipeline".
  const constituentBySection = new Map<JdSectionKind, Set<string>>();
  for (const k of keywords) {
    const toks = k.lemma.split(" ").filter(Boolean);
    if (toks.length < 2) continue;
    if (!constituentBySection.has(k.sourceSection)) {
      constituentBySection.set(k.sourceSection, new Set());
    }
    for (const t of toks) constituentBySection.get(k.sourceSection)!.add(t);
  }
  const afterConstituentDedup = keywords.filter((k) => {
    const toks = k.lemma.split(" ").filter(Boolean);
    if (toks.length !== 1) return true;
    const constituents = constituentBySection.get(k.sourceSection);
    if (!constituents) return true;
    return !constituents.has(toks[0]!);
  });

  // Alias-group dedupe (Fix 3): when multiple keywords belong to the
  // same alias group (e.g. JD says "ETL pipelines" in required AND
  // "ETL workflows" + "data pipelines" in responsibilities), merge them
  // into a single keyword. Without this, the JD ends up with three
  // separate weighted entries for the same concept, which inflates
  // total weight and matched weight (and double-counts when the resume
  // has any one of the variants).
  return mergeAliasGroups(afterConstituentDedup, aliasIndex);
}

/**
 * Merge keywords that share an alias group. Keep the entry with the
 * highest classification (must-have > nice-to-have); aggregate
 * frequencies; recompute weight; union aliases. Keywords with no
 * alias-group entry pass through unchanged.
 */
function mergeAliasGroups(
  keywords: JdKeyword[],
  aliasIndex: Map<string, { canonical: string; variants: string[] }>,
): JdKeyword[] {
  const groups = new Map<string, JdKeyword[]>();
  const ungrouped: JdKeyword[] = [];

  for (const k of keywords) {
    const candidates = [k.surface, k.lemma, ...k.aliases].map((s) =>
      s.toLowerCase(),
    );
    let groupKey: string | null = null;
    for (const c of candidates) {
      const g = aliasIndex.get(c);
      if (g) {
        groupKey = g.canonical.toLowerCase();
        break;
      }
    }
    if (!groupKey) {
      ungrouped.push(k);
      continue;
    }
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(k);
  }

  const merged: JdKeyword[] = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      merged.push(members[0]!);
      continue;
    }
    // Highest tier wins (must-have > body/nice-to-have). Within tier,
    // higher original weight wins.
    members.sort((a, b) => {
      if (a.classification !== b.classification) {
        return a.classification === "must-have" ? -1 : 1;
      }
      return b.weight - a.weight;
    });
    const primary = members[0]!;
    // Use the MAX frequency across members rather than summing — when
    // the same concept is referenced via 3 different surface forms in
    // the JD, the JD-author isn't asking for it 3× more strongly. Sum
    // amplification produces inflated weights (and inflated scores).
    const maxFreq = members.reduce(
      (max, m) => Math.max(max, m.frequency),
      0,
    );
    const aliasUnion = new Set<string>(primary.aliases);
    for (const m of members) {
      if (m === primary) continue;
      aliasUnion.add(m.surface);
      for (const a of m.aliases) aliasUnion.add(a);
    }
    aliasUnion.delete(primary.surface);

    const baseWeight = primary.classification === "must-have" ? 3 : 1;
    const weight = baseWeight * (1 + Math.log(maxFreq));
    merged.push({
      ...primary,
      aliases: Array.from(aliasUnion),
      frequency: maxFreq,
      weight: Math.round(weight * 100) / 100,
    });
  }

  return [...merged, ...ungrouped].sort((a, b) => {
    if (a.classification !== b.classification) {
      return a.classification === "must-have" ? -1 : 1;
    }
    return b.weight - a.weight;
  });
}

/**
 * Detect degree-style and years-of-experience keywords and attach the
 * appropriate custom matcher (regex for degrees, numeric YOE for years).
 * Without these, "Bachelor's degree" / "5+ years" would only match an
 * exact textual repeat in the resume — neither is realistic.
 */
function enrichWithCustomMatchers(k: JdKeyword): JdKeyword {
  // 5+ years / 10 years / 3-5 years
  const yearsMatch = k.surface.match(/(\d{1,2})\s*(?:\+|-\s*\d{1,2})?\s*(?:years?|yrs?)\b/i);
  if (yearsMatch && yearsMatch[1]) {
    const minYears = parseInt(yearsMatch[1], 10);
    if (Number.isFinite(minYears)) {
      return { ...k, minYearsOfExperience: minYears };
    }
  }

  // Bachelor / Master / Doctorate / MBA / Associate
  const degreePattern = detectDegreePattern(k.surface);
  if (degreePattern) {
    return { ...k, matchPattern: degreePattern };
  }
  return k;
}

/**
 * If `surface` looks like a degree requirement, return a regex that
 * matches all common variants of that degree level. Returns null if the
 * surface doesn't reference a recognized degree word.
 */
function detectDegreePattern(surface: string): RegExp | null {
  const s = surface.toLowerCase();
  // Use `(?![A-Za-z])` instead of `\b` at the end so the regex still
  // matches abbreviations that end in a period ("B.A.", "Ph.D.") —
  // `\b` doesn't fire between two non-word chars (the trailing `.`
  // and the following space).
  if (/\bbachelor/i.test(s)) {
    return new RegExp(
      String.raw`\b(?:bachelor(?:'s|s)?(?:\s+(?:of|degree|in)\b[\w \-]*)?|b\.?\s*a\.?|b\.?\s*s\.?|b\.?\s*sc\.?|b\.?\s*eng\.?|b\.?\s*tech\.?|undergraduate\s+degree)(?![A-Za-z])`,
      "i",
    );
  }
  if (/\bmaster/i.test(s) || /\bmba\b/i.test(s)) {
    return new RegExp(
      String.raw`\b(?:master(?:'s|s)?(?:\s+(?:of|degree|in)\b[\w \-]*)?|m\.?\s*a\.?|m\.?\s*s\.?|m\.?\s*sc\.?|m\.?\s*eng\.?|m\.?\s*b\.?\s*a\.?|mba|graduate\s+degree)(?![A-Za-z])`,
      "i",
    );
  }
  if (/\b(?:doctor|phd|ph\.d)/i.test(s)) {
    return new RegExp(
      String.raw`\b(?:doctor(?:ate|al)?(?:\s+(?:of|degree|in)\b[\w \-]*)?|ph\.?\s*d\.?)(?![A-Za-z])`,
      "i",
    );
  }
  if (/\bassociate/i.test(s) && /\bdegree/i.test(s)) {
    return new RegExp(
      String.raw`\b(?:associate(?:'s|s)?\s+degree|a\.?\s*a\.?|a\.?\s*s\.?)(?![A-Za-z])`,
      "i",
    );
  }
  return null;
}

function addCandidate(
  buckets: Map<
    string,
    {
      surface: string;
      aliases: Set<string>;
      sourceSection: JdSectionKind;
      frequency: number;
    }
  >,
  surface: string,
  sourceSection: JdSectionKind,
  acronymToCanonical: Map<string, string>,
  aliasMap: Map<string, { surface: string; acronym: string }>,
): void {
  let lemma = lemmatizePhrase(surface);
  if (!lemma) return;
  let displaySurface = surface;
  let aliasSurface: string | null = null;

  // Acronym → canonical alias collapse: if `surface` is an all-caps token
  // that maps to a known canonical phrase, route this hit to the
  // canonical lemma instead of treating it as a separate keyword.
  const lowerSurface = surface.toLowerCase();
  if (
    surface.length <= 6 &&
    surface === surface.toUpperCase() &&
    acronymToCanonical.has(lowerSurface)
  ) {
    const canonicalLemma = acronymToCanonical.get(lowerSurface)!;
    lemma = canonicalLemma;
    aliasSurface = surface;
    const canonical = aliasMap.get(canonicalLemma);
    if (canonical) displaySurface = canonical.surface;
  }

  const existing = buckets.get(lemma);
  if (existing) {
    existing.frequency += 1;
    if (
      SECTION_PRIORITY[sourceSection] > SECTION_PRIORITY[existing.sourceSection]
    ) {
      existing.sourceSection = sourceSection;
    }
    if (aliasSurface) existing.aliases.add(aliasSurface);
  } else {
    buckets.set(lemma, {
      surface: displaySurface,
      aliases: aliasSurface ? new Set([aliasSurface]) : new Set(),
      sourceSection,
      frequency: 1,
    });
  }
}
