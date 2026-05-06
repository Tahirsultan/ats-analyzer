/**
 * Probe (not a real test) — runs the extractor on the Marketing Manager
 * fixture and prints every extracted keyword with its tier, weight,
 * source section, and aliases. Used to eyeball the extractor's output
 * before the user signs off on the upgrade.
 */
import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { extractJdKeywords } from "../keywords";
import { computeKeywordMatch } from "../keyword-match";
import { loadFixtureText } from "@/test/fixtures";

describe("PROBE: marketing keyword extractor", () => {
  it("dumps the extractor output", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/marketing-manager-acme.txt"),
    );
    const keywords = extractJdKeywords(jd);
    const resumeText = loadFixtureText("resumes/jane-smith-marketing.txt");
    const matchResult = computeKeywordMatch(resumeText, keywords);

    console.log(`\nEXTRACTED ${keywords.length} keywords:\n`);
    console.log(
      "  Tier            Weight   Freq   Source                    Surface (aliases)",
    );
    console.log("  ".padEnd(85, "─"));
    for (const k of keywords) {
      const aliases = k.aliases.length ? `  [aliases: ${k.aliases.join(", ")}]` : "";
      const tier = k.tier.padEnd(13);
      const weight = k.weight.toFixed(2).padStart(6);
      const freq = String(k.frequency).padStart(4);
      const source = k.sourceSection.padEnd(20);
      console.log(`  ${tier}   ${weight}    ${freq}   ${source}      ${k.surface}${aliases}`);
    }

    console.log(
      `\nMATCH RESULT: ${matchResult.matched.length} matched / ${matchResult.missing.length} missing  ·  score ${matchResult.score}/100`,
    );
    console.log(
      `Total weight ${matchResult.totalWeight}, matched weight ${matchResult.matchedWeight}\n`,
    );
    console.log("MATCHED:");
    for (const m of matchResult.matched) {
      console.log(`  ✓  ${m.surface}  →  "${m.foundIn}"`);
    }
    console.log("\nMISSING:");
    for (const m of matchResult.missing) {
      console.log(`  ✗  ${m.surface}  [${m.tier}, weight ${m.weight}]`);
    }
    expect(true).toBe(true);
  });
});
