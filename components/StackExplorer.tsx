"use client";

import { useState } from "react";
import { StackCloud } from "./StackCloud";

type Group = { name: string; items: string[] };

const TAG =
  "rounded-full border px-3 py-1 font-mono text-xs transition-colors duration-200";

/**
 * Skill cloud plus the grouped list. Pointing at a group (or at any word in
 * the cloud) highlights that group in both: its heading and tags turn accent,
 * and its words in the cloud light up one after another while the rest dim.
 */
export function StackExplorer({ groups }: { groups: Group[] }) {
  const [active, setActive] = useState<number | null>(null);
  const words = groups.flatMap((g, group) =>
    g.items.map((text, order) => ({ text, group, order })),
  );

  return (
    <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="hidden lg:block">
        <StackCloud words={words} active={active} onHover={setActive} />
      </div>
      <div
        className="rounded-3xl border border-line bg-panel/60 p-6 backdrop-blur sm:p-8"
        onPointerLeave={() => setActive(null)}
      >
        {groups.map((g, i) => {
          const on = active === i;
          const dim = active !== null && !on;
          return (
            <div
              key={g.name}
              onPointerEnter={() => setActive(i)}
              className={`transition-opacity duration-300 ${dim ? "opacity-55" : ""} ${
                i === 0 ? "" : "mt-6 border-t border-line pt-6"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3
                  className={`font-display text-lg font-bold transition-colors duration-200 ${
                    on ? "text-accent" : ""
                  }`}
                >
                  {g.name}
                </h3>
                <span className="font-mono text-xs text-mist">{g.items.length}</span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {g.items.map((s, k) => (
                  <li
                    key={s}
                    className={`${TAG} ${
                      on
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-line bg-ink/60 text-paper/90"
                    }`}
                    style={{ transitionDelay: on ? `${k * 18}ms` : "0ms" }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
