"use client";

import { useEffect, useRef } from "react";
import type { RoomData } from "./mountRoom";
import { signal } from "./signals";

const PANEL =
  "no-scrollbar pointer-events-auto max-h-[72svh] w-full max-w-[min(36rem,calc(50vw-1.5rem))] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-panel/75 p-5 backdrop-blur-md lg:p-8";

export interface RoomPanel {
  id: string;
  /** Side of the screen the panel sits on (the object is on the other). */
  side: "left" | "right";
  content: React.ReactNode;
}

/**
 * Prototype: the whole page as one 3D room. A fixed canvas sits behind the
 * scroll stages; each stage pins a glass panel that fades in once the camera
 * has reached its corner of the room. Stage order must match mountRoom:
 * hero, about, work, stack, projects, writing, contact.
 */
export function RoomTour({
  data,
  hero,
  panels,
}: {
  data: RoomData;
  hero: React.ReactNode;
  panels: RoomPanel[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const el = host.current;
    const stages = stageRefs.current.filter((s): s is HTMLElement => !!s);
    if (!el || stages.length !== panels.length + 1) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;
    import("./mountRoom")
      .then(({ mountRoom }) => {
        if (cancelled) return;
        signal("loaded");
        cleanup = mountRoom(el, stages, data);
        if (!cleanup) signal("ready");
      })
      .catch(() => signal("ready"));
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [data, panels.length]);

  // Menu links (#about, #work, …) land where the camera has reached that
  // corner and the panel is up, not at the start of the stage. The jump is
  // instant; the eased camera then flies across the room to get there.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = a?.getAttribute("href")?.slice(1);
      const stage = id ? document.getElementById(id) : null;
      if (!stage || !stageRefs.current.includes(stage)) return;
      e.preventDefault();
      const run = stage.offsetHeight - window.innerHeight;
      const top = id === "top" ? 0 : stage.offsetTop + Math.max(0, run) * 0.55;
      window.scrollTo({ top, behavior: "instant" });
      history.replaceState(null, "", `#${id}`);
    };
    document.addEventListener("click", onClick);
    const id = location.hash.slice(1);
    const stage = id ? document.getElementById(id) : null;
    if (stage && id !== "top" && stageRefs.current.includes(stage)) {
      const run = stage.offsetHeight - window.innerHeight;
      window.scrollTo({ top: stage.offsetTop + Math.max(0, run) * 0.55, behavior: "instant" });
    }
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Panels are fixed, not sticky, so they never slide away with the raw
  // scroll; they fade and drift in with the stage's eased progress (--q,
  // written by the 3D loop, same value as the camera) and fade out at its
  // end. The last one stays. Clicks only while shown ([data-on]).
  const fadeIn = "clamp(0, calc((var(--q, 0) - 0.35) * 7), 1)";
  const fadeOut = "clamp(0, calc((1 - var(--q, 0)) * 8), 1)";
  const panelStyle = (last: boolean): React.CSSProperties => ({
    opacity: last ? fadeIn : `min(${fadeIn}, ${fadeOut})`,
    transform: `translateY(calc((1 - ${fadeIn}) * 28px))`,
  });

  return (
    <div data-sky-cover="" className="relative">
      <div
        ref={host}
        aria-hidden="true"
        className="fixed inset-0 bg-[radial-gradient(ellipse_at_60%_35%,#1a2433_0%,#0e1218_65%)]"
      />

      <section
        id="top"
        ref={(n) => {
          stageRefs.current[0] = n;
        }}
        className="group/stage relative h-[150svh]"
      >
        <div
          className="sticky top-0 flex h-svh flex-col justify-end bg-gradient-to-t from-ink/85 via-ink/15 via-35% to-transparent px-4 pb-14 pt-28 sm:px-6"
          style={{ opacity: "calc(1 - var(--q, 0) * 3)" }}
        >
          <div className="mx-auto w-full max-w-7xl">{hero}</div>
        </div>
      </section>

      {panels.map((p, i) => (
        <section
          key={p.id}
          id={p.id}
          ref={(n) => {
            stageRefs.current[i + 1] = n;
          }}
          className="group/stage relative h-[230svh]"
        >
          <div
            className={`pointer-events-none invisible fixed inset-0 flex items-center px-4 pt-16 group-data-[on]/stage:visible sm:px-10 ${
              p.side === "right" ? "justify-end" : "justify-start"
            }`}
          >
            <div className={PANEL} style={panelStyle(i === panels.length - 1)}>
              {p.content}
            </div>
          </div>
        </section>
      ))}

      <div className="h-[40svh]" />
    </div>
  );
}
