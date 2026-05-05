import nlp from "compromise";

/**
 * Lemmatize a string into canonical token forms (lowercased, plural-singular
 * collapsed via compromise's `compute('root')`). This pass is conservative:
 * it does NOT collapse verb tenses like "managed"→"manage" because
 * compromise can't tag past tense without rich context.
 *
 * Tense collapse happens at match time via `phraseAppearsIn`, which
 * additionally runs `aggressiveStem` on both sides — so the *display* lemma
 * stays human-readable ("kubernetes", "experience") while the *match* logic
 * still treats "manage"/"managed"/"managing" as the same root.
 *
 * Tech tokens (`c++`, `c#`, `node.js`, `ci/cd`) bypass compromise entirely
 * since the tokenizer would split them on punctuation.
 */
export function lemmatizeTokens(text: string): string[] {
  if (!text) return [];

  const out: string[] = [];
  for (const rawToken of text.split(/\s+/)) {
    if (!rawToken) continue;
    if (isTechToken(rawToken)) {
      out.push(stripOuterPunct(rawToken).toLowerCase());
      continue;
    }
    const doc = nlp(rawToken);
    doc.compute("root");
    const json = doc.terms().json() as Array<{
      terms?: Array<{ normal?: string; root?: string }>;
    }>;
    for (const sentence of json) {
      for (const term of sentence.terms ?? []) {
        const lemma = (term.root ?? term.normal ?? "").toLowerCase();
        const cleaned = lemma.replace(/[^a-z0-9]/g, "");
        if (cleaned) out.push(cleaned);
      }
    }
  }
  return out;
}

function isTechToken(token: string): boolean {
  if (!/[a-zA-Z]/.test(token)) return false;
  // letter + (++|#) at end (c++, c#)
  if (/[a-zA-Z][+#]+$/.test(token)) return true;
  // letter or digit on both sides of `+`, `#`, `.`, `/` (node.js, ci/cd)
  if (/[a-zA-Z0-9][+#./][a-zA-Z0-9]/.test(token)) return true;
  return false;
}

function stripOuterPunct(token: string): string {
  return token.replace(/^[^\w+#./-]+|[^\w+#./-]+$/g, "");
}

/**
 * Strip regular inflectional suffixes and trailing silent `e` so verb forms
 * collapse: manage/managed/managing → "manag". This is intentionally
 * aggressive — it mangles individual nouns (database → databas) but only
 * runs during matching where both sides get the same treatment.
 */
export function aggressiveStem(word: string): string {
  let w = word;
  if (w.length <= 3) return w;

  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("ss")) {
    /* keep */
  } else if (w.endsWith("es") && w.length > 3) w = w.slice(0, -2);
  else if (
    w.endsWith("s") &&
    w.length > 3 &&
    !w.endsWith("us") &&
    !w.endsWith("is")
  ) {
    w = w.slice(0, -1);
  }

  if (w.endsWith("eed") && w.length > 4) w = w.slice(0, -1);
  else if (w.endsWith("ed") && w.length > 3 && hasVowelBefore(w, 2)) {
    w = w.slice(0, -2);
  } else if (w.endsWith("ing") && w.length > 4 && hasVowelBefore(w, 3)) {
    w = w.slice(0, -3);
  }

  if (w.endsWith("e") && w.length > 3) w = w.slice(0, -1);
  return w;
}

function hasVowelBefore(word: string, suffixLen: number): boolean {
  const stem = word.slice(0, word.length - suffixLen);
  return /[aeiouy]/.test(stem);
}

/** Lemmatize a multi-word phrase, joining tokens with single spaces. */
export function lemmatizePhrase(phrase: string): string {
  return lemmatizeTokens(phrase).join(" ");
}

/** Build a Set of lemmatized tokens from a body of text. */
export function lemmatizedTokenSet(text: string): Set<string> {
  return new Set(lemmatizeTokens(text));
}

/**
 * Check whether `phrase` (lemmatized) appears as a contiguous run of tokens
 * inside `tokens` (already lemmatized). Both sides are aggressively stemmed
 * before comparison so verb tense and plural variants collapse.
 */
export function phraseAppearsIn(
  phrase: string,
  tokens: string[],
): boolean {
  const phraseTokens = lemmatizeTokens(phrase).map(aggressiveStem);
  const haystackStems = tokens.map(aggressiveStem);
  if (phraseTokens.length === 0) return false;
  if (phraseTokens.length === 1) {
    return haystackStems.includes(phraseTokens[0]!);
  }
  for (let i = 0; i <= haystackStems.length - phraseTokens.length; i++) {
    let matched = true;
    for (let j = 0; j < phraseTokens.length; j++) {
      if (haystackStems[i + j] !== phraseTokens[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}
