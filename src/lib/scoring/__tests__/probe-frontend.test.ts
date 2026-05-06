import { describe, expect, it } from "vitest";
import { analyzeJobDescription } from "@/lib/jd/analyze";
import { extractJdKeywords } from "../keywords";
import { loadFixtureText } from "@/test/fixtures";

describe("PROBE: frontend JD", () => {
  it("dumps all keywords", () => {
    const jd = analyzeJobDescription(
      loadFixtureText("jds/frontend-engineer-novacart.txt"),
    );
    const keywords = extractJdKeywords(jd);
    for (const k of keywords) {
      const tier = k.tier.padEnd(13);
      const src = k.sourceSection.padEnd(18);
      const aliases = k.aliases.length ? ` [${k.aliases.join(",")}]` : "";
      const yoe = k.minYearsOfExperience ? ` YOE≥${k.minYearsOfExperience}` : "";
      const deg = k.matchPattern ? " DEGREE" : "";
      console.log(
        `  ${tier} ${src} ${k.surface}${aliases}${yoe}${deg}`,
      );
    }
    expect(true).toBe(true);
  });
});
