"use client";

import { useEffect, useRef, useState } from "react";

// Events shared with mountRoom.ts (not imported, to keep three.js out of
// this bundle). Open carries the paper's on-screen position.
export const CV_OPEN = "room:cv-open";
export const CV_CLOSED = "room:cv-closed";

/**
 * The printed CV, picked up like a note in a game: it flies from the printer
 * to the middle of the screen and settles, showing the real PDF. Esc closes,
 * D downloads.
 */
export function CvViewer({
  src,
  filename,
  labels,
}: {
  src: string;
  filename: string;
  labels: { close: string; download: string; title: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const download = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = dialog.current;
      const s = sheet.current;
      if (!d || !s || d.open) return;
      d.showModal();
      setOpen(true);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Fly in from where the paper sits in the 3D scene.
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight,
      };
      const box = s.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      s.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(-18deg)`, opacity: 0.6 },
          { transform: "translate(0, -14px) scale(1.03) rotate(2deg)", opacity: 1, offset: 0.7 },
          { transform: "translate(0, 0) scale(1) rotate(-1.2deg)", opacity: 1 },
        ],
        { duration: 650, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    };
    window.addEventListener(CV_OPEN, onOpen);
    return () => window.removeEventListener(CV_OPEN, onOpen);
  }, []);

  function close() {
    const d = dialog.current;
    const s = sheet.current;
    if (!d?.open) return;
    const done = () => {
      d.close();
    };
    if (!s || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
    s.animate(
      [
        { transform: "rotate(-1.2deg)", opacity: 1 },
        { transform: "translate(0, 40px) scale(0.92) rotate(4deg)", opacity: 0 },
      ],
      { duration: 220, easing: "ease-in" },
    ).onfinish = done;
  }

  // Keyboard: Esc closes (the dialog's own cancel is routed through the
  // animation), D downloads.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") download.current?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label={labels.title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={() => {
        setOpen(false);
        window.dispatchEvent(new Event(CV_CLOSED));
      }}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
      className="cv-viewer m-0 h-svh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
    >
      <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-5 px-4 py-6">
        <div
          ref={sheet}
          className="pointer-events-auto relative aspect-[210/297] h-[min(80svh,calc((100vw-2rem)*297/210))] rotate-[-1.2deg] bg-[#fbfaf6] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        >
          {/* A strip of tape holding the note. */}
          <span
            aria-hidden="true"
            className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 rotate-[3deg] bg-accent/35 backdrop-blur-[1px]"
          />
          {open && (
            <iframe
              src={`${src}#toolbar=0&navpanes=0&view=FitH`}
              title={labels.title}
              className="size-full border-0 bg-white"
            />
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-6 font-mono text-sm text-paper">
          <button type="button" onClick={close} className="flex items-center gap-2 hover:text-accent">
            <kbd className="rounded border border-line bg-panel px-2 py-0.5 text-xs">Esc</kbd>
            {labels.close}
          </button>
          <a
            ref={download}
            href={src}
            download={filename}
            className="flex items-center gap-2 hover:text-accent"
          >
            <kbd className="rounded border border-line bg-panel px-2 py-0.5 text-xs">D</kbd>
            {labels.download}
          </a>
        </div>
      </div>
    </dialog>
  );
}
