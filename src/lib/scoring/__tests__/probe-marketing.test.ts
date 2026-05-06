/**
 * Probe (not a real test) — runs the full pipeline against the
 * Marketing Manager fixture and prints the keyword extraction +
 * matching output. Used to eyeball changes before user sign-off.
 */
import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { analyzeResumeStructure } from "@/lib/resume/structure";
import { parseText } from "@/lib/parsing/text";
import { extractJdKeywords } from "../keywords";
import { computeKeywordMatch } from "../keyword-match";
import { loadFixtureText } from "@/test/fixtures";

describe("PROBE: marketing keyword extractor", () => {
  it("dumps the extractor + matcher output", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/marketing-manager-acme.txt"),
    );
    const keywords = extractJdKeywords(jd);
    const resumeText = loadFixtureText("resumes/jane-smith-marketing.txt");
    const resumeStructure = analyzeResumeStructure(parseText(resumeText));
    const matchResult = computeKeywordMatch(resumeText, keywords, {
      resumeYearsOfExperience: resumeStructure.yearsOfExperience,
    });

    console.log(`\nResume YOE: ${resumeStructure.yearsOfExperience}\n`);
    console.log(`EXTRACTED ${keywords.length} keywords:\n`);
    console.log(
      "  Tier            Weight   Freq   Source              Surface (aliases) [extras]",
    );
    console.log("  ".padEnd(95, "─"));
    for (const k of keywords) {
      const aliases = k.aliases.length ? `  [aliases: ${k.aliases.join(", ")}]` : "";
      const yoe = k.minYearsOfExperience ? ` [YOE≥${k.minYearsOfExperience}]` : "";
      const degree = k.matchPattern ? " [DEGREE-REGEX]" : "";
      const tier = k.tier.padEnd(13);
      const weight = k.weight.toFixed(2).padStart(6);
      const freq = String(k.frequency).padStart(4);
      const source = k.sourceSection.padEnd(18);
      console.log(
        `  ${tier}   ${weight}    ${freq}   ${source}      ${k.surface}${aliases}${yoe}${degree}`,
      );
    }

    console.log(
      `\nMATCH: ${matchResult.matched.length} matched / ${matchResult.missing.length} missing  ·  score ${matchResult.score}/100`,
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
