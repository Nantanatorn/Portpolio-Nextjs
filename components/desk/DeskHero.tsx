"use client";

import { useEffect, useRef } from "react";
import { signal } from "./signals";

export interface DeskScreenText {
  first: string;
  last: string;
  role: string;
}

/**
 * Hero with a low-poly 3D desk behind `children`. three.js is loaded only
 * after hydration, so the text renders first. With the scene running, the
 * wrapper grows to 260svh and scrolling moves the camera into the monitor;
 * `children` can fade with the CSS variable --p (0 → 1). Without WebGL or with
 * reduced motion, it stays a plain one-screen hero.
 */
export function DeskHero({
  screen,
  children,
}: {
  screen: DeskScreenText;
  children?: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const { first, last, role } = screen;

  useEffect(() => {
    const trackEl = track.current;
    const el = host.current;
    if (!trackEl || !el) return;
    // The intro screen waits for "desk:ready"; send it whenever 3D is skipped.
    const ready = () => signal("ready");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ready();
      return;
    }

    let cleanup: (() => void) | null = null;
    let cancelled = false;
    import("./mountDesk")
      .then(({ mountDesk }) => {
        if (cancelled) return;
        signal("loaded");
        cleanup = mountDesk(trackEl, el, { first, last, role });
        if (cleanup) trackEl.setAttribute("data-desk", "");
        else ready();
      })
      .catch(ready);

    return () => {
      cancelled = true;
      cleanup?.();
      trackEl.removeAttribute("data-desk");
    };
  }, [first, last, role]);

  return (
    <div ref={track} data-sky-cover="" className="group/desk relative h-svh data-desk:h-[260svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          ref={host}
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_35%,#1a2433_0%,#0e1218_65%)]"
        />
        {/* Blends the bottom of the scene into the page as the hero scrolls away. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-ink"
          style={{ opacity: "clamp(0, calc(var(--p, 0) * 2 - 1), 1)" }}
        />
        {children}
      </div>
    </div>
  );
}
