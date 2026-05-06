/**
 * Probe (not a real test) — runs the full pipeline against a fixture
 * pair and prints the keyword extraction + matching output. Used to
 * eyeball changes before user sign-off.
 */
import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { analyzeResumeStructure } from "@/lib/resume/structure";
import { parseText } from "@/lib/parsing/text";
import { extractJdKeywords } from "../keywords";
import { computeKeywordMatch } from "../keyword-match";
import { detectDomain } from "../keyword-aliases";
import { loadFixtureText } from "@/test/fixtures";

const PAIRS: Array<{ label: string; jd: string; resume: string }> = [
  {
    label: "Data Engineer",
    jd: "jds/senior-data-engineer.txt",
    resume: "resumes/marcus-chen-data.txt",
  },
  {
    label: "Marketing Manager",
    jd: "jds/marketing-manager-acme.txt",
    resume: "resumes/jane-smith-marketing.txt",
  },
];

describe("PROBE: keyword extractor", () => {
  for (const { label, jd: jdPath, resume: resumePath } of PAIRS) {
    it(`dumps ${label}`, () => {
      const jd = analyzeJobDescription(loadFixtureText(jdPath));
      const keywords = extractJdKeywords(jd);
      const resumeText = loadFixtureText(resumePath);
      const resumeStructure = analyzeResumeStructure(parseText(resumeText));
      const matchResult = computeKeywordMatch(resumeText, keywords, {
        resumeYearsOfExperience: resumeStructure.yearsOfExperience,
      });

      console.log(`\n══════ ${label} ══════`);
      console.log(
        `Domain: ${detectDomain(loadFixtureText(jdPath))} · Resume YOE: ${resumeStructure.yearsOfExperience}\n`,
      );
      console.log(`EXTRACTED ${keywords.length} keywords:`);
      console.log(
        "  Tier            Weight   Freq   Source              Surface (aliases) [extras]",
      );
      console.log("  ".padEnd(95, "─"));
      for (const k of keywords) {
        const aliases = k.aliases.length ? `  [aliases: ${k.aliases.slice(0, 4).join(", ")}${k.aliases.length > 4 ? "…" : ""}]` : "";
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
  }
});
