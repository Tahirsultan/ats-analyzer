import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native modules that should never be bundled. `@xenova/transformers`
  // is intentionally NOT here — we want it loaded fresh on the client at
  // runtime via a dynamic import (see src/lib/embeddings/transformers.ts).
  serverExternalPackages: ["onnxruntime-node", "sharp"],
  turbopack: {},
};

export default nextConfig;
