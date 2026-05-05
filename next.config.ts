import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js + onnxruntime-web ship native modules (`sharp`,
  // `onnxruntime-node`) that should never land in the client bundle. We
  // mark them as server-external so Next leaves them outside the bundle on
  // the server, and Turbopack's tree-shaking keeps them out of client.
  serverExternalPackages: [
    "@xenova/transformers",
    "onnxruntime-node",
    "sharp",
  ],
  // Empty Turbopack config silences the "you have a webpack config but Next
  // 16 uses Turbopack" warning. We don't currently need any custom Turbopack
  // rules — the model-only-on-client guarantee comes from the dynamic
  // import inside `src/lib/embeddings/transformers.ts`.
  turbopack: {},
};

export default nextConfig;
