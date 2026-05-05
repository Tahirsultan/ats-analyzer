"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const MOBILE_QUERY = "(max-width: 768px)";

/**
 * useSyncExternalStore is the post-hydration-safe way to read media
 * queries: server-side it returns the explicit fallback (false), and after
 * hydration it transitions to the real value with no setState-in-effect
 * pattern that the React lint rule disallows.
 */
function useMatchMedia(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function getOverrideSnapshot(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem("mobile-gate-override") === "1";
}

/**
 * Wraps a desktop-first experience and shows a "this works best on
 * desktop" message on small viewports. Clicking "Continue anyway" stores a
 * session-scoped override.
 */
export function MobileGate({ children }: { children: React.ReactNode }) {
  const isMobile = useMatchMedia(MOBILE_QUERY);
  // Lazy init reads sessionStorage on first render, after which the value
  // is owned by component state. Safe because sessionStorage is synchronous.
  const [override, setOverride] = useState<boolean>(getOverrideSnapshot);

  if (!isMobile || override) return <>{children}</>;

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <div className="rounded-2xl border border-border bg-muted/40 p-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Best viewed on desktop
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The analyzer parses PDFs and runs a language model in your browser.
          That experience is built for a wider screen — comparison views,
          charts, and the gap-analysis report all assume desktop layout.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open this page on a laptop or desktop for the intended experience,
          or continue here at your own discretion.
        </p>
        <div className="mt-6">
          <Button
            onClick={() => {
              sessionStorage.setItem("mobile-gate-override", "1");
              setOverride(true);
            }}
          >
            Continue anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
