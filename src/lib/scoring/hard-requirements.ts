import type { JdAnalysis, JdRequirement, JdSection } from "@/lib/jd/types";
import type { ResumeStructure } from "@/lib/resume/types";
import type {
  HardRequirement,
  HardRequirementCode,
  HardRequirementsResult,
} from "./types";

/**
 * Extract the structured hard requirements from a JD. Each extracted
 * requirement is paired with its source bullet for traceability.
 */
export function extractHardRequirements(analysis: JdAnalysis): JdHardRequirements {
  const allText = analysis.sections.flatMap((s) => s.lines).join("\n");
  return {
    minYears: extractMinYears(analysis.requirements),
    degree: extractDegreeRequirement(analysis.requirements),
    certifications: extractCertificationRequirements(analysis.requirements),
    workAuth:
      extractWorkAuthRequirement(analysis.requirements) ??
      extractWorkAuthFromText(allText),
    travel:
      extractTravelRequirement(analysis.requirements) ??
      extractTravelFromSections(analysis.sections),
  };
}

export interface JdHardRequirements {
  minYears: { years: number; sourceText: string } | null;
  degree: {
    minLevel: DegreeLevel;
    fields: string[];
    sourceText: string;
  } | null;
  certifications: { keyword: string; sourceText: string }[];
  workAuth: { sourceText: string } | null;
  travel: { maxPercent: number | null; sourceText: string } | null;
}

export type DegreeLevel = "bachelor" | "master" | "phd" | "associate" | "mba";

const DEGREE_LEVEL_RANK: Record<DegreeLevel, number> = {
  associate: 1,
  bachelor: 2,
  mba: 3,
  master: 3,
  phd: 4,
};

