"use client";

import { useEffect, useRef, useState } from "react";
import { hasSignal } from "./desk/signals";
import { INTRO_KEY } from "./introKey";

// Greetings around the world, ending in the page's language.
const WORLD = [
  "你好",
  "こんにちは",
  "안녕하세요",
  "Bonjour",
  "Hola",
  "Ciao",
  "Hallo",
  "Olá",
  "Привет",
  "Xin chào",
  "नमस्ते",
];
const WORDS = {
  th: ["Hello", ...WORLD, "สวัสดี"],
  en: ["สวัสดี", ...WORLD, "Hello"],
} as const;

const WORD_MS = 170;
// Every greeting gets its turn, and the last one stays up for a beat.
const MIN_MS = WORDS.en.length * WORD_MS + 450;
const MAX_MS = 6000;

/**
 * Opening screen, once per session. The counter follows real loading
 * (fonts, three.js, the desk's first frame), then the screen slides up to
 * reveal the desk. Skipped with reduced motion; hides itself without JS.
 */
export function Intro({
  lang,
  name,
  role,
}: {
  lang: "th" | "en";
  name: string;
  role: string;
}) {
  const words = WORDS[lang];
  const [word, setWord] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.display = "none";
      return;
    }

    // JS is running, so the no-JS failsafe isn't needed.
    el.style.animation = "none";
    const html = document.documentElement;
    html.style.overflow = "hidden";

    const start = performance.now();
    let target = 0.08;
    let shown = 0;
    let raf = 0;
    let finished = false;
    const bump = (v: number) => (target = Math.max(target, v));

    document.fonts?.ready.then(() => bump(0.35)).catch(() => bump(0.35));
    const onLoaded = () => bump(0.7);
    const onReady = () => bump(1);
    if (hasSignal("loaded")) onLoaded();
    if (hasSignal("ready")) onReady();
    window.addEventListener("desk:loaded", onLoaded);
    window.addEventListener("desk:ready", onReady);
    const cap = setTimeout(onReady, MAX_MS);

    const wordTimer = setInterval(
      () => setWord((w) => Math.min(w + 1, words.length - 1)),
      WORD_MS,
    );

    let hideTimer = 0;
    const finish = () => {
      finished = true;
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {}
      window.scrollTo({ top: 0, behavior: "instant" });
      html.style.overflow = "";
      el.setAttribute("data-exit", "");
      hideTimer = window.setTimeout(() => (el.style.display = "none"), 1000);
    };

    let prev = start;
    const tick = (now: number) => {
      // Time-based easing with a minimum speed, so a slow frame rate (the
      // desk compiling shaders underneath) can't leave it stuck near 100.
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const ease = (target - shown) * (1 - Math.exp(-dt * 5));
      shown = Math.min(target, shown + Math.max(ease, dt * 0.3));
      if (target - shown < 0.004) shown = target;
      if (count.current) {
        count.current.textContent = String(Math.round(shown * 100)).padStart(3, "0");
      }
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`;
      if (shown >= 1 && now - start >= MIN_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cap);
      clearTimeout(hideTimer);
      clearInterval(wordTimer);
      window.removeEventListener("desk:loaded", onLoaded);
      window.removeEventListener("desk:ready", onReady);
      if (!finished) html.style.overflow = "";
    };
  }, [words.length]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="intro fixed inset-0 z-50 flex flex-col bg-ink px-4 pb-8 pt-5 sm:px-6"
    >
      <div className="leading-tight">
        <span className="block text-sm font-semibold">{name}</span>
        <span className="block font-mono text-[11px] text-mist">{role}</span>
      </div>

      <div className="relative grid flex-1 place-items-center">
        {words.map((w, i) => (
          <p
            key={w}
            className={`absolute flex items-center gap-[0.12em] font-sans text-[clamp(2.6rem,8vw,5.8rem)] font-semibold leading-none transition-[opacity,filter,translate] duration-200 ease-out ${
              i === word
                ? "translate-y-0 opacity-100 blur-0"
                : i < word
                  ? "-translate-y-3 opacity-0 blur-md"
                  : "translate-y-3 opacity-0 blur-md"
            }`}
          >
            {w}
            <span className="cursor-blink inline-block h-[0.82em] w-[0.42em] translate-y-[0.04em] bg-accent" />
          </p>
        ))}
      </div>

      <div className="flex items-end gap-6">
        <div className="relative mb-3 h-px flex-1 bg-line">
          <div
            ref={bar}
            className="absolute inset-0 origin-left bg-accent"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <span
          ref={count}
          className="font-display text-[clamp(3.5rem,11vw,9rem)] font-extrabold leading-[0.8] tabular-nums tracking-tight"
        >
          000
        </span>
      </div>
    </div>
  );
}
