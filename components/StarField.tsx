"use client";

import { useEffect, useRef } from "react";

// Starry night sky behind the page, with the occasional shooting star.
// three.js loads after hydration; without WebGL the flat ink background stays.
export function StarField() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cleanup: (() => void) | null = null;
    let cancelled = false;
    import("./desk/mountStars").then(({ mountStars }) => {
      if (!cancelled) cleanup = mountStars(el, reduced);
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
