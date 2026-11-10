"use client";

import { useRef } from "react";

// Aligns the first card with the page container on wide screens.
const EDGE = "max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))";

// Horizontal scroller: native scroll and snap for touch and wheel,
// plus click-and-drag for mouse users.
export function DragScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, left: 0 });

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    drag.current = { active: true, x: e.clientX, left: ref.current.scrollLeft };
    ref.current.style.scrollSnapType = "none";
    ref.current.style.cursor = "grabbing";
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || !ref.current) return;
    ref.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  }
  function up() {
    if (!ref.current) return;
    drag.current.active = false;
    ref.current.style.scrollSnapType = "";
    ref.current.style.cursor = "";
  }

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
      style={{ paddingInline: EDGE, scrollPaddingInline: EDGE }}
      className="no-scrollbar flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
    >
      {children}
    </div>
  );
}
