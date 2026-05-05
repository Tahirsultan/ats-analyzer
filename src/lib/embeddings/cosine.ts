/**
 * Cosine similarity between two vectors. Both must have the same length.
 *
 * Returns NaN if either vector is the zero vector (undefined direction);
 * callers should treat NaN as "no signal" rather than 0 (which would
 * spuriously claim orthogonality).
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `cosineSimilarity dim mismatch: ${a.length} vs ${b.length}`,
    );
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return Number.NaN;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** L2-normalize a vector in place and return it. */
export function normalize(v: Float32Array): Float32Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i] ?? 0;
    n += x * x;
  }
  if (n === 0) return v;
  const inv = 1 / Math.sqrt(n);
  for (let i = 0; i < v.length; i++) v[i] = (v[i] ?? 0) * inv;
  return v;
}
