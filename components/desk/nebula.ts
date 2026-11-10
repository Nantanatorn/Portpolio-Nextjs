import * as THREE from "three";

// One particle cloud that morphs into a different cosmic shape for each
// section of the page: sphere, orbit ring, nebula, ringed planet, spiral
// galaxy and drifting dust. Shapes are built in a frame whose spin axis is y;
// each shape then has its own tilt, scale, screen offset and palette.

type Vec3 = [number, number, number];
type RGB = [number, number, number];

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
// Gaussian via Box–Muller.
const gauss = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());

function hex(c: number): RGB {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const WHITE = hex(0xffffff);
const ACCENT = hex(0x7cc4ff);
const TEAL = hex(0x5fd4d0);
const VIOLET = hex(0x9b86ff);
const DEEP = hex(0x5a4cd6);
const SAND = hex(0xe9c79a);
const EMBER = hex(0xf0915a);
const PALE = hex(0xcfd8e6);

export interface Shape {
  /** Section id this shape belongs to. */
  id: string;
  point: (i: number, n: number, seed: number) => Vec3;
  color: (p: Vec3, seed: number) => RGB;
  tilt: [number, number];
  scale: number;
  /** Horizontal offset in half-view widths (−1 left edge … 1 right edge). */
  offset: number;
  /** Vertical offset in half-view heights (positive is up). */
  lift?: number;
  /** Point size multiplier. */
  size?: number;
  /** Spin speed multiplier (0 holds still, facing `yaw`). Default 1. */
  spin?: number;
  /** Rotation about the vertical axis while holding still. */
  yaw?: number;
  alpha: number;
}

function sphere(): Shape {
  return {
    id: "about",
    point: () => {
      const u = rand(-1, 1);
      const t = rand(0, TAU);
      const r = Math.sqrt(1 - u * u);
      const shell = 1.6 * (0.86 + 0.14 * Math.sqrt(Math.random()));
      return [r * Math.cos(t) * shell, u * shell, r * Math.sin(t) * shell];
    },
    color: (_p, s) => mixRGB(ACCENT, WHITE, s * 0.45),
    tilt: [0, 0],
    scale: 1,
    offset: 0.5,
    alpha: 0.9,
  };
}

function ring(): Shape {
  return {
    id: "work",
    point: (i, n) => {
      if (i < n * 0.12) {
        // Small glowing body at the centre of the orbit.
        const r = 0.28 * Math.cbrt(Math.random());
        const u = rand(-1, 1);
        const t = rand(0, TAU);
        const k = Math.sqrt(1 - u * u);
        return [k * Math.cos(t) * r, u * r, k * Math.sin(t) * r];
      }
      // Two thin orbits.
      const outer = Math.random() < 0.65;
      const R = (outer ? 1.95 : 1.25) + gauss() * 0.05;
      const t = rand(0, TAU);
      return [Math.cos(t) * R, gauss() * 0.025, Math.sin(t) * R];
    },
    color: (p, s) => {
      const r = Math.hypot(p[0], p[2]);
      return r < 0.4 ? mixRGB(WHITE, ACCENT, s * 0.4) : mixRGB(TEAL, ACCENT, s);
    },
    tilt: [1.2, 0.35],
    scale: 1,
    offset: -0.5,
    alpha: 0.85,
  };
}

// A flat wall of dots in a regular grid, like an LED wall seen at an angle,
// with a gentle wave across it and edges that fade out. Its order keeps the
// skill words in front easy to read.
function wall(): Shape {
  return {
    id: "stack",
    point: (i, n) => {
      const cols = Math.round(Math.sqrt(n * 1.6));
      const rows = Math.ceil(n / cols);
      const u = (i % cols) / (cols - 1) - 0.5;
      const v = Math.floor(i / cols) / (rows - 1) - 0.5;
      return [u * 4.6, v * 3, 0.14 * Math.sin(u * 7 + v * 3)];
    },
    color: (p, s) => {
      const u = p[0] / 4.6;
      const v = p[1] / 3;
      const edge =
        Math.min(1, (0.5 - Math.abs(u)) * 5) * Math.min(1, (0.5 - Math.abs(v)) * 5);
      const base = mixRGB(DEEP, VIOLET, 0.5 + 0.5 * Math.sin(u * 5 + v * 2));
      // A few brighter "pixels" scattered through the wall.
      const lit = s > 0.94 ? mixRGB(base, s > 0.985 ? WHITE : ACCENT, 0.7) : base;
      const k = 0.25 + 0.75 * Math.max(0, edge);
      return [lit[0] * k, lit[1] * k, lit[2] * k];
    },
    tilt: [0.08, 0],
    yaw: -0.55,
    spin: 0,
    scale: 1,
    offset: -0.48,
    size: 1.15,
    alpha: 1,
  };
}

function planet(): Shape {
  return {
    id: "projects",
    point: (i, n) => {
      if (i < n * 0.5) {
        const u = rand(-1, 1);
        const t = rand(0, TAU);
        const k = Math.sqrt(1 - u * u);
        const r = 0.85 + Math.random() * 0.04;
        return [k * Math.cos(t) * r, u * r, k * Math.sin(t) * r];
      }
      // Ring with a visible gap between two bands.
      const band = Math.random() < 0.6 ? rand(1.3, 1.75) : rand(1.85, 2.2);
      const t = rand(0, TAU);
      return [Math.cos(t) * band, gauss() * 0.012, Math.sin(t) * band];
    },
    color: (p, s) => {
      const r = Math.hypot(p[0], p[2]);
      if (Math.abs(p[1]) < 0.03 && r > 1.2) return mixRGB(PALE, SAND, s);
      // Banded surface by latitude.
      const band = 0.5 + 0.5 * Math.sin(p[1] * 9);
      return mixRGB(mixRGB(SAND, EMBER, band * 0.6), WHITE, s * 0.25);
    },
    tilt: [0.32, -0.38],
    scale: 0.42,
    offset: 0.28,
    lift: 0.8,
    size: 1.2,
    alpha: 0.85,
  };
}

function galaxy(): Shape {
  const ARMS = 2;
  return {
    id: "writing",
    point: (i, n) => {
      if (i < n * 0.1) {
        // Bright bulge.
        const r = Math.abs(gauss()) * 0.18;
        const t = rand(0, TAU);
        return [Math.cos(t) * r, gauss() * 0.06, Math.sin(t) * r];
      }
      const arm = i % ARMS;
      const r = 0.15 + Math.pow(Math.random(), 0.85) * 2.9;
      const t = (arm / ARMS) * TAU + r * 2.1 + (gauss() * 0.1) / (0.5 + r * 0.3);
      const spread = 0.025 + r * 0.03;
      return [
        Math.cos(t) * r + gauss() * spread,
        gauss() * 0.04,
        Math.sin(t) * r + gauss() * spread,
      ];
    },
    color: (p, s) => {
      const r = Math.hypot(p[0], p[2]);
      if (r < 0.3) return mixRGB(WHITE, SAND, s * 0.5);
      const warm = mixRGB(EMBER, SAND, Math.min(1, r / 2.2));
      return s > 0.8 ? mixRGB(warm, WHITE, 0.7) : warm;
    },
    tilt: [0.95, 0.15],
    scale: 0.85,
    offset: 0.1,
    size: 1.35,
    alpha: 1,
  };
}

function dust(): Shape {
  return {
    id: "contact",
    point: () => [rand(-3.2, 3.2), gauss() * 0.9, rand(-1.5, 1.5)],
    color: (_p, s) => mixRGB(ACCENT, WHITE, s * 0.6),
    tilt: [0, 0],
    scale: 1,
    offset: 0.2,
    alpha: 0.6,
  };
}

export const SHAPES = [sphere(), ring(), wall(), planet(), galaxy(), dust()];

const vertex = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPx;
  uniform float uCameraZ;
  uniform float uSize;
  varying vec3 vColor;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vColor = aColor;
    vec3 p = position;
    p *= 1.0 + 0.02 * sin(aSeed * 40.0 + uTime * 0.6);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.1 + aSeed * 1.8) * uSize * uPx * (uCameraZ / -mv.z);
  }
