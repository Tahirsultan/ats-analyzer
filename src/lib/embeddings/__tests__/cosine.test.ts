import { describe, expect, it } from "vitest";
import { cosineSimilarity, normalize } from "../cosine";

describe("cosineSimilarity", () => {
  it("returns 1 for identical unit vectors", () => {
    const a = normalize(new Float32Array([1, 2, 3]));
    const b = normalize(new Float32Array([1, 2, 3]));
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it("returns -1 for opposite vectors", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns NaN for the zero vector", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([1, 1, 1]);
    expect(Number.isNaN(cosineSimilarity(a, b))).toBe(true);
  });

  it("throws on dimension mismatch", () => {
    expect(() =>
      cosineSimilarity(new Float32Array([1, 2]), new Float32Array([1, 2, 3])),
    ).toThrow(/dim mismatch/);
  });
});

describe("normalize", () => {
  it("returns the same vector when already normalized", () => {
    const v = new Float32Array([1, 0, 0]);
    normalize(v);
    expect(Array.from(v)).toEqual([1, 0, 0]);
  });

  it("scales to unit length", () => {
    const v = normalize(new Float32Array([3, 4, 0]));
    expect(Math.hypot(v[0]!, v[1]!, v[2]!)).toBeCloseTo(1, 5);
  });

  it("leaves the zero vector untouched", () => {
    const v = normalize(new Float32Array([0, 0, 0]));
    expect(Array.from(v)).toEqual([0, 0, 0]);
  });
});
