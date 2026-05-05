import "@testing-library/jest-dom/vitest";
import { createRequire } from "node:module";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

// pdfjs requires a workerSrc even when we want it to use the fake-worker
// fallback for Node. Resolving the legacy worker file from the installed
// package makes the test runner happy without coupling production code to
// Node-only paths.
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
);
