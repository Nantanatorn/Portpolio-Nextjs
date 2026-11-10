"use client";

import { useEffect, useRef } from "react";

/**
 * Marks its element with [data-shown] the first time it scrolls into view;
 * CSS does the actual reveal (see .reveal-char in globals.css).
 */
export function RevealOnView({
  as: Tag = "div",
  className,
  label,
  children,
}: {
  as?: "h2" | "div";
  className?: string;
  /** Accessible text when the visible text is split into pieces. */
  label?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement & HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.setAttribute("data-shown", "");
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} aria-label={label}>
      {children}
    </Tag>
  );
}
