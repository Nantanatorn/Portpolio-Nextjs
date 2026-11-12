import * as THREE from "three";

// A Medium-style article page, drawn for the laptop screen in the room.

export interface MediumArticle {
  title: string;
  date: string;
  author: string;
  image: string;
}

function cssFont(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

// Wraps `text` into lines no wider than `width`; returns the lines.
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function createMediumTexture(width: number, height: number, a: MediumArticle) {
  const W = 1024;
  const H = Math.round((W * height) / width);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  let cover: HTMLImageElement | null = null;

  function draw() {
    const serif = `Georgia, "Times New Roman", ${cssFont("--font-anuphan", "serif")}`;
    const sans = cssFont("--font-anuphan", "sans-serif");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Browser chrome: tab strip and address bar.
    ctx.fillStyle = "#e9ecef";
    ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(150, 14, W - 300, 36, 18);
    ctx.fill();
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 20px ${sans}`;
    ctx.fillText("medium.com/@nantanatorns.4210", 176, 39);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(30 + i * 26, 32, 8, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });

    // Site header.
    ctx.fillStyle = "#191919";
    ctx.font = `700 34px ${serif}`;
    ctx.fillText("Medium", 48, 118);
    ctx.fillStyle = "#e6e6e6";
    ctx.fillRect(0, 140, W, 2);

    // Article column.
    const left = 140;
    const col = W - left * 2;
    ctx.fillStyle = "#242424";
    ctx.font = `700 46px ${serif}`;
    let y = 210;
    for (const line of wrap(ctx, a.title, col).slice(0, 2)) {
      ctx.fillText(line, left, y);
      y += 56;
    }

    // Byline.
    y += 8;
    ctx.beginPath();
    ctx.arc(left + 22, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#7cc4ff";
    ctx.fill();
    ctx.fillStyle = "#0e1218";
    ctx.font = `700 20px ${sans}`;
    ctx.textAlign = "center";
    ctx.fillText(a.author.slice(0, 1).toUpperCase(), left + 22, y + 7);
    ctx.textAlign = "left";
    ctx.fillStyle = "#242424";
    ctx.font = `600 22px ${sans}`;
    ctx.fillText(a.author, left + 60, y - 4);
    ctx.fillStyle = "#6b6b6b";
    ctx.font = `400 20px ${sans}`;
    ctx.fillText(a.date, left + 60, y + 22);

    // Cover image, cropped to the space left.
    y += 52;
    const ch = H - y - 10;
    if (cover && ch > 40) {
      const s = Math.max(col / cover.width, ch / cover.height);
      const sw = col / s;
      const sh = ch / s;
      ctx.drawImage(cover, (cover.width - sw) / 2, (cover.height - sh) / 2, sw, sh, left, y, col, ch);
    } else {
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(left, y, col, Math.max(0, ch));
    }
    texture.needsUpdate = true;
  }

  draw();
  document.fonts?.ready.then(draw).catch(() => {});
  if (a.image) {
    const img = new Image();
    img.onload = () => {
      cover = img;
      draw();
    };
    img.src = a.image;
  }

  return { texture, dispose: () => texture.dispose() };
}
