import nlp from "compromise";
import type { JdAnalysis, JdSectionKind } from "@/lib/jd/types";
import type { JdKeyword, KeywordTier } from "./types";
import { lemmatizePhrase } from "./lemmatize";

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
  "related field",
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
      /^(?:the|a|an|our|your|my|this|that|these|those|with|of|to|in|on|for|by|from|at|as|or|and|excellent|strong|proven|prior|advanced|annual|qualified|related|other|various|general|familiar|familiarity|knowledge|understanding|experience|exposure|prior)\s+/i,
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
      // For 3-token phrases, prefer the leading 2-token form when it's
      // a canonical sub-phrase ("demand generation" over
      // "demand generation campaigns").
      let surface = cleaned;
      if (toks.length === 3) {
        const head = `${toks[0]} ${toks[1]}`.toLowerCase();
        if (PREFERRED_SUBPHRASES.has(head)) surface = `${toks[0]} ${toks[1]}`;
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

  // Acronym alias detection runs over the whole JD first so a phrase
  // defined in one section and used as a bare acronym in another still
  // collapses to a single canonical entry.
  const fullText = analysis.sections.map((s) => s.lines.join("\n")).join("\n\n");
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
    keywords.push({
      surface,
      lemma,
      aliases: Array.from(aliases),
      classification,
      tier,
      sourceSection,
      frequency,
      weight: Math.round(weight * 100) / 100,
    });
  }

  // Sort: must-have first by descending weight, then everything else.
  keywords.sort((a, b) => {
    if (a.classification !== b.classification) {
      return a.classification === "must-have" ? -1 : 1;
    }
    return b.weight - a.weight;
  });

  return keywords;
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
