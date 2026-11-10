import * as THREE from "three";
import { SCREEN } from "./buildDesk";

export interface ScreenText {
  first: string;
  last: string;
  role: string;
}

const W = 1024;
const H = Math.round((W * SCREEN.height) / SCREEN.width);

const COLORS = {
  bg: "#0b1118",
  bar: "#161c25",
  line: "#28323f",
  paper: "#e8edf3",
  mist: "#8e9bab",
  accent: "#7cc4ff",
};

// next/font exposes each family through a CSS variable on <html>.
function cssFont(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return value ? `${value}, ${fallback}` : fallback;
}

// Largest font size (up to max) at which text fits in width.
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  width: number,
  max: number,
) {
  let size = max;
  ctx.font = font(size);
  const measured = ctx.measureText(text).width;
  if (measured > width) size = Math.floor((max * width) / measured);
  return size;
}

// A terminal on the monitor that prints the owner's name.
export function createScreenTexture(text: ScreenText) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  let cursorOn = true;

  function draw() {
    const display = cssFont("--font-unbounded", "sans-serif");
    const thai = cssFont("--font-anuphan", "sans-serif");
    const mono = cssFont("--font-jetbrains", "monospace");

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0f1620");
    bg.addColorStop(1, COLORS.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Title bar with window buttons.
    ctx.fillStyle = COLORS.bar;
    ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(0, 44, W, 2);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(30 + i * 26, 22, 8, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.font = `500 20px ${mono}`;
    ctx.fillStyle = COLORS.mist;
    ctx.textAlign = "center";
    ctx.fillText("~/portfolio — zsh", W / 2, 29);
    ctx.textAlign = "left";

    const left = 56;
    const inner = W - left * 2;
    let y = 110;

    ctx.font = `500 26px ${mono}`;
    ctx.fillStyle = COLORS.accent;
    ctx.fillText("~/portfolio", left, y);
    ctx.fillStyle = COLORS.mist;
    ctx.fillText("$ whoami", left + ctx.measureText("~/portfolio ").width, y);

    y += 34;
    const firstFont = (s: number) => `800 ${s}px ${display}`;
    const firstSize = fit(ctx, text.first, firstFont, inner, 104);
    y += firstSize;
    ctx.font = firstFont(firstSize);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText(text.first, left, y);

    // Surname as a quieter solid line: an outline at this size turns into a
    // tangle of strokes on the monitor.
    const tracking = 6;
    const lastFont = (s: number) => `500 ${s}px ${display}`;
    const lastSize = fit(
      ctx,
      text.last,
      lastFont,
      inner - tracking * text.last.length,
      46,
    );
    y += lastSize + 22;
    ctx.font = lastFont(lastSize);
    ctx.fillStyle = COLORS.mist;
    // Browsers without canvas letterSpacing ignore it and draw untracked.
    ctx.letterSpacing = `${tracking}px`;
    ctx.fillText(text.last, left, y);
    ctx.letterSpacing = "0px";

    y += 72;
    ctx.font = `600 34px ${thai}`;
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(`> ${text.role}`, left, y);

    y += 62;
    ctx.font = `500 26px ${mono}`;
    ctx.fillStyle = COLORS.accent;
    ctx.fillText("~/portfolio", left, y);
    ctx.fillStyle = COLORS.mist;
    const promptX = left + ctx.measureText("~/portfolio ").width;
    ctx.fillText("$", promptX, y);
    if (cursorOn) {
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(promptX + 26, y - 22, 14, 28);
    }

    texture.needsUpdate = true;
  }

  draw();
  // Redraw once the web fonts are ready so the canvas uses them.
  document.fonts?.ready.then(draw).catch(() => {});

  let lastBlink = 0;
  function update(time: number) {
    if (time - lastBlink < 530) return;
    lastBlink = time;
    cursorOn = !cursorOn;
    draw();
  }

  return { texture, update };
}
