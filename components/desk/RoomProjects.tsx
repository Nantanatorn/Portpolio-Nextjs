"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Must match PICK_PROJECT in mountRoom.ts (not imported, to keep three.js
// out of this component's bundle).
const PICK_PROJECT = "room:project";

type Project = {
  name: string;
  year: string;
  summary: string;
  stack: string[];
  repo: string;
  image: string;
  mark: string;
};

const TAG = "rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors";

/** Project list for the room; picking one shows it on the 3D monitor. */
export function RoomProjects({
  items,
  repoLabel,
  hint,
}: {
  items: Project[];
  repoLabel: string;
  hint: string;
}) {
  const [picked, setPicked] = useState(0);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PICK_PROJECT, { detail: picked }));
  }, [picked]);

  return (
    <>
      <p className="mt-3 text-sm text-mist">{hint}</p>
      <ul className="mt-4">
        {items.map((p, i) => {
          const on = picked === i;
          return (
            <li key={p.name} className="border-t border-line">
              <div
                className={`-mx-3 mt-3 flex gap-4 rounded-2xl p-3 transition-colors ${
                  on ? "bg-accent/10 ring-1 ring-accent/40" : "hover:bg-paper/5"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(i)}
                  className="flex min-w-0 flex-1 gap-4 text-left"
                >
                  <span className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-ink/60 sm:block">
                    {p.image ? (
                      <Image src={p.image} alt="" fill sizes="6rem" className="object-cover object-top" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid size-full place-items-center font-display text-xs font-bold text-mist"
                      >
                        {p.mark}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-mist">{p.year}</span>
                    <span
                      className={`block font-display text-lg font-bold transition-colors ${on ? "text-accent" : ""}`}
                    >
                      {p.name}
                    </span>
                    <span className="mt-1 block text-sm text-mist">{p.summary}</span>
                    <span className="mt-3 flex flex-wrap gap-1.5">
                      {p.stack.map((s) => (
                        <span
                          key={s}
                          className={`${TAG} ${
                            on ? "border-accent/50 text-accent" : "border-line bg-ink/60 text-paper/85"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              </div>
              <a
                href={p.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 ml-0 inline-block pt-2 text-sm font-semibold hover:text-accent sm:ml-28"
              >
                {repoLabel}
                <span className="sr-only">: {p.name}</span> <span aria-hidden="true">↗</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
