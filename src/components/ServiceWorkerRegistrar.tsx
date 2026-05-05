"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` once when the analyzer page mounts. The SW caches the
 * MiniLM model files so the second analysis loads instantly. Failures are
 * non-fatal — the app works without the SW, just re-downloads the model
 * each session.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Cache is a perf optimization; silently degrade.
    });
  }, []);
  return null;
}
