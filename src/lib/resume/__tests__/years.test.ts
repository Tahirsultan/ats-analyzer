import { describe, expect, it } from "vitest";
import { computeYearsOfExperience } from "../years";
import type { ExperienceEntry } from "../types";

function entry(start: [number, number], end: [number, number] | null): ExperienceEntry {
  return {
    rawHeader: "",
    bullets: [],
    current: end === null,
    startDate: { year: start[0], month: start[1] },
    endDate: end ? { year: end[0], month: end[1] } : { year: start[0], month: start[1] },
  };
}

describe("computeYearsOfExperience", () => {
  it("returns 0 for no entries", () => {
    expect(computeYearsOfExperience([])).toBe(0);
  });

  it("sums non-overlapping entries", () => {
    const entries: ExperienceEntry[] = [
      entry([2018, 1], [2019, 12]), // 23 months → ~1.9
      entry([2020, 6], [2022, 6]), // 24 months → 2.0
    ];
    expect(computeYearsOfExperience(entries)).toBeCloseTo(3.9, 1);
  });

  it("merges overlapping ranges to avoid double-counting", () => {
    const entries: ExperienceEntry[] = [
      entry([2020, 1], [2022, 12]), // 35 months
      entry([2021, 6], [2022, 6]), // 12 months, fully inside
    ];
    // Only the outer 35-month range counts: 35/12 = 2.92 → 2.9
    expect(computeYearsOfExperience(entries)).toBeCloseTo(2.9, 1);
  });

  it("merges adjacent and partially overlapping ranges", () => {
    const entries: ExperienceEntry[] = [
      entry([2018, 1], [2020, 6]),
      entry([2020, 1], [2022, 12]),
    ];
    // Merged: 2018-01 .. 2022-12 = 59 months / 12 = 4.92 → 4.9
    expect(computeYearsOfExperience(entries)).toBeCloseTo(4.9, 1);
  });

  it("rounds to one decimal place", () => {
    const entries: ExperienceEntry[] = [entry([2020, 1], [2020, 12])];
    expect(computeYearsOfExperience(entries)).toBeCloseTo(0.9, 1);
  });
});
