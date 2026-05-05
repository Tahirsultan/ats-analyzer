/**
 * The minimal contract every embedder must satisfy. Tests inject a stub
 * implementation that returns deterministic vectors; production code uses
 * the transformers.js + MiniLM implementation.
 *
 * Keeping the surface this small means the scoring engine never imports
 * the model loader directly — that's the only way to keep tests fast and
 * builds free of WASM dependencies.
 */
export interface Embedder {
  /**
   * Embed a batch of strings into unit-length vectors. Order of the output
   * matches the order of the input.
   */
  embed(texts: string[]): Promise<Float32Array[]>;
  /** Dimensionality of the embedding (e.g. 384 for MiniLM-L6-v2). */
  readonly dim: number;
}

/** Reports model-download progress while the embedder is initializing. */
export type EmbedderProgress =
  | { kind: "initializing" }
  | { kind: "downloading"; bytesLoaded: number; bytesTotal?: number }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export type EmbedderProgressCallback = (event: EmbedderProgress) => void;
