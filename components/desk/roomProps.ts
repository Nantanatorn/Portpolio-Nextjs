import * as THREE from "three";
import { SCREEN } from "./buildDesk";

// The rest of the room around the desk: side walls, a cork board with the
// experience cards, a bookshelf of skills and a side table with a hologram
// projector. Low-poly, built from primitives and canvas textures.

export interface Card {
  company: string;
  role: string;
  period: string;
  logo: string;
}
export interface SkillGroup {
  name: string;
  items: string[];
}

const ROOM = { halfWidth: 3, depthEnd: 4.25, height: 3.2, backZ: -0.75 };

export const BOARD = {
  center: new THREE.Vector3(-ROOM.halfWidth + 0.06, 1.55, 1.2),
  width: 2.3,
  height: 1.4,
};
export const SHELF = {
  center: new THREE.Vector3(ROOM.halfWidth - 0.18, 1.2, 1.2),
  width: 1.25,
  height: 1.85,
};
export const HOLO = new THREE.Vector3(0, 1.0, 1.75);

const GROUP_COLORS = [0x3d6fa3, 0x6b55b8, 0x2f8a83, 0xa8793a, 0xa14d6b];

function mat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
}

function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cssFont(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function canvasTexture(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { ctx: canvas.getContext("2d")!, texture };
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, width: number, max: number) {
  ctx.font = font(max);
  const w = ctx.measureText(text).width;
  return w > width ? Math.floor((max * width) / w) : max;
}

function buildWalls(group: THREE.Group) {
  const wall = mat(0x19202a);
  const depth = ROOM.depthEnd - ROOM.backZ;
  const z = (ROOM.depthEnd + ROOM.backZ) / 2;
  for (const side of [-1, 1]) {
    const w = box(0.08, ROOM.height, depth, wall);
    w.position.set(side * (ROOM.halfWidth + 0.04), ROOM.height / 2, z);
    group.add(w);
  }
  // A rug under the middle of the room.
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 8), mat(0x232b38));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.005, 1.7);
  rug.receiveShadow = true;
  group.add(rug);
}

// ---- Cork board -----------------------------------------------------------

