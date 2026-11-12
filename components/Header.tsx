"use client";

import { useEffect, useRef, useState } from "react";
import { LangSwitch } from "./LangSwitch";

const IDS = ["about", "work", "stack", "projects", "writing", "contact"] as const;

type Props = {
  lang: string;
  nav: Record<(typeof IDS)[number], string>;
  role: string;
  clock: string;
  cta: string;
  switchLabel: string;
  /** Labels for the phone menu. */
  menu: { open: string; close: string; cv: string; cvHref: string };
};

export function Header({ lang, nav, role, clock, cta, switchLabel, menu }: Props) {
  const [active, setActive] = useState("");
  const [time, setTime] = useState("");
  const [open, setOpen] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

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

  // Phone menu: lock the page behind it, Esc closes, focus moves in and back.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const btn = openBtn.current;
    return () => {
      html.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      btn?.focus();
    };
  }, [open]);

  // Close first, then scroll, so the unlocked page can move.
  function go(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    setOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView();
      history.replaceState(null, "", `#${id}`);
    });
  }

  return (
    <>
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
          className="flex items-center gap-0.5 rounded-full border border-line bg-ink/70 p-1 text-sm backdrop-blur max-md:hidden"
        >
          {IDS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${
                active === id ? "bg-paper/10 text-paper" : "text-mist hover:text-paper"
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
          <button
            ref={openBtn}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="phone-menu"
            className="grid size-10 place-items-center rounded-full border border-line bg-ink/70 backdrop-blur md:hidden"
          >
            <span className="sr-only">{menu.open}</span>
            <span aria-hidden="true" className="flex w-4 flex-col gap-1">
              <span className="h-0.5 rounded bg-paper" />
              <span className="h-0.5 w-2.5 rounded bg-paper" />
              <span className="h-0.5 rounded bg-paper" />
            </span>
          </button>
        </div>
      </header>

      {/* Phone menu: the sections as a big list, then the two actions. */}
      <div
        id="phone-menu"
        role="dialog"
        aria-modal="true"
        aria-label={menu.open}
        hidden={!open}
        className="fixed inset-0 z-40 flex flex-col bg-ink px-4 pb-6 pt-3 md:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-full border border-line font-display text-xs font-bold">
            NB
          </span>
          <button
            ref={closeBtn}
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-10 place-items-center rounded-full border border-line text-xl leading-none"
          >
            <span className="sr-only">{menu.close}</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav aria-label="Sections" className="mt-8 flex-1">
          <ul>
            {IDS.map((id, i) => {
              const on = active === id;
              return (
                <li
                  key={id}
                  className="border-b border-line motion-safe:animate-[menu-in_0.35s_ease-out_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <a
                    href={`#${id}`}
                    onClick={(e) => go(e, id)}
                    aria-current={on ? "true" : undefined}
                    className={`flex items-center justify-between py-4 font-display text-[1.75rem] font-extrabold leading-tight ${
                      on ? "text-accent" : "text-paper"
                    }`}
                  >
                    {nav[id]}
                    {on && <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="grid grid-cols-2 gap-3">
          <a
            href="#contact"
            onClick={(e) => go(e, "contact")}
            className="rounded-full bg-paper px-4 py-3 text-center font-semibold text-ink"
          >
            {cta}
          </a>
          <a
            href={menu.cvHref}
            download
            className="rounded-full border border-line px-4 py-3 text-center font-semibold"
          >
            {menu.cv}
          </a>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 font-mono text-[11px] text-mist">
          <span aria-hidden="true" className="size-2 rounded-full bg-emerald-400" />
          {clock} {time || "--:--:--"}
        </p>
      </div>
    </>
  );
}
