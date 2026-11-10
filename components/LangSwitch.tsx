"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

const LANGS = ["th", "en"] as const;

// TH | EN toggle. Switching keeps the reader on the section they were viewing.
export function LangSwitch({
  current,
  label,
}: {
  current: string;
  label: string;
}) {
  const router = useRouter();

  function go(e: MouseEvent<HTMLAnchorElement>, to: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    let section = "";
    document.querySelectorAll<HTMLElement>("main section[id]").forEach((s) => {
      if (s.getBoundingClientRect().top <= 120) section = s.id;
    });
    router.push(section ? `/${to}#${section}` : `/${to}`);
  }

  return (
    <div
      role="group"
      className="flex rounded-full border border-line p-0.5 text-sm font-semibold"
    >
      {LANGS.map((l) =>
        l === current ? (
          <span
            key={l}
            aria-current="true"
            className="rounded-full bg-accent px-2.5 py-0.5 text-ink"
          >
            {l.toUpperCase()}
          </span>
        ) : (
          <Link
            key={l}
            href={`/${l}`}
            hrefLang={l}
            lang={l}
            aria-label={label}
            onClick={(e) => go(e, l)}
            className="rounded-full px-2.5 py-0.5 text-mist hover:text-accent"
          >
            {l.toUpperCase()}
          </Link>
        ),
      )}
    </div>
  );
}
