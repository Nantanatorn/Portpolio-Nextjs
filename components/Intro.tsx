"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hasSignal } from "./desk/signals";
import { INTRO_KEY } from "./introKey";

// Opening screen styled as a Linux boot: kernel lines, systemd "[  OK  ]"
// units (the owner's dev stack starting up), then a login prompt. The last
// units wait for real loading — fonts, three.js, the desk's first frame — and
// show systemd's "A start job is running" line meanwhile.

type Gate = "fonts" | "loaded" | "ready";
type Line =
  | { kind: "kernel"; text: string }
  | { kind: "ok"; text: string; gate?: Gate; unit?: string };

// Services from the owner's stack, as systemd would start them: [unit, description].
const SERVICES: [string, string][] = [
  ["NetworkManager.service", "Network Manager"],
  ["sshd.service", "OpenSSH server daemon"],
  ["home-nantanatorn-projects.mount", "/home/nantanatorn/projects"],
  ["docker.service", "Docker Application Container Engine"],
  ["postgresql.service", "PostgreSQL database server"],
  ["mssql-server.service", "Microsoft SQL Server"],
  ["mongod.service", "MongoDB Atlas sync"],
  ["node-api.service", "Node.js API on :3000"],
  ["dotnet-api.service", "ASP.NET Core API on :5000"],
  ["ng-serve.service", "Angular dev server on :4200"],
  ["gemini-live.service", "Gemini Live WebSocket bridge"],
  ["rag-indexer.service", "RAG embeddings indexer"],
];

const UNIT: Record<Gate, string> = {
  fonts: "fonts.target",
  loaded: "three.service",
  ready: "desk.service",
};

function script(): Line[] {
  return [
    { kind: "kernel", text: "[    0.000000] Booting nantanatorn-portfolio 26.11 (x86_64)" },
    { kind: "kernel", text: "[    0.041293] Detected 2 internships, 5 projects, 1 developer" },
    { kind: "kernel", text: "[    0.118400] Mounting /home/nantanatorn ..." },
    { kind: "ok", text: "Reached target Local File Systems." },
    { kind: "ok", text: "Started Time Sync (Asia/Bangkok)." },
    ...SERVICES.map(([unit, desc]): Line => ({ kind: "ok", text: `Started ${unit} - `, unit: `${desc}.` })),
    { kind: "ok", text: "Reached target Multi-User System." },
    { kind: "ok", text: "Reached target Fonts.", gate: "fonts" },
    { kind: "ok", text: "Loaded three.js renderer.", gate: "loaded" },
    { kind: "ok", text: "Started desk.service — 3D workspace.", gate: "ready" },
  ];
}

const TICK_MS = 55;
const MAX_MS = 6000;
const USER = "guest";

export function Intro() {
  const lines = useMemo(() => script(), []);
  const [shown, setShown] = useState(0);
  const [waiting, setWaiting] = useState<{ gate: Gate; secs: number; frame: number } | null>(null);
  const [typed, setTyped] = useState(-1); // -1: no login prompt yet
  const root = useRef<HTMLDivElement>(null);

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

    el.style.animation = "none"; // JS runs, so the no-JS failsafe isn't needed
    const html = document.documentElement;
    html.style.overflow = "hidden";

    const gates: Record<Gate, boolean> = {
      fonts: false,
      loaded: hasSignal("loaded"),
      ready: hasSignal("ready"),
    };
    document.fonts?.ready.then(() => (gates.fonts = true)).catch(() => (gates.fonts = true));
    const onLoaded = () => (gates.loaded = true);
    const onReady = () => (gates.ready = true);
    window.addEventListener("desk:loaded", onLoaded);
    window.addEventListener("desk:ready", onReady);
    const start = performance.now();

    let index = 0;
    let chars = -1;
    let hold = 0;
    let finished = false;
    let hideTimer = 0;
    let frame = 0;

    const finish = () => {
      finished = true;
      clearInterval(timer);
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {}
      // Start at the top, unless the link asked for a section.
      if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
      html.style.overflow = "";
      el.setAttribute("data-exit", "");
      hideTimer = window.setTimeout(() => (el.style.display = "none"), 1000);
    };

    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      if (elapsed > MAX_MS) gates.fonts = gates.loaded = gates.ready = true;

      if (index < lines.length) {
        const line = lines[index];
        if (line.kind === "ok" && line.gate && !gates[line.gate]) {
          frame++;
          setWaiting({ gate: line.gate, secs: Math.floor(elapsed / 1000), frame });
          return;
        }
        setWaiting(null);
        index++;
        setShown(index);
        return;
      }
      // Login prompt: type the user name, then hold a beat and go.
      if (chars < USER.length) {
        chars++;
        setTyped(chars);
        return;
      }
      if (++hold >= 6) finish();
    }, TICK_MS);

    return () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
      window.removeEventListener("desk:loaded", onLoaded);
      window.removeEventListener("desk:ready", onReady);
      if (!finished) html.style.overflow = "";
    };
  }, [lines]);

  // systemd's bouncing "***" while a start job waits.
  const stars = (f: number) => {
    const pos = [0, 1, 2, 3, 2, 1][f % 6];
    return " ".repeat(pos) + "***" + " ".repeat(3 - pos);
  };

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="intro fixed inset-0 z-50 flex flex-col justify-end overflow-hidden bg-[#07090d] px-4 pb-6 pt-5 font-mono text-[11px] leading-[1.65] text-mist sm:px-6 sm:text-[13px]"
    >
      {lines.slice(0, shown).map((line, i) =>
        line.kind === "kernel" ? (
          <p key={i} className="whitespace-pre-wrap">{line.text}</p>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            [<span className="text-emerald-400">{"  OK  "}</span>] {line.text}
            {line.unit && <span className="text-paper">{line.unit}</span>}
          </p>
        ),
      )}
      {waiting && (
        <p className="whitespace-pre">
          [<span className="text-red-400">{stars(waiting.frame)}</span>] A start job is running
          for {UNIT[waiting.gate]} ({waiting.secs}s / {MAX_MS / 1000}s)
        </p>
      )}
      {typed >= 0 && (
        <>
          <p className="mt-4 text-paper">
            nantanatorn-portfolio <span className="text-mist">tty1</span>
          </p>
          <p className="mt-3 text-paper">
            <span className="text-accent">nantanatorn-portfolio login:</span> {USER.slice(0, typed)}
            <span className="cursor-blink ml-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-accent" />
          </p>
        </>
      )}
    </div>
  );
}