// Two-letter abbreviations require periods: bare "MA" / "BS" / "AS" collide
// with US state abbreviations and other tokens ("Boston, MA" should not be
// mistaken for a Master's degree). Resumes that omit the periods need to
// spell the degree out (Master's / Bachelor's) for us to detect it.
const DEGREE_PATTERNS: Array<[DegreeLevel, RegExp]> = [
  ["phd", /(?:^|[^a-z])(?:ph\.?\s*d\.?|doctorate|doctoral)(?![a-z])/i],
  ["mba", /(?:^|[^a-z])(?:m\.b\.a\.?|mba)(?![a-z])/i],
  ["master", /(?:^|[^a-z])(?:masters?|m\.s\.?|m\.a\.?|m\.eng\.?)(?![a-z])/i],
  ["bachelor", /(?:^|[^a-z])(?:bachelors?|b\.s\.?|b\.a\.?|b\.eng\.?|b\.tech)(?![a-z])/i],
  ["associate", /(?:^|[^a-z])(?:associate'?s?\s+degree|a\.a\.?|a\.s\.?)(?![a-z])/i],
];

const FIELD_PATTERNS = [
  /\b(computer science|software engineering|electrical engineering|engineering|statistics|mathematics|economics|physics|data science|information systems|computer engineering)\b/gi,
];

function extractMinYears(reqs: JdRequirement[]): JdHardRequirements["minYears"] {
  let best: { years: number; sourceText: string } | null = null;
  for (const req of reqs) {
    if (req.classification !== "must-have") continue;
    const match = req.text.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/i);
    if (!match) continue;
    const yearsStr = match[1];
    if (!yearsStr) continue;
    const years = parseInt(yearsStr, 10);
    if (!Number.isFinite(years)) continue;
    if (!best || years > best.years) {
      best = { years, sourceText: req.text };
    }
  }
  return best;
}

/**
 * For each must-have requirement, find every degree level mentioned in its
 * text — not just the first. Common JD phrasing "M.S. or Ph.D. in
 * Statistics" should yield both `master` and `phd`, with `master` becoming
 * the minimum required level.
 */
function extractDegreeRequirement(
  reqs: JdRequirement[],
): JdHardRequirements["degree"] {
  let lowest: { level: DegreeLevel; sourceText: string } | null = null;
  const fieldSet = new Set<string>();
  for (const req of reqs) {
    if (req.classification !== "must-have") continue;
    const matches: DegreeLevel[] = [];
    for (const [level, pattern] of DEGREE_PATTERNS) {
      if (pattern.test(req.text)) matches.push(level);
    }
    if (matches.length === 0) continue;
    for (const level of matches) {
      if (!lowest || DEGREE_LEVEL_RANK[level] < DEGREE_LEVEL_RANK[lowest.level]) {
        lowest = { level, sourceText: req.text };
      }
    }
    for (const fp of FIELD_PATTERNS) {
      fp.lastIndex = 0;
      let match;
      while ((match = fp.exec(req.text)) !== null) {
        const m = match[1];
        if (m) fieldSet.add(m.toLowerCase());
      }
    }
  }
  if (!lowest) return null;
  return {
    minLevel: lowest.level,
    fields: Array.from(fieldSet),
    sourceText: lowest.sourceText,
  };
}

function extractCertificationRequirements(
  reqs: JdRequirement[],
): JdHardRequirements["certifications"] {
  const out: { keyword: string; sourceText: string }[] = [];
  for (const req of reqs) {
    if (req.classification !== "must-have") continue;
    if (!/certif/i.test(req.text)) continue;
    // Try to extract a compact name: a known cert provider followed by
    // "Certified" plus 1-4 capitalized words. Falls back to the bullet
    // lead-in if no provider matches.
    const named = req.text.match(
      /\b((?:AWS|Azure|GCP|Google|Microsoft|Cisco|CompTIA|PMP|CFA|CPA|Scrum|Salesforce)\s+(?:Certified\s+)?[A-Z][A-Za-z0-9 +#./-]+?)(?=\s+(?:[–-]|or |is |required|prior)|[.,;]|$)/,
    );
    if (named && named[1]) {
      out.push({ keyword: named[1].trim(), sourceText: req.text });
    } else {
      // Take everything up to the first "is required" / "required" / "is
      // expected" or first sentence boundary as the cert keyword.
      const trimmed = req.text.replace(/\s*(?:is|are)\s+required.*$/i, "").trim();
      out.push({ keyword: trimmed || req.text.trim(), sourceText: req.text });
    }
  }
  return out;
}

const WORK_AUTH_RE =
  /\b(authorized to work|work authorization|eligible to work|no sponsorship|not (?:be )?eligible for sponsorship|work permit|legally authorized|without sponsorship)\b/i;

function extractWorkAuthRequirement(
  reqs: JdRequirement[],
): JdHardRequirements["workAuth"] {
  for (const req of reqs) {
    if (WORK_AUTH_RE.test(req.text)) {
      return { sourceText: req.text };
    }
  }
  return null;
}

function extractWorkAuthFromText(text: string): JdHardRequirements["workAuth"] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (WORK_AUTH_RE.test(s)) return { sourceText: s.trim() };
  }
  return null;
}

const TRAVEL_PCT_RE = /\b(?:up to\s*)?(\d{1,3})\s*%\s*travel\b/i;
const TRAVEL_GENERIC_RE = /\btravel\s+(?:required|expected)\b/i;

function extractTravelRequirement(
  reqs: JdRequirement[],
): JdHardRequirements["travel"] {
  for (const req of reqs) {
    const m = req.text.match(TRAVEL_PCT_RE);
    if (m && m[1]) {
      const pct = parseInt(m[1], 10);
      return {
        maxPercent: Number.isFinite(pct) ? pct : null,
        sourceText: req.text,
      };
    }
    if (TRAVEL_GENERIC_RE.test(req.text)) {
      return { maxPercent: null, sourceText: req.text };
    }
  }
  return null;
}

function extractTravelFromSections(
  sections: JdSection[],
): JdHardRequirements["travel"] {
  for (const section of sections) {
    const text = section.lines.join(" ");
    const m = text.match(TRAVEL_PCT_RE);
    if (m && m[1]) {
      const pct = parseInt(m[1], 10);
      return {
        maxPercent: Number.isFinite(pct) ? pct : null,
        sourceText: text.trim(),
      };
    }
    if (TRAVEL_GENERIC_RE.test(text)) {
      return { maxPercent: null, sourceText: text.trim() };
    }
  }
  return null;
}

/**
 * Check the resume against extracted hard requirements. Each requirement
 * resolves to passed=true/false with a free-text detail.
 */
export function checkHardRequirements(
  resume: ResumeStructure,
  jd: JdHardRequirements,
): HardRequirementsResult {
  const requirements: HardRequirement[] = [];

  if (jd.minYears) {
    const passed = resume.yearsOfExperience >= jd.minYears.years;
    requirements.push(
      buildReq(
        "years-of-experience",
        jd.minYears.sourceText,
        passed,
        `Resume shows ${resume.yearsOfExperience}y; JD requires ${jd.minYears.years}+y.`,
      ),
    );
  }

  if (jd.degree) {
    const resumeDegree = detectResumeDegree(resume);
    const levelPasses = resumeDegree
      ? DEGREE_LEVEL_RANK[resumeDegree.level] >=
        DEGREE_LEVEL_RANK[jd.degree.minLevel]
      : false;
    requirements.push(
      buildReq(
        "degree-level",
        jd.degree.sourceText,
        levelPasses,
        resumeDegree
          ? `Resume has ${resumeDegree.level}; JD requires ${jd.degree.minLevel} or higher.`
          : `No degree detected in resume; JD requires ${jd.degree.minLevel} or higher.`,
      ),
    );
    if (jd.degree.fields.length > 0) {
      const matchedField = jd.degree.fields.find((field) =>
        new RegExp(`\\b${escapeRegex(field)}\\b`, "i").test(
          resume.document.text,
        ),
      );
      requirements.push(
        buildReq(
          "degree-field",
          jd.degree.sourceText,
          !!matchedField,
          matchedField
            ? `Resume mentions degree field "${matchedField}".`
            : `Resume does not mention any of: ${jd.degree.fields.join(", ")}.`,
        ),
      );
    }
  }

  for (const cert of jd.certifications) {
    const passed = certInResume(cert.keyword, resume.document.text);
    requirements.push(
      buildReq(
        "certification",
        cert.sourceText,
        passed,
        passed
          ? `Resume references the certification.`
          : `Required certification not detected: "${cert.keyword}".`,
      ),
    );
  }

  if (jd.workAuth) {
    requirements.push(
      buildReq(
        "work-authorization",
        jd.workAuth.sourceText,
        true,
        "Work authorization is asserted by the candidate; verify in interview.",
      ),
    );
  }

  if (jd.travel) {
    requirements.push(
      buildReq(
        "travel",
        jd.travel.sourceText,
        true,
        jd.travel.maxPercent !== null
          ? `JD specifies up to ${jd.travel.maxPercent}% travel; verify candidate availability.`
          : `JD mentions travel; verify candidate availability.`,
      ),
    );
  }

  if (requirements.length === 0) {
    return { score: 100, requirements: [] };
  }
  const passed = requirements.filter((r) => r.passed).length;
  const score = Math.round((passed / requirements.length) * 100);
  return { score, requirements };
}

function buildReq(
  code: HardRequirementCode,
  description: string,
  passed: boolean,
  detail: string,
): HardRequirement {
  return { code, description, passed, detail };
}

function detectResumeDegree(
  resume: ResumeStructure,
): { level: DegreeLevel } | null {
  const text = resume.document.text;
  let highest: DegreeLevel | null = null;
  for (const [level, pattern] of DEGREE_PATTERNS) {
    if (pattern.test(text)) {
      if (!highest || DEGREE_LEVEL_RANK[level] > DEGREE_LEVEL_RANK[highest]) {
        highest = level;
      }
    }
  }
  if (!highest) return null;
  return { level: highest };
}

function certInResume(certText: string, resumeText: string): boolean {
  const cleaned = certText.replace(/[^A-Za-z0-9 ]+/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  for (let n = Math.min(4, tokens.length); n >= 2; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const phrase = tokens.slice(i, i + n).join(" ");
      if (/^(the|a|an|to|of|in|on|or|and|with|by|for)$/i.test(tokens[i] ?? "")) {
        continue;
      }
      if (new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i").test(resumeText)) {
        return true;
      }
    }
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
