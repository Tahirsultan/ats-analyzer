"use client";

import type { Embedder, EmbedderProgressCallback } from "./types";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const DIM = 384;

let pipelinePromise: Promise<unknown> | null = null;

/**
 * Lazy-load the MiniLM feature-extraction pipeline. We hold a singleton in
 * a module-level promise so multiple analyses share the same model, the
 * model file is downloaded at most once per session, and we never import
 * `@xenova/transformers` until the user actually starts an analysis (it
 * pulls in WASM + tokenizer code worth ~3MB on top of the model itself).
 */
async function getPipeline(progress?: EmbedderProgressCallback) {
  if (typeof window === "undefined") {
    throw new Error(
      "MiniLM embedder is browser-only. Use a stub embedder in tests/SSR.",
    );
  }
  if (!pipelinePromise) {
    progress?.({ kind: "initializing" });
    pipelinePromise = (async () => {
      const transformers = await import("@xenova/transformers");
      const { pipeline, env } = transformers as unknown as {
        pipeline: (
          task: string,
          model: string,
          opts: {
            quantized: boolean;
            progress_callback?: (p: {
              status: string;
              progress?: number;
              loaded?: number;
              total?: number;
            }) => void;
          },
        ) => Promise<unknown>;
        env: { allowLocalModels: boolean; useBrowserCache: boolean };
      };
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const pipe = await pipeline("feature-extraction", MODEL_ID, {
        quantized: true,
        progress_callback: (event) => {
          if (event.status === "progress" && progress) {
            progress({
              kind: "downloading",
              bytesLoaded: event.loaded ?? 0,
              bytesTotal: event.total,
            });
          }
        },
      });
      progress?.({ kind: "ready" });
      return pipe;
    })().catch((err: unknown) => {
      pipelinePromise = null;
      progress?.({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    });
  }
  return pipelinePromise;
}

export class MiniLmEmbedder implements Embedder {
  readonly dim = DIM;
  private readonly progress?: EmbedderProgressCallback;

  constructor(progress?: EmbedderProgressCallback) {
    this.progress = progress;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const pipe = (await getPipeline(this.progress)) as unknown as (
      input: string | string[],
      opts: { pooling: "mean"; normalize: boolean },
    ) => Promise<{
      data: Float32Array;
      dims: number[];
    }>;
    const out = await pipe(texts, { pooling: "mean", normalize: true });
    // out.data is a flat Float32Array of size [batch, dim]; split it.
    const result: Float32Array[] = [];
    for (let i = 0; i < texts.length; i++) {
      const slice = out.data.slice(i * DIM, (i + 1) * DIM);
      result.push(slice);
    }
    return result;
  }
}

/**
 * Convenience: warm the model up so the first analysis doesn't block on
 * download. Safe to call multiple times — it's idempotent.
 */
export function preloadMiniLm(progress?: EmbedderProgressCallback): Promise<unknown> {
  return getPipeline(progress);
}
