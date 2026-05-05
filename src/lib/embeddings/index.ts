export { cosineSimilarity, normalize } from "./cosine";
export type {
  Embedder,
  EmbedderProgress,
  EmbedderProgressCallback,
} from "./types";
// MiniLM is a browser-only side import; consumers that need it pull it
// directly from "./transformers".
