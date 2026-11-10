"use client";

import { useRef } from "react";

// Aligns the first card with the page container on wide screens. Percent of
// the scroller's width (not vw) so the page scrollbar doesn't shift it.
export const EDGE = "max(1rem, calc((100% - 80rem) / 2 + 1.5rem))";

// Pointer travel (px) after which a press counts as a drag, not a click.
const DRAG_THRESHOLD = 5;

// Horizontal scroller: native scroll and snap for touch and wheel,
// plus click-and-drag for mouse users.
export function DragScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, left: 0 });

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
    drag.current = {
      active: true,
      moved: false,
      x: e.clientX,
      left: ref.current.scrollLeft,
    };
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active || !ref.current) return;
    const dx = e.clientX - drag.current.x;
    if (!drag.current.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.current.moved = true;
      ref.current.style.scrollSnapType = "none";
      ref.current.style.cursor = "grabbing";
    }
    ref.current.scrollLeft = drag.current.left - dx;
  }
  function up() {
    if (!ref.current) return;
    drag.current.active = false;
    ref.current.style.scrollSnapType = "";
    ref.current.style.cursor = "";
  }
  function leave() {
    up();
    // No click follows once the pointer has left the scroller.
    drag.current.moved = false;
  }
  // A drag that ends over a link must not open it. Keyboard clicks
  // (detail === 0) always pass through.
  function clickCapture(e: React.MouseEvent<HTMLDivElement>) {
    const wasDrag = drag.current.moved;
    drag.current.moved = false;
    if (!wasDrag || e.detail === 0) return;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={leave}
      onPointerCancel={leave}
      onClickCapture={clickCapture}
      // Stop the browser's native link/image drag from hijacking the pointer.
      onDragStart={(e) => e.preventDefault()}
      style={{ paddingInline: EDGE, scrollPaddingInline: EDGE }}
      className="no-scrollbar flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
    >
      {children}
    </div>
  );
}
