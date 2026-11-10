// Loading milestones of the desk hero, read by the intro screen.
// Each one is also left as an attribute on <html> so a listener that attaches
// late still sees it.

export type DeskSignal = "loaded" | "ready";

export function signal(name: DeskSignal) {
  document.documentElement.setAttribute(`data-desk-${name}`, "");
  window.dispatchEvent(new Event(`desk:${name}`));
}

export function hasSignal(name: DeskSignal) {
  return document.documentElement.hasAttribute(`data-desk-${name}`);
}
