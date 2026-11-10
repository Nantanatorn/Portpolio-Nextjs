"use client";

import { useRef } from "react";

type Word = { text: string; group: number; order: number };

// Skill names scattered on a spiral. They drift away from the pointer, and
// the words of the active group light up while the others dim.
export function StackCloud({
  words,
  active,
  onHover,
}: {
  words: Word[];
  active: number | null;
  onHover: (group: number | null) => void;
}) {
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
    onHover(null);
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
        const rest = 0.45 + ((i * 3) % 5) * 0.12;
        const on = active === word.group;
        const opacity = active === null ? rest : on ? 1 : 0.14;
        return (
          <span
            key={word.text}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onPointerEnter={() => onHover(word.group)}
            className={`absolute whitespace-nowrap font-display font-semibold transition-[transform,opacity,color,scale] duration-300 ease-out ${
              on ? "text-accent" : ""
            }`}
            style={{
              // Fixed precision so server and client render identical strings.
              left: `${(50 + r * 100 * Math.cos(theta)).toFixed(1)}%`,
              top: `${(50 + r * 100 * Math.sin(theta)).toFixed(1)}%`,
              fontSize: `${size.toFixed(2)}rem`,
              opacity: opacity.toFixed(2),
              translate: "-50% -50%",
              scale: on ? "1.08" : "1",
              // Light up the group's words one after another, quickly. The
              // first entry is transform (the pointer push), which never waits.
              transitionDelay: on
                ? `0ms, ${word.order * 18}ms, ${word.order * 18}ms, ${word.order * 18}ms`
                : "0ms",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}
