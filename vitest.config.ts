import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Default to node so pdfjs-dist and mammoth see the real ArrayBuffer/
    // Buffer realms. React/UI tests can opt into jsdom via a per-file
    // `// @vitest-environment jsdom` pragma at the top of the file.
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
