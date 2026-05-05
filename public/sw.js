// Service worker for caching the transformers.js MiniLM model files. The
// model lives at huggingface.co; we cache once on first download and serve
// from the cache thereafter so the second analysis is instant.
//
// We deliberately scope the fetch interceptor narrowly to model URLs to
// avoid surprising any other request the page makes.

const CACHE_NAME = "ats-analyzer-models-v1";
const MODEL_URL_PATTERNS = [
  /^https:\/\/huggingface\.co\/.*\/resolve\//,
  /^https:\/\/cdn-lfs\.huggingface\.co\//,
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any stale model caches from previous versions.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("ats-analyzer-models-") && n !== CACHE_NAME)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  if (event.request.method !== "GET") return;
  if (!MODEL_URL_PATTERNS.some((re) => re.test(url))) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const response = await fetch(event.request);
      // Only cache complete, successful responses. Range requests (206)
      // would corrupt the cache for large model files.
      if (response.status === 200) {
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    })(),
  );
});