function drawCard(card: Card, logo: HTMLImageElement | null) {
  const W = 640;
  const H = 420;
  const { ctx, texture } = canvasTexture(W, H);
  const display = cssFont("--font-unbounded", "sans-serif");
  const sans = cssFont("--font-anuphan", "sans-serif");
  const mono = cssFont("--font-jetbrains", "monospace");

  ctx.fillStyle = "#efe7d6";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(0, H - 10, W, 10);

  // Logo in a white circle.
  ctx.save();
  ctx.beginPath();
  ctx.arc(96, 110, 64, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.clip();
  if (logo) ctx.drawImage(logo, 40, 54, 112, 112);
  ctx.restore();

  ctx.fillStyle = "#1a1f27";
  const nameSize = fitText(ctx, card.company, (s) => `700 ${s}px ${display}`, W - 220, 36);
  ctx.font = `700 ${nameSize}px ${display}`;
  ctx.fillText(card.company, 184, 104);
  ctx.font = `500 24px ${mono}`;
  ctx.fillStyle = "#6b6252";
  ctx.fillText(card.period, 184, 144);

  ctx.fillStyle = "#1a1f27";
  const roleSize = fitText(ctx, card.role, (s) => `600 ${s}px ${sans}`, W - 80, 40);
  ctx.font = `600 ${roleSize}px ${sans}`;
  ctx.fillText(card.role, 40, 262);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(40, 290, 80, 5);

  texture.needsUpdate = true;
  return texture;
}

function buildBoard(group: THREE.Group, cards: Card[]) {
  const board = new THREE.Group();
  board.position.copy(BOARD.center);
  board.rotation.y = Math.PI / 2; // faces +x, into the room

  const { width, height } = BOARD;
  board.add(box(width + 0.1, height + 0.1, 0.04, mat(0x3a2f24)));
  const cork = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat(0x8c6b45, { roughness: 1 }));
  cork.position.z = 0.021;
  cork.receiveShadow = true;
  board.add(cork);

  const pins: THREE.Vector3[] = [];
  const cardW = 0.82;
  const cardH = cardW * (420 / 640);
  const n = cards.length;
  const textures: THREE.CanvasTexture[] = [];
  cards.forEach((card, i) => {
    const x = (i - (n - 1) / 2) * 1.02;
    const y = i % 2 === 0 ? 0.1 : -0.12;
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), material);
    mesh.position.set(x, y, 0.03);
    mesh.rotation.z = i % 2 === 0 ? 0.035 : -0.03;
    mesh.castShadow = true;
    board.add(mesh);

    let logoImg: HTMLImageElement | null = null;
    const paint = () => {
      material.map?.dispose();
      const t = drawCard(card, logoImg);
      textures.push(t);
      material.map = t;
      material.needsUpdate = true;
    };
    paint();
    document.fonts?.ready.then(paint);
    if (card.logo) {
      const img = new Image();
      img.onload = () => {
        logoImg = img;
        paint();
      };
      img.src = card.logo;
    }

    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 6),
      mat(0xd23a3a, { roughness: 0.4, emissive: 0x3a0808 }),
    );
    pin.position.set(x, y + cardH / 2 - 0.05, 0.06);
    pin.castShadow = true;
    board.add(pin);
    pins.push(pin.position.clone());
  });

  // Red string from pin to pin, sagging a little.
  for (let i = 0; i < pins.length - 1; i++) {
    const a = pins[i];
    const b = pins[i + 1];
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.14, 0.01));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const string = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, 0.0045, 5, false),
      mat(0xc22b2b, { emissive: 0x2a0505 }),
    );
    board.add(string);
  }

  // Warm light washing down over the board.
  const spot = new THREE.SpotLight(0xffe0b0, 14, 3.2, 0.7, 0.6, 2);
  spot.position.set(0, height / 2 + 0.55, 0.9);
  spot.target.position.set(0, 0, 0);
  board.add(spot, spot.target);

  group.add(board);
  return () => textures.forEach((t) => t.dispose());
}

// ---- Bookshelf -------------------------------------------------------------

interface Book {
  mesh: THREE.Mesh;
  group: number;
  materials: THREE.MeshStandardMaterial[];
  out: number;
}

