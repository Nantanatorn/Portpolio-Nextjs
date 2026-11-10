import * as THREE from "three";

// Content for the secondary screens on the desk: a code editor that scrolls
// slowly on the portrait monitor, and dev-server logs on the laptop.

const C = {
  bg: "#0b1118",
  bar: "#161c25",
  line: "#28323f",
  paper: "#e8edf3",
  mist: "#8e9bab",
  dim: "#566173",
  accent: "#7cc4ff",
  green: "#7ee0a8",
  keyword: "#c4a7ff",
  string: "#b8e39a",
  type: "#ffd27a",
};

function cssFont(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function canvasTexture(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { ctx, texture };
}

type Seg = [string, keyof typeof C];

// A small RAG lookup, in the spirit of the owner's own projects.
const CODE: Seg[][] = [
  [["// rag/answer.ts", "dim"]],
  [["import", "keyword"], [" { embed, gemini } ", "paper"], ["from", "keyword"], [' "./ai"', "string"]],
  [["import", "keyword"], [" { docs } ", "paper"], ["from", "keyword"], [' "./db"', "string"]],
  [],
  [["export async function", "keyword"], [" answer", "accent"], ["(q: ", "paper"], ["string", "type"], [") {", "paper"]],
  [["  const", "keyword"], [" vector = ", "paper"], ["await", "keyword"], [" embed", "accent"], ["(q);", "paper"]],
  [["  const", "keyword"], [" hits = ", "paper"], ["await", "keyword"], [" docs", "paper"]],
  [["    .aggregate", "accent"], ["([{", "paper"]],
  [["      $vectorSearch", "type"], [": {", "paper"]],
  [["        index", "paper"], [": ", "paper"], ['"products"', "string"], [",", "paper"]],
  [["        queryVector", "paper"], [": vector,", "paper"]],
  [["        limit", "paper"], [": ", "paper"], ["4", "type"], [",", "paper"]],
  [["      },", "paper"]],
  [["    }])", "paper"]],
  [["    .toArray", "accent"], ["();", "paper"]],
  [],
  [["  return", "keyword"], [" gemini", "paper"], [".generate", "accent"], ["({", "paper"]],
  [["    question", "paper"], [": q,", "paper"]],
  [["    context", "paper"], [": hits.", "paper"], ["map", "accent"], ["((h) => h.text),", "paper"]],
  [["  });", "paper"]],
  [["}", "paper"]],
  [],
  [["// ws/session.ts", "dim"]],
  [["socket", "paper"], [".on", "accent"], ["(", "paper"], ['"audio"', "string"], [", (chunk) => {", "paper"]],
  [["  live", "paper"], [".send", "accent"], ["(chunk);", "paper"]],
  [["});", "paper"]],
  [],
];

export function createCodeTexture(width: number, height: number) {
  const W = 512;
  const H = Math.round((W * height) / width);
  const { ctx, texture } = canvasTexture(W, H);
  const LINE = 30;
  const TOP = 64;
  const block = CODE.length * LINE;

  let offset = 0;
  let last = -1;

  function draw() {
    const mono = cssFont("--font-jetbrains", "monospace");
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TOP - 4, W, H - TOP + 4);
    ctx.clip();
    ctx.font = `500 17px ${mono}`;
    const first = Math.floor(offset / LINE);
    const rows = Math.ceil((H - TOP) / LINE) + 1;
    for (let r = 0; r < rows; r++) {
      const i = first + r;
      const y = TOP + 20 + r * LINE - (offset % LINE);
      const line = CODE[i % CODE.length];
      ctx.fillStyle = C.dim;
      ctx.textAlign = "right";
      ctx.fillText(String((i % CODE.length) + 1), 40, y);
      ctx.textAlign = "left";
      let x = 58;
      for (const [text, color] of line) {
        ctx.fillStyle = C[color];
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      }
    }
    ctx.restore();

    // Tab bar drawn last so code scrolls underneath it.
    ctx.fillStyle = C.bar;
    ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = C.bg;
    ctx.fillRect(14, 10, 150, 36);
    ctx.fillStyle = C.accent;
    ctx.fillRect(14, 10, 150, 2);
    ctx.font = `500 16px ${mono}`;
    ctx.fillStyle = C.paper;
    ctx.fillText("answer.ts", 30, 34);
    ctx.fillStyle = C.mist;
    ctx.fillText("session.ts", 186, 34);
    ctx.fillStyle = C.line;
    ctx.fillRect(0, 46, W, 2);
    ctx.fillRect(48, 48, 1, H);

    texture.needsUpdate = true;
  }

  draw();
  document.fonts?.ready.then(draw).catch(() => {});

  function update(time: number) {
    if (last < 0) last = time;
    if (time - last < 60) return;
    offset = (offset + ((time - last) / 1000) * 14) % block;
    last = time;
    draw();
  }

  return { texture, update };
}

const LOG_LINES: Seg[][] = [
  [["GET ", "accent"], ["/en ", "paper"], ["200", "green"], [" in 38ms", "mist"]],
  [["ws ", "accent"], ["client connected", "mist"]],
  [["POST ", "accent"], ["/api/answer ", "paper"], ["200", "green"], [" in 214ms", "mist"]],
  [["GET ", "accent"], ["/th ", "paper"], ["200", "green"], [" in 41ms", "mist"]],
  [["✓ ", "green"], ["compiled in 312ms", "mist"]],
  [["ws ", "accent"], ["session resumed", "mist"]],
  [["POST ", "accent"], ["/api/upload ", "paper"], ["201", "green"], [" in 890ms", "mist"]],
  [["✓ ", "green"], ["embedded 24 chunks", "mist"]],
];

export function createLogTexture(width: number, height: number) {
  const W = 640;
  const H = Math.round((W * height) / width);
  const { ctx, texture } = canvasTexture(W, H);
  const LINE = 34;
  const visible = Math.floor((H - 80) / LINE);

  const header: Seg[][] = [
    [["$ ", "mist"], ["npm run dev", "paper"]],
    [["▲ ", "paper"], ["ready on ", "mist"], ["localhost:3000", "accent"]],
  ];
  let shown: Seg[][] = [];
  let next = 0;
  let last = -1;

  function draw() {
    const mono = cssFont("--font-jetbrains", "monospace");
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.bar;
    ctx.fillRect(0, 0, W, 40);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(24 + i * 22, 20, 7, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.font = `500 21px ${mono}`;
    const lines = [...header, ...shown];
    lines.forEach((line, r) => {
      let x = 28;
      const y = 80 + r * LINE;
      for (const [text, color] of line) {
        ctx.fillStyle = C[color];
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      }
    });
    texture.needsUpdate = true;
  }

  draw();
  document.fonts?.ready.then(draw).catch(() => {});

  function update(time: number) {
    if (last < 0) last = time;
    if (time - last < 1400) return;
    last = time;
    shown = [...shown, LOG_LINES[next % LOG_LINES.length]].slice(
      -(visible - header.length),
    );
    next++;
    draw();
  }

  return { texture, update };
}
