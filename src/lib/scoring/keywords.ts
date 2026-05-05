import type { JdAnalysis, JdRequirement } from "@/lib/jd/types";
import type { JdKeyword } from "./types";
import { lemmatizePhrase } from "./lemmatize";

const MUST_WEIGHT = 3;
const NICE_WEIGHT = 1;

/**
 * Words that are technically nouns but too generic to count as
 * differentiating keywords. Most are job-application boilerplate.
 */
const STOPWORDS = new Set([
  "ability",
  "approach",
  "background",
  "both",
  "candidate",
  "communication",
  "company",
  "culture",
  "engineer",
  "engineering",
  "environment",
  "expertise",
  "experience",
  "experiences",
  "exposure",
  "field",
  "history",
  "ideal",
  "industry",
  "knowledge",
  "level",
  "model",
  "models",
  "opportunity",
  "people",
  "platform",
  "plus",
  "position",
  "problem",
  "problems",
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
  "role",
  "roles",
  "skill",
  "skills",
  "software",
  "solution",
  "solutions",
  "stack",
  "state",
  "states",
  "system",
  "systems",
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
]);

/**
 * Extract candidate keywords from a single requirement bullet. Returns
 * objects with a flag indicating whether the surface is a multi-word phrase
 * (so the caller can suppress its constituent words from being added
 * separately).
 */
function extractKeywordSurfaces(text: string): Surface[] {
  const out: Surface[] = [];
  const consumed = new Set<string>();

  // 1. Multi-word Title Case phrases (no internal dots, hashes, etc.).
  const titleRe = /\b[A-Z][a-zA-Z-]+(?:\s+[A-Z][a-zA-Z-]+){1,3}\b/g;
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(text)) !== null) {
    const phrase = m[0];
    const idx = m.index;
    const before = idx > 0 ? text.slice(0, idx).trimEnd() : "";
    const sentenceInitial = before === "" || /[.!?]$/.test(before);
    if (sentenceInitial && phrase.split(/\s+/).length < 3) continue;
    out.push({ surface: phrase, multi: true });
    for (const word of phrase.split(/\s+/)) consumed.add(word);
  }

  // 2. Tech tokens with internal punctuation (Node.js, CI/CD, C++, C#).
  const techRe =
    /\b(?:[A-Za-z][A-Za-z0-9]*[+#][A-Za-z0-9+#]*|[A-Za-z][A-Za-z0-9]*\.[A-Za-z0-9.]+|[A-Za-z][A-Za-z0-9]*\/[A-Za-z0-9/]+|[A-Z][A-Z0-9]{1,5})\b/g;
  while ((m = techRe.exec(text)) !== null) {
    const tok = m[0];
    if (/^(IS|AS|OR|AND|TO|IN|ON|OF|FOR|BY|WITH|FROM|AT)$/i.test(tok)) continue;
    out.push({ surface: tok, multi: false });
    consumed.add(tok);
  }

  // 3. Mixed-case tokens (PostgreSQL, JavaScript, GraphQL, Kubernetes).
  const mixedRe = /\b[a-zA-Z]*[a-z][A-Z][a-zA-Z]+\b/g;
  while ((m = mixedRe.exec(text)) !== null) {
    out.push({ surface: m[0], multi: false });
    consumed.add(m[0]);
  }

  // 4. Single capitalized tokens not at sentence start, and not consumed by
  //    a phrase already.
  const capRe = /\b[A-Z][a-z]{2,}\b/g;
  while ((m = capRe.exec(text)) !== null) {
    const tok = m[0];
    if (consumed.has(tok)) continue;
    const idx = m.index;
    const before = idx > 0 ? text.slice(0, idx).trimEnd() : "";
    if (before === "" || /[.!?]$/.test(before)) continue;
    out.push({ surface: tok, multi: false });
    consumed.add(tok);
  }

  return out;
}

interface Surface {
  surface: string;
  multi: boolean;
}

/** Extract weighted keywords from a fully-analyzed JD. */
export function extractJdKeywords(analysis: JdAnalysis): JdKeyword[] {
  const buckets = new Map<
    string,
    {
      surface: string;
      classification: "must-have" | "nice-to-have";
      frequency: number;
    }
  >();

  for (const req of analysis.requirements) {
    const surfaces = extractKeywordSurfaces(req.text);
    for (const { surface } of surfaces) {
      addCandidate(buckets, surface, req);
    }
  }

  const keywords: JdKeyword[] = [];
  for (const { surface, classification, frequency } of buckets.values()) {
    const lemma = lemmatizePhrase(surface);
    if (!lemma) continue;
    if (STOPWORDS.has(lemma)) continue;
    // Drop bare common adjectives that snuck in via the cap-token branch.
    if (lemma.split(" ").length === 1 && /^(strong|solid|deep|good|great|prior|hands-on|expert)$/.test(lemma)) {
      continue;
    }
    const baseWeight =
      classification === "must-have" ? MUST_WEIGHT : NICE_WEIGHT;
    const weight = baseWeight * (1 + Math.log(frequency));
    keywords.push({
      surface,
      lemma,
      classification,
      frequency,
      weight: Math.round(weight * 100) / 100,
    });
  }

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
    { surface: string; classification: "must-have" | "nice-to-have"; frequency: number }
  >,
  surface: string,
  req: JdRequirement,
): void {
  const lemma = lemmatizePhrase(surface);
  if (!lemma) return;
  const existing = buckets.get(lemma);
  if (existing) {
    existing.frequency += 1;
    if (req.classification === "must-have") existing.classification = "must-have";
  } else {
    buckets.set(lemma, {
      surface,
      classification: req.classification,
      frequency: 1,
    });
  }
}
