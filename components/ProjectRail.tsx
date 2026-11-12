"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { DragScroller, EDGE } from "./DragScroller";

const WRAP = "mx-auto w-full max-w-7xl px-4 sm:px-6";

// Pinned, scroll-driven mode needs a mouse, room for the cards, and motion.
const PINNED_QUERY =
  "(min-width: 768px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(PINNED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getPinned = () => window.matchMedia(PINNED_QUERY).matches;
const getServerPinned = () => false;

/**
 * Horizontal project cards. On desktop the section pins while the page
 * scrolls, and vertical scrolling slides the cards sideways with easing.
 * Elsewhere it is a swipe/drag scroller.
 */
export function ProjectRail({
  heading,
  hints,
  children,
}: {
  heading: React.ReactNode;
  hints: { swipe: string; scroll: string };
  children: React.ReactNode;
}) {
  const pinned = useSyncExternalStore(subscribe, getPinned, getServerPinned);
  const outer = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const metrics = useRef({ distance: 0, pad: 0 });

  useEffect(() => {
    if (!pinned) return;
    const o = outer.current;
    const r = rail.current;
    const b = bar.current;
    if (!o || !r || !b) return;

    const measure = () => {
      const last = r.lastElementChild as HTMLElement | null;
      const pad = parseFloat(getComputedStyle(r).paddingLeft) || 0;
      const distance = last
        ? Math.max(0, last.offsetLeft + last.offsetWidth + pad - r.clientWidth)
        : 0;
      metrics.current = { distance, pad };
      // Extra page height equal to the sideways travel: 1px down = 1px across.
      o.style.height = distance > 0 ? `${window.innerHeight + distance}px` : "";
      b.parentElement!.hidden = distance === 0;
    };

    const target = () => {
      const top = o.getBoundingClientRect().top;
      return Math.min(metrics.current.distance, Math.max(0, -top));
    };

    let current = 0;
    let raf = 0;
    let running = false;
    const tick = () => {
      const t = target();
      current += (t - current) * 0.14;
      if (Math.abs(t - current) < 0.3) current = t;
      const { distance } = metrics.current;
      r.style.transform = `translate3d(${-current}px, 0, 0)`;
      b.style.transform = `scaleX(${distance ? current / distance : 0})`;
      if (current === t) {
        running = false;
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    const kick = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    measure();
    current = target();
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    const onResize = () => {
      measure();
      kick();
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(r);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      o.style.height = "";
      r.style.transform = "";
    };
  }, [pinned]);

  // Tabbing to a card that is off to the side scrolls the page to it.
  function onFocus(e: React.FocusEvent<HTMLDivElement>) {
    const o = outer.current;
    const card = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-rail-item]",
    );
    if (!o || !card) return;
    const { distance, pad } = metrics.current;
    const want = Math.min(distance, Math.max(0, card.offsetLeft - pad));
    const top = window.scrollY + o.getBoundingClientRect().top + want;
    if (Math.abs(window.scrollY - top) > 2) window.scrollTo({ top });
  }

  const header = (hint: string) => (
    <div className={`${WRAP} flex flex-wrap items-end justify-between gap-4`}>
      {heading}
      <p className="pb-2 font-mono text-xs text-mist">{hint}</p>
    </div>
  );

  if (!pinned) {
    return (
      <div className="py-16 sm:py-24 lg:py-32">
        {header(hints.swipe)}
        <div className="mt-12">
          <DragScroller>{children}</DragScroller>
        </div>
      </div>
    );
  }

  return (
    <div ref={outer} className="relative">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-clip pt-16">
        {header(hints.scroll)}
        <div
          ref={rail}
          onFocusCapture={onFocus}
          style={{ paddingInline: EDGE }}
          className="relative mt-8 sm:mt-12 flex gap-5 will-change-transform"
        >
          {children}
        </div>
        <div className={`${WRAP} mt-10`}>
          <div className="relative h-px bg-line">
            <div
              ref={bar}
              className="absolute inset-0 origin-left bg-accent"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
