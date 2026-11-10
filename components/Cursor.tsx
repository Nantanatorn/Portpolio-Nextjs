"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], label, summary";

/**
 * Dot-and-ring cursor for mouse users. The dot sits on the pointer, the ring
 * follows with a little lag, grows over links and buttons, and tightens on
 * press. Touch devices keep their normal behaviour.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = dot.current;
    const r = ring.current;
    if (!d || !r) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const html = document.documentElement;
    html.setAttribute("data-cursor", "");

    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let raf = 0;

    const place = () => {
      d.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      r.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
    };

    const loop = () => {
      const k = reduced ? 1 : 0.2;
      ringPos.x += (pos.x - ringPos.x) * k;
      ringPos.y += (pos.y - ringPos.y) * k;
      scale += (targetScale - scale) * (reduced ? 1 : 0.18);
      place();
      raf = requestAnimationFrame(loop);
    };

    const show = (on: boolean) => {
      visible = on;
      d.style.opacity = r.style.opacity = on ? "1" : "0";
    };

    let hovering = false;
    let pressed = false;
    const updateScale = () => {
      targetScale = (hovering ? 1.8 : 1) * (pressed ? 0.75 : 1);
      r.toggleAttribute("data-hover", hovering);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        show(true);
      }
      const over = !!(e.target as Element | null)?.closest?.(INTERACTIVE);
      if (over !== hovering) {
        hovering = over;
        updateScale();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pressed = true;
      updateScale();
    };
    const onUp = () => {
      pressed = false;
      updateScale();
    };
    const onLeave = () => show(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      html.removeAttribute("data-cursor");
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] mix-blend-difference">
      <div
        ref={ring}
        className="cursor-ring absolute left-0 top-0 size-9 rounded-full border border-white opacity-0 transition-[opacity,background-color,border-width] duration-200"
      />
      <div
        ref={dot}
        className="absolute left-0 top-0 size-2 rounded-full bg-white opacity-0 transition-opacity duration-200"
      />
    </div>
  );
}
