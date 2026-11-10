"use client";

import { useEffect, useState } from "react";
import { LangSwitch } from "./LangSwitch";

const IDS = ["about", "work", "stack", "projects", "writing", "contact"] as const;

type Props = {
  lang: string;
  nav: Record<(typeof IDS)[number], string>;
  role: string;
  clock: string;
  cta: string;
  switchLabel: string;
};

export function Header({ lang, nav, role, clock, cta, switchLabel }: Props) {
  const [active, setActive] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const timer = setInterval(tick, 1000);

    const onScroll = () => {
      let current = "";
      for (const id of IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) {
          current = id;
        }
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-ink via-ink/90 to-transparent px-4 pb-8 pt-3 sm:px-6">
      <a href="#top" className="flex items-center gap-3" aria-label="Home">
        <span className="grid size-10 place-items-center rounded-full border border-line bg-ink/70 font-display text-xs font-bold backdrop-blur">
          NB
        </span>
        <span className="hidden leading-tight lg:block">
          <span className="block text-sm font-semibold">Nantanatorn B.</span>
          <span className="block font-mono text-[11px] text-mist">{role}</span>
        </span>
      </a>

      <nav
        aria-label="Sections"
        className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-ink/85 p-1 text-xs shadow-lg backdrop-blur md:static md:translate-x-0 md:bg-ink/70 md:shadow-none sm:text-sm"
      >
        {IDS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "true" : undefined}
            className={`whitespace-nowrap rounded-full px-2 py-1.5 transition-colors sm:px-3.5 ${
              active === id
                ? "bg-paper/10 text-paper"
                : "text-mist hover:text-paper"
            }`}
          >
            {nav[id]}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span
          className="hidden items-center gap-2 rounded-full border border-line bg-ink/70 px-3 py-1.5 font-mono text-[11px] text-mist backdrop-blur xl:flex"
          aria-hidden="true"
        >
          <span className="size-2 rounded-full bg-emerald-400" />
          {clock} {time || "--:--:--"}
        </span>
        <LangSwitch current={lang} label={switchLabel} />
        <a
          href="#contact"
          className="hidden rounded-full bg-paper px-4 py-1.5 text-sm font-semibold text-ink hover:bg-accent md:block"
        >
          {cta}
        </a>
      </div>
    </header>
  );
}
