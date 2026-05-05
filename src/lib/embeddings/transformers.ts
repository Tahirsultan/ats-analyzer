"use client";

import type { Embedder, EmbedderProgressCallback } from "./types";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const DIM = 384;

/**
 * We load `@xenova/transformers` from esm.sh at runtime instead of letting
 * Next/Turbopack bundle it. The library has top-level `Object.keys(env)`
 * patterns inside its own modules; when the bundler chunks them across
 * Turbopack's evaluation graph the env object is occasionally undefined
 * at evaluation time, which throws "Cannot convert undefined or null to
 * object" before any of our code runs.
 *
 * Loading the prebuilt ESM bundle directly from esm.sh sidesteps the
 * bundler entirely. The string is constructed at runtime so the static
 * analysis can't follow the import. esm.sh serves the package with
 * permissive CORS and is backed by Cloudflare, so this is fast and
 * reliable.
 */
const TRANSFORMERS_CDN_URL = "https://esm.sh/@xenova/transformers@2.17.2";

interface TransformersModule {
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
}

let pipelinePromise: Promise<unknown> | null = null;

async function loadTransformers(): Promise<TransformersModule> {
  // Indirect dynamic import: a string variable defeats the bundler's
  // static module-graph extraction so it doesn't try to chunk the package
  // into the app bundle.
  const url = TRANSFORMERS_CDN_URL;
  const mod = (await import(/* @vite-ignore */ /* webpackIgnore: true */ url)) as
    | TransformersModule
    | { default: TransformersModule };
  // esm.sh sometimes wraps default-only exports; accept either shape.
  const lib =
    typeof (mod as TransformersModule).pipeline === "function"
      ? (mod as TransformersModule)
      : (mod as { default: TransformersModule }).default;
  if (!lib || typeof lib.pipeline !== "function") {
    throw new Error(
      "Loaded transformers.js but it does not expose a `pipeline` function. The CDN response was unexpected.",
    );
  }
  return lib;
}

async function getPipeline(progress?: EmbedderProgressCallback) {
  if (typeof window === "undefined") {
    throw new Error(
      "MiniLM embedder is browser-only. Use a stub embedder in tests/SSR.",
    );
  }
  if (!pipelinePromise) {
    progress?.({ kind: "initializing" });
    pipelinePromise = (async () => {
      const lib = await loadTransformers();
      if (lib.env) {
        lib.env.allowLocalModels = false;
        lib.env.useBrowserCache = true;
      }
      const pipe = await lib.pipeline("feature-extraction", MODEL_ID, {
        quantized: true,
        progress_callback: (event) => {
          if (event && event.status === "progress" && progress) {
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
    if (!out || !out.data) {
      throw new Error(
        "transformers.js feature-extraction returned an unexpected shape (no `.data`).",
      );
    }
    const result: Float32Array[] = [];
    for (let i = 0; i < texts.length; i++) {
      const slice = out.data.slice(i * DIM, (i + 1) * DIM);
      result.push(slice);
    }
    return result;
  }
}

export function preloadMiniLm(progress?: EmbedderProgressCallback): Promise<unknown> {
  return getPipeline(progress);
}