function spineTexture(text: string, color: number, w: number, h: number) {
  const W = 96;
  const H = Math.round((W * h) / w);
  const { ctx, texture } = canvasTexture(W, H);
  const display = cssFont("--font-unbounded", "sans-serif");
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, 18, W, 4);
  ctx.fillRect(0, H - 22, W, 4);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#eef2f7";
  const size = fitText(ctx, text, (s) => `700 ${s}px ${display}`, H - 70, 44);
  ctx.font = `700 ${size}px ${display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 2);
  ctx.restore();
  texture.needsUpdate = true;
  return texture;
}

function labelTexture(text: string) {
  const { ctx, texture } = canvasTexture(512, 64);
  ctx.fillStyle = "#d9dee6";
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = "#1a1f27";
  ctx.font = `600 34px ${cssFont("--font-jetbrains", "monospace")}`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 18, 34);
  texture.needsUpdate = true;
  return texture;
}

function buildShelf(group: THREE.Group, groups: SkillGroup[]) {
  const shelf = new THREE.Group();
  shelf.position.set(SHELF.center.x, 0, SHELF.center.z);
  shelf.rotation.y = -Math.PI / 2; // faces −x, into the room

  const wood = mat(0x2b3442);
  const { width, height } = SHELF;
  const depth = 0.32;
  for (const side of [-1, 1]) {
    const post = box(0.04, height, depth, wood);
    post.position.set((side * width) / 2, height / 2, 0);
    shelf.add(post);
  }
  const back = box(width, height, 0.02, mat(0x1c232d));
  back.position.set(0, height / 2, -depth / 2);
  shelf.add(back);

  const rows = groups.length;
  const gap = (height - 0.1) / rows;
  const books: Book[] = [];
  const disposables: THREE.Texture[] = [];

  groups.forEach((g, row) => {
    // First group on the top shelf.
    const y = height - 0.05 - (row + 1) * gap;
    const board = box(width, 0.03, depth, wood);
    board.position.set(0, y, 0);
    shelf.add(board);

    // Soft LED strip under the shelf above.
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.1, 0.008, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.55 }),
    );
    strip.position.set(0, y + gap - 0.02, depth / 2 - 0.02);
    shelf.add(strip);

    const label = labelTexture(g.name);
    disposables.push(label);
    // Name plate on the front edge of the shelf board.
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.05), new THREE.MeshBasicMaterial({ map: label }));
    plaque.position.set(-width / 2 + 0.24, y - 0.008, depth / 2 + 0.004);
    shelf.add(plaque);

    let x = -width / 2 + 0.08;
    g.items.forEach((item, k) => {
      const seed = (row * 7 + k * 13) % 10;
      const w = 0.07 + (seed % 4) * 0.012;
      const h = Math.min(gap - 0.05, 0.22 + (seed % 5) * 0.022);
      const d = 0.2;
      const base = GROUP_COLORS[row % GROUP_COLORS.length];
      const tint = new THREE.Color(base).offsetHSL(0, 0, ((seed % 3) - 1) * 0.05).getHex();
      const spine = spineTexture(item, tint, w, h);
      disposables.push(spine);
      const plain = () => mat(tint, { roughness: 0.7 });
      const materials = [plain(), plain(), plain(), plain(), mat(0xffffff, { map: spine, roughness: 0.6, flatShading: false }), plain()];
      const mesh = box(w, h, d, materials);
      mesh.position.set(x + w / 2, y + 0.015 + h / 2, 0.02);
      shelf.add(mesh);
      books.push({ mesh, group: row, materials, out: 0 });
      x += w + 0.006;
    });
  });

  // Light from above and from the middle so the lower shelves read too.
  const glow = new THREE.PointLight(0x9fd0ff, 2.2, 3, 2);
  glow.position.set(0, height + 0.1, 0.7);
  const fill = new THREE.PointLight(0xbcd8ff, 2.4, 2.4, 2);
  fill.position.set(0, height * 0.35, 0.8);
  shelf.add(glow, fill);

  group.add(shelf);

  let active: number | null = null;
  const onActive = (e: Event) => {
    active = (e as CustomEvent<number | null>).detail ?? null;
  };
  window.addEventListener("stack:active", onActive);

  // Books of the active group slide out a little and glow.
  function update(dt: number) {
    const k = 1 - Math.exp(-dt * 10);
    for (const b of books) {
      const on = active === b.group;
      b.out += ((on ? 1 : 0) - b.out) * k;
      b.mesh.position.z = 0.02 + b.out * 0.06;
      const glowColor = GROUP_COLORS[b.group % GROUP_COLORS.length];
      for (const m of b.materials) {
        m.emissive.setHex(glowColor);
        m.emissiveIntensity = b.out * 0.55;
      }
    }
  }

  return {
    update,
    dispose: () => {
      window.removeEventListener("stack:active", onActive);
      disposables.forEach((t) => t.dispose());
    },
  };
}

export interface Article {
  title: string;
  date: string;
  author: string;
  image: string;
}

// ---- About wall (photo and diploma) ------------------------------------------

export interface AboutInfo {
  photo: string;
  school: string;
  degree: string;
  period: string;
  gpa: string;
  logo: string;
}

/** Centre of the two frames on the back wall, left of the desk. */
export const ABOUT_WALL = new THREE.Vector3(-1.75, 1.72, -0.7);

function frame(w: number, h: number, inner: THREE.Material) {
  const g = new THREE.Group();
  g.add(box(w + 0.06, h + 0.06, 0.03, mat(0x1b1f26, { roughness: 0.5 })));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), inner);
  pic.position.z = 0.016;
  g.add(pic);
  return g;
}

function buildAboutWall(group: THREE.Group, info: AboutInfo) {
  const textures: THREE.Texture[] = [];

  // Portrait photo (the image is 1276 × 2048).
  const photoMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
  new THREE.TextureLoader().load(info.photo, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    photoMat.map = t;
    photoMat.needsUpdate = true;
  });
  const ph = 0.62;
  const photo = frame(ph * (1276 / 2048), ph, photoMat);
  photo.position.set(ABOUT_WALL.x - 0.36, ABOUT_WALL.y, ABOUT_WALL.z);
  photo.rotation.z = 0.015;

  // Diploma drawn on a canvas.
  const W = 900;
  const H = 640;
  const { ctx, texture } = canvasTexture(W, H);
  textures.push(texture);
  let logo: HTMLImageElement | null = null;
  const draw = () => {
    const display = cssFont("--font-unbounded", "sans-serif");
    const sans = cssFont("--font-anuphan", "sans-serif");
    const mono = cssFont("--font-jetbrains", "monospace");
    ctx.fillStyle = "#f4efe2";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#b8975a";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, W - 76, H - 76);
    if (logo) ctx.drawImage(logo, W / 2 - 60, 66, 120, 120);
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1f27";
    const s1 = fitText(ctx, info.school, (s) => `700 ${s}px ${display}`, W - 140, 34);
    ctx.font = `700 ${s1}px ${display}`;
    ctx.fillText(info.school, W / 2, 252);
    const s2 = fitText(ctx, info.degree, (s) => `500 ${s}px ${sans}`, W - 140, 32);
    ctx.font = `500 ${s2}px ${sans}`;
    ctx.fillStyle = "#3a3f48";
    ctx.fillText(info.degree, W / 2, 322);
    ctx.font = `500 26px ${mono}`;
    ctx.fillStyle = "#6b6252";
    ctx.fillText(info.period, W / 2, 392);
    ctx.font = `700 40px ${display}`;
    ctx.fillStyle = "#8a6a2b";
    ctx.fillText(`GPA ${info.gpa}`, W / 2, 486);
    // Seal.
    ctx.beginPath();
    ctx.arc(W - 130, H - 120, 44, 0, Math.PI * 2);
    ctx.fillStyle = "#b8392b";
    ctx.fill();
    ctx.textAlign = "left";
    texture.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  if (info.logo) {
    const img = new Image();
    img.onload = () => {
      logo = img;
      draw();
    };
    img.src = info.logo;
  }
  const dw = 0.78;
  const diploma = frame(dw, dw * (H / W), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
  diploma.position.set(ABOUT_WALL.x + 0.3, ABOUT_WALL.y - 0.02, ABOUT_WALL.z);
  diploma.rotation.z = -0.01;

  // A picture light above the pair.
  const spot = new THREE.SpotLight(0xffe0b0, 10, 2.6, 0.8, 0.6, 2);
  spot.position.set(ABOUT_WALL.x, ABOUT_WALL.y + 0.75, ABOUT_WALL.z + 0.6);
  spot.target.position.copy(ABOUT_WALL);
  const lamp = box(0.5, 0.03, 0.05, mat(0x2b333e, { metalness: 0.5 }));
  lamp.position.set(ABOUT_WALL.x, ABOUT_WALL.y + 0.48, ABOUT_WALL.z + 0.05);

  group.add(photo, diploma, spot, spot.target, lamp);
  return () => textures.forEach((t) => t.dispose());
}

// ---- Contact: printer with the CV, business card on the monitor -------------

export interface ContactCard {
  name: string;
  role: string;
  email: string;
  phone: string;
}

/** Printer on a low cabinet right of the desk. */
export const PRINTER = new THREE.Vector3(1.52, 0.62, 0.2);

function cvTexture(card: ContactCard) {
  const W = 420;
  const H = 594;
  const { ctx, texture } = canvasTexture(W, H);
  const draw = () => {
    const display = cssFont("--font-unbounded", "sans-serif");
    const sans = cssFont("--font-anuphan", "sans-serif");
    ctx.fillStyle = "#fbfaf6";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7cc4ff";
    ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = "#1a1f27";
    ctx.font = `800 30px ${display}`;
    ctx.fillText("CV", 34, 74);
    const size = fitText(ctx, card.name, (s) => `700 ${s}px ${display}`, W - 68, 24);
    ctx.font = `700 ${size}px ${display}`;
    ctx.fillText(card.name, 34, 116);
    ctx.fillStyle = "#5b6472";
    ctx.font = `500 18px ${sans}`;
    ctx.fillText(card.role, 34, 144);
    // Placeholder text lines, in blocks.
    ctx.fillStyle = "#d9dde3";
    let y = 186;
    for (const block of [4, 3, 5, 3]) {
      ctx.fillStyle = "#b8c0cc";
      ctx.fillRect(34, y, 110, 9);
      y += 24;
      ctx.fillStyle = "#e1e4e9";
      for (let i = 0; i < block; i++) {
        ctx.fillRect(34, y, W - 68 - ((i * 37) % 90), 7);
        y += 17;
      }
      y += 14;
    }
    texture.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return texture;
}

function cardTexture(card: ContactCard) {
  const W = 512;
  const H = 300;
  const { ctx, texture } = canvasTexture(W, H);
  const draw = () => {
    const display = cssFont("--font-unbounded", "sans-serif");
    const mono = cssFont("--font-jetbrains", "monospace");
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7cc4ff";
    ctx.fillRect(0, H - 14, W, 14);
    ctx.fillStyle = "#1a1f27";
    const size = fitText(ctx, card.name, (s) => `700 ${s}px ${display}`, W - 60, 34);
    ctx.font = `700 ${size}px ${display}`;
    ctx.fillText(card.name, 30, 74);
    ctx.fillStyle = "#5b6472";
    ctx.font = `500 22px ${mono}`;
    ctx.fillText(card.role, 30, 112);
    ctx.fillStyle = "#1a1f27";
    const e = fitText(ctx, card.email, (s) => `500 ${s}px ${mono}`, W - 60, 22);
    ctx.font = `500 ${e}px ${mono}`;
    ctx.fillText(card.email, 30, 210);
    ctx.font = `500 20px ${mono}`;
    ctx.fillText(card.phone, 30, 244);
    texture.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);
  return texture;
}

function buildContactProps(group: THREE.Group, card: ContactCard) {
  const textures: THREE.Texture[] = [];

  // Low cabinet.
  const cabinet = box(0.6, 0.6, 0.45, mat(0x222a35));
  cabinet.position.set(PRINTER.x, 0.3, PRINTER.z);
  group.add(cabinet);

  // Printer body, paper slot and tray, facing into the room (−x… turned).
  const printer = new THREE.Group();
  printer.position.copy(PRINTER);
  printer.rotation.y = -0.5;
  const shell = mat(0xd5dbe3, { roughness: 0.55 });
  const body = box(0.44, 0.17, 0.34, shell);
  body.position.y = 0.085;
  const lid = box(0.4, 0.02, 0.26, mat(0x9aa4b1));
  lid.position.set(0, 0.18, -0.03);
  const slot = box(0.3, 0.012, 0.02, mat(0x1b1f26));
  slot.position.set(0, 0.11, 0.171);
  const tray = box(0.3, 0.008, 0.2, mat(0x9aa4b1));
  tray.position.set(0, 0.06, 0.26);
  tray.rotation.x = -0.12;
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.008, 10),
    new THREE.MeshBasicMaterial({ color: 0x7ee0a8 }),
  );
  led.position.set(0.17, 0.12, 0.171);
  printer.add(body, lid, slot, tray, led);

  // The CV page, sliding out of the slot onto the tray.
  const cv = cvTexture(card);
  textures.push(cv);
  const paperMat = new THREE.MeshStandardMaterial({ map: cv, roughness: 0.9, emissive: 0x000000 });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), paperMat);
  paper.rotation.x = -Math.PI / 2 + 0.12;
  paper.castShadow = true;
  printer.add(paper);
  group.add(printer);

  const printLight = new THREE.PointLight(0xdfe8ff, 1.2, 1.2, 2);
  printLight.position.set(PRINTER.x - 0.2, PRINTER.y + 0.5, PRINTER.z + 0.4);
  group.add(printLight);

  // Business card tucked into the bottom-right corner of the main monitor.
  const ct = cardTexture(card);
  textures.push(ct);
  const bcard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.0645),
    new THREE.MeshStandardMaterial({ map: ct, roughness: 0.8 }),
  );
  bcard.position.set(
    SCREEN.center.x + SCREEN.width / 2 - 0.03,
    SCREEN.center.y - SCREEN.height / 2 - 0.005,
    SCREEN.center.z + 0.004,
  );
  bcard.rotation.z = -0.12;
  group.add(bcard);

  // 0 = still inside the printer, 1 = fully out on the tray.
  let out = 0;
  let hover = 0;
  /** `taken`: the CV is being read up close, so it is off the tray. */
  function update(dt: number, printing: boolean, hovered: boolean, taken = false) {
    out += ((printing ? 1 : 0) - out) * (1 - Math.exp(-dt * (printing ? 0.9 : 4)));
    // Slide from the slot (hidden) down the tray.
    paper.position.set(0, 0.07 + 0.03 * (1 - out), 0.17 + 0.16 * out - 0.12 * (1 - out));
    paper.visible = out > 0.02 && !taken;
    hover += ((hovered ? 1 : 0) - hover) * (1 - Math.exp(-dt * 10));
    paperMat.emissive.setRGB(0.35 * hover, 0.55 * hover, 0.8 * hover);
    (led.material as THREE.MeshBasicMaterial).color.setHex(
      printing && out < 0.95 && Math.sin(performance.now() / 120) > 0 ? 0xffd27a : 0x7ee0a8,
    );
  }

  return {
    paper,
    update,
    dispose: () => textures.forEach((t) => t.dispose()),
  };
}

// ---- Side table with hologram projector ------------------------------------

function buildTable(group: THREE.Group) {
  const metal = mat(0x2b333e, { metalness: 0.4, roughness: 0.45 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 10), metal);
  top.position.set(HOLO.x, 0.56, HOLO.z);
  top.castShadow = top.receiveShadow = true;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), metal);
  leg.position.set(HOLO.x, 0.28, HOLO.z);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.02, 10), metal);
  foot.position.set(HOLO.x, 0.01, HOLO.z);

  const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.05, 12), mat(0x151a21));
  projector.position.set(HOLO.x, 0.6, HOLO.z);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 16),
    new THREE.MeshBasicMaterial({ color: 0x7cc4ff }),
  );
  lens.rotation.x = -Math.PI / 2;
  lens.position.set(HOLO.x, 0.626, HOLO.z);

  // Faint cone of light from the lens up into the hologram.
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, HOLO.y - 0.63, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x7cc4ff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  beam.rotation.x = Math.PI; // wide end up
  beam.position.set(HOLO.x, (HOLO.y + 0.63) / 2, HOLO.z);

  const light = new THREE.PointLight(0x7cc4ff, 1.4, 1.6, 2);
  light.position.set(HOLO.x, HOLO.y, HOLO.z);
  group.add(top, leg, foot, projector, lens, beam, light);
}

export function buildRoomProps(
  cards: Card[],
  groups: SkillGroup[],
  about?: AboutInfo,
  contact?: ContactCard,
) {
  const group = new THREE.Group();
  buildWalls(group);
  const disposeBoard = buildBoard(group, cards);
  const shelf = buildShelf(group, groups);
  const disposeAbout = about ? buildAboutWall(group, about) : () => {};
  const contactProps = contact ? buildContactProps(group, contact) : null;
  buildTable(group);
  return {
    group,
    update: shelf.update,
    contact: contactProps,
    dispose: () => {
      disposeBoard();
      disposeAbout();
      contactProps?.dispose();
      shelf.dispose();
    },
  };
}