`;

const fragment = /* glsl */ `
  precision mediump float;
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, soft * uAlpha * (0.3 + 0.7 * vSeed));
  }
`;

export function createNebula(opts: {
  count: number;
  pixelRatio: number;
  cameraZ: number;
}) {
  const n = opts.count;
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) seeds[i] = Math.random();

  // Every shape's positions and colours, generated once.
  const shapes = SHAPES.map((shape) => {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const p = shape.point(i, n, seeds[i]);
      const c = shape.color(p, seeds[i]);
      pos.set(p, i * 3);
      col.set(c, i * 3);
    }
    return { shape, pos, col };
  });

  const position = new Float32Array(shapes[0].pos);
  const color = new Float32Array(shapes[0].col);
  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(position, 3);
  const colAttr = new THREE.BufferAttribute(color, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("aColor", colAttr);
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPx: { value: opts.pixelRatio },
    uCameraZ: { value: opts.cameraZ },
    uAlpha: { value: shapes[0].shape.alpha },
    uSize: { value: shapes[0].shape.size ?? 1 },
  };
  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;

  // Spin lives on the inner object; tilt, scale and placement on the outer.
  const group = new THREE.Group();
  group.add(points);

  const fromPos = new Float32Array(position);
  const fromCol = new Float32Array(color);
  let current = 0;
  let target = 0;
  let t = 1;
  const MORPH = 2.2; // seconds
  const STAGGER = 0.4; // share of the morph spent staggering points
  const look = {
    tiltX: 0,
    tiltZ: 0,
    scale: shapes[0].shape.scale,
    offset: shapes[0].shape.offset,
    lift: shapes[0].shape.lift ?? 0,
    size: shapes[0].shape.size ?? 1,
    alpha: shapes[0].shape.alpha,
  };

  /** Start morphing to shape `index` (instant skips the animation). */
  function show(index: number, instant = false) {
    if (index === target && !instant) return;
    fromPos.set(position);
    fromCol.set(color);
    target = index;
    t = instant ? 1 : 0;
    if (instant) {
      position.set(shapes[index].pos);
      color.set(shapes[index].col);
      posAttr.needsUpdate = colAttr.needsUpdate = true;
      current = index;
    }
  }

  const smooth = (v: number) => v * v * (3 - 2 * v);

  /** `dim` scales brightness, e.g. lower on narrow screens behind text. */
  function update(time: number, dt: number, still: boolean, dim = 1) {
    uniforms.uTime.value = still ? 0 : time / 1000;
    const spin = shapes[target].shape.spin ?? 1;
    if (!still && spin > 0) {
      points.rotation.y += dt * 0.08 * spin;
    } else if (!still) {
      // Turn to the nearest full turn plus this shape's yaw, then hold.
      const yaw = shapes[target].shape.yaw ?? 0;
      const goal = Math.round((points.rotation.y - yaw) / TAU) * TAU + yaw;
      points.rotation.y += (goal - points.rotation.y) * (1 - Math.exp(-dt * 2.5));
    }

    if (t < 1) {
      t = Math.min(1, t + dt / MORPH);
      const to = shapes[target];
      for (let i = 0; i < n; i++) {
        // Each point sets off a little later than the last few, by its seed.
        const local = smooth(
          Math.min(1, Math.max(0, (t - seeds[i] * STAGGER) / (1 - STAGGER))),
        );
        const j = i * 3;
        for (let k = 0; k < 3; k++) {
          position[j + k] = fromPos[j + k] + (to.pos[j + k] - fromPos[j + k]) * local;
          color[j + k] = fromCol[j + k] + (to.col[j + k] - fromCol[j + k]) * local;
        }
      }
      posAttr.needsUpdate = colAttr.needsUpdate = true;
      if (t === 1) current = target;
    }

    // Ease the framing towards the target shape's.
    const s = shapes[target].shape;
    const k = still ? 1 : 1 - Math.exp(-dt * 2.2);
    look.tiltX += (s.tilt[0] - look.tiltX) * k;
    look.tiltZ += (s.tilt[1] - look.tiltZ) * k;
    look.scale += (s.scale - look.scale) * k;
    look.offset += (s.offset - look.offset) * k;
    look.alpha += (s.alpha - look.alpha) * k;
    look.lift += ((s.lift ?? 0) - look.lift) * k;
    look.size += ((s.size ?? 1) - look.size) * k;
    uniforms.uSize.value = look.size;
    group.rotation.set(look.tiltX, 0, look.tiltZ);
    group.scale.setScalar(look.scale);
    uniforms.uAlpha.value = look.alpha * dim;
  }

  return {
    group,
    show,
    update,
    get offset() {
      return look.offset;
    },
    get lift() {
      return look.lift;
    },
    get current() {
      return current;
    },
    ids: SHAPES.map((s) => s.id),
  };
}
