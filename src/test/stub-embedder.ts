import type { Embedder } from "@/lib/embeddings/types";
import { normalize } from "@/lib/embeddings/cosine";

/**
 * A deterministic stub embedder for tests. Each input string is hashed to
 * a small fixed-dimensional vector. Strings sharing tokens have higher
 * cosine similarity than unrelated strings, which is the property the
 * semantic engine relies on — without needing to actually load MiniLM
 * (which would be slow and dependent on disk/network state).
 */
export class StubEmbedder implements Embedder {
  readonly dim: number;
  constructor(dim = 32) {
    this.dim = dim;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((t) => this.vectorize(t));
  }

  private vectorize(text: string): Float32Array {
    const v = new Float32Array(this.dim);
    const tokens = text.toLowerCase().match(/[a-z0-9+#./]+/g) ?? [];
    for (const tok of tokens) {
      const h = stringHash(tok);
      const idx = Math.abs(h) % this.dim;
      v[idx] = (v[idx] ?? 0) + 1;
    }
    normalize(v);
    return v;
  }
}

function stringHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}
