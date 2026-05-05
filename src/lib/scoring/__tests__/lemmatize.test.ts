import { describe, expect, it } from "vitest";
import {
  aggressiveStem,
  lemmatizePhrase,
  lemmatizeTokens,
  phraseAppearsIn,
} from "../lemmatize";

describe("lemmatizeTokens", () => {
  it("singularizes regular plurals via compromise", () => {
    const tokens = lemmatizeTokens("queries databases servers topics");
    expect(tokens).toContain("query");
    expect(tokens).toContain("database");
    expect(tokens).toContain("server");
    expect(tokens).toContain("topic");
  });

  it("collapses irregular verbs via compromise (run / ran / running)", () => {
    expect(lemmatizeTokens("ran")).toContain("run");
    expect(lemmatizeTokens("running")).toContain("run");
  });

  it("preserves tech tokens with internal punctuation and end-punct", () => {
    const tokens = lemmatizeTokens("c++ node.js ci/cd c#");
    expect(tokens).toContain("c++");
    expect(tokens).toContain("node.js");
    expect(tokens).toContain("ci/cd");
    expect(tokens).toContain("c#");
  });

  it("returns empty for empty input", () => {
    expect(lemmatizeTokens("")).toEqual([]);
  });
});

describe("aggressiveStem", () => {
  it("collapses verb tense forms to a shared stem", () => {
    expect(aggressiveStem("manage")).toBe(aggressiveStem("managed"));
    expect(aggressiveStem("managed")).toBe(aggressiveStem("managing"));
  });

  it("collapses noun plural forms to a shared stem", () => {
    expect(aggressiveStem("server")).toBe(aggressiveStem("servers"));
  });

  it("does not over-stem short tokens", () => {
    expect(aggressiveStem("the")).toBe("the");
    expect(aggressiveStem("a")).toBe("a");
  });
});

describe("lemmatizePhrase", () => {
  it("joins lemmatized tokens with single spaces", () => {
    expect(lemmatizePhrase("Managing Databases")).toBe("manage database");
  });
});

describe("phraseAppearsIn", () => {
  const haystack = lemmatizeTokens(
    "Managed PostgreSQL clusters and ran queries on Kafka topics",
  );

  it("matches verb-tense variants of a single-token phrase", () => {
    expect(phraseAppearsIn("queries", haystack)).toBe(true);
    expect(phraseAppearsIn("query", haystack)).toBe(true);
    expect(phraseAppearsIn("manage", haystack)).toBe(true);
    expect(phraseAppearsIn("managing", haystack)).toBe(true);
  });

  it("matches a contiguous multi-token phrase", () => {
    expect(phraseAppearsIn("PostgreSQL clusters", haystack)).toBe(true);
    expect(phraseAppearsIn("Kafka topics", haystack)).toBe(true);
  });

  it("rejects phrases that aren't contiguous", () => {
    expect(phraseAppearsIn("PostgreSQL Kafka", haystack)).toBe(false);
  });

  it("returns false for empty needles", () => {
    expect(phraseAppearsIn("", haystack)).toBe(false);
  });
});
