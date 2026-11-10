"use client";

import { useRef } from "react";

// Skill names scattered on a spiral. They drift away from the pointer.
export function StackCloud({ words }: { words: string[] }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const n = words.length;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    refs.current.forEach((el) => {
      if (!el) return;
      const box = el.getBoundingClientRect();
      const dx = box.left + box.width / 2 - e.clientX;
      const dy = box.top + box.height / 2 - e.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const push = Math.max(0, 150 - dist) * 0.45;
      el.style.transform = `translate(${(dx / dist) * push}px, ${(dy / dist) * push}px)`;
    });
  }

  function onLeave() {
    refs.current.forEach((el) => {
      if (el) el.style.transform = "";
    });
  }

  return (
    <div
      aria-hidden="true"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative aspect-square w-full"
    >
      {words.map((word, i) => {
        const r = Math.sqrt((i + 0.5) / n) * 0.42;
        const theta = i * 2.399963;
        const size = 0.7 + ((i * 7) % 5) * 0.11;
        return (
          <span
            key={word}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="absolute whitespace-nowrap font-display font-semibold transition-transform duration-300 ease-out"
            style={{
              // Fixed precision so server and client render identical strings.
              left: `${(50 + r * 100 * Math.cos(theta)).toFixed(1)}%`,
              top: `${(50 + r * 100 * Math.sin(theta)).toFixed(1)}%`,
              fontSize: `${size.toFixed(2)}rem`,
              opacity: (0.45 + ((i * 3) % 5) * 0.12).toFixed(2),
              translate: "-50% -50%",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
