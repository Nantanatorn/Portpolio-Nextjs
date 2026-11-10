import * as THREE from "three";

// Low-poly desk scene built from primitives (no model files).
// Units are metres; the desk top surface sits at y = TOP.

const TOP = 0.775;
const WALL_Z = -0.75;
const WINDOW = { x0: 0.45, x1: 1.55, y0: 1.25, y1: 2.25 };

export const SCREEN = {
  center: new THREE.Vector3(0, 1.36, -0.256),
  width: 0.94,
  height: 0.54,
};

// Secondary screens (sizes of the visible panel, metres).
export const PORTRAIT = { width: 0.4, height: 0.68 };
export const LAPTOP = { width: 0.33, height: 0.205 };

const PALETTE = {
  floor: 0x10151c,
  wall: 0x19202a,
  frame: 0x232c38,
  deskTop: 0x2a3443,
  deskLeg: 0x1b222c,
  monitor: 0x0f141a,
  stand: 0x2b333e,
  keyboard: 0x1f2731,
  key: 0x323d4b,
  mug: 0x7cc4ff,
  lamp: 0x3a4452,
  bulb: 0xffe2b8,
  pot: 0xc9d3df,
  leaf: 0x4f8a6e,
  sky: 0x070a10,
};

function mat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.05,
    ...extra,
  });
}

function box(w: number, h: number, d: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number) {
  obj.position.set(x, y, z);
  return obj;
}

function buildRoom(group: THREE.Group) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    mat(PALETTE.floor),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Wall with a window opening, built from four slabs around the hole.
  const wall = mat(PALETTE.wall);
  const H = 3.2;
  const T = 0.08;
  const { x0, x1, y0, y1 } = WINDOW;
  const left = box(x0 + 4, H, T, wall);
  at(left, (x0 - 4) / 2, H / 2, WALL_Z);
  const right = box(4 - x1, H, T, wall);
  at(right, (x1 + 4) / 2, H / 2, WALL_Z);
  const below = box(x1 - x0, y0, T, wall);
  at(below, (x0 + x1) / 2, y0 / 2, WALL_Z);
  const above = box(x1 - x0, H - y1, T, wall);
  at(above, (x0 + x1) / 2, (y1 + H) / 2, WALL_Z);
  group.add(left, right, below, above);

  // Window frame and a cross mullion.
  const frame = mat(PALETTE.frame);
  const f = 0.04;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  group.add(
    at(box(x1 - x0 + f, f, 0.1, frame), cx, y0, WALL_Z),
    at(box(x1 - x0 + f, f, 0.1, frame), cx, y1, WALL_Z),
    at(box(f, y1 - y0, 0.1, frame), x0, cy, WALL_Z),
    at(box(f, y1 - y0, 0.1, frame), x1, cy, WALL_Z),
    at(box(f * 0.6, y1 - y0, 0.06, frame), cx, cy, WALL_Z),
    at(box(x1 - x0, f * 0.6, 0.06, frame), cx, cy, WALL_Z),
    // Sill
    at(box(x1 - x0 + 0.12, 0.03, 0.16, frame), cx, y0 - 0.02, WALL_Z + 0.06),
  );
}

function buildDeskBody(group: THREE.Group) {
  const top = mat(PALETTE.deskTop, { roughness: 0.7 });
  const leg = mat(PALETTE.deskLeg);
  group.add(at(box(2.4, 0.05, 1.0, top), 0, TOP - 0.025, 0));
  for (const x of [-1.12, 1.12]) {
    for (const z of [-0.42, 0.42]) {
      group.add(at(box(0.05, TOP - 0.05, 0.05, leg), x, (TOP - 0.05) / 2, z));
    }
  }
  // A drawer block under the left side.
  group.add(at(box(0.5, 0.28, 0.9, leg), -0.82, TOP - 0.19, 0));
}

function buildMonitor(group: THREE.Group, screenTexture: THREE.Texture) {
  const body = mat(PALETTE.monitor, { roughness: 0.5 });
  const stand = mat(PALETTE.stand, { metalness: 0.4, roughness: 0.45 });
  const { center, width, height } = SCREEN;

  group.add(at(box(0.32, 0.015, 0.2, stand), 0, TOP + 0.008, -0.27));
  group.add(at(box(0.05, 0.42, 0.04, stand), 0, TOP + 0.22, -0.31));
  group.add(at(box(width + 0.06, height + 0.06, 0.035, body), center.x, center.y, center.z - 0.019));

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  screen.position.copy(center);
  group.add(screen);
}

function screenMesh(width: number, height: number, texture: THREE.Texture) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
}

// Portrait monitor to the right, turned towards the chair.
function buildPortraitMonitor(group: THREE.Group, texture: THREE.Texture) {
  const body = mat(PALETTE.monitor, { roughness: 0.5 });
  const stand = mat(PALETTE.stand, { metalness: 0.4, roughness: 0.45 });
  const { width, height } = PORTRAIT;
  const mon = new THREE.Group();
  mon.position.set(0.86, TOP, -0.2);
  mon.rotation.y = -0.5;

  const cy = 0.1 + height / 2;
  mon.add(at(box(0.22, 0.015, 0.16, stand), 0, 0.008, -0.02));
  mon.add(at(box(0.04, cy, 0.035, stand), 0, cy / 2, -0.05));
  mon.add(at(box(width + 0.04, height + 0.04, 0.03, body), 0, cy, -0.016));
  mon.add(at(screenMesh(width, height, texture), 0, cy, 0.0));
  group.add(mon);

  const glow = new THREE.PointLight(0x7cc4ff, 0.9, 1.3, 2);
  glow.position.set(0.72, TOP + cy - 0.15, 0.1);
  group.add(glow);
}

// Open laptop to the left, angled in.
function buildLaptop(group: THREE.Group, texture: THREE.Texture) {
  const shell = mat(PALETTE.stand, { metalness: 0.45, roughness: 0.4 });
  const deck = mat(PALETTE.keyboard);
  const { width, height } = LAPTOP;
  const lap = new THREE.Group();
  lap.position.set(-0.64, TOP, 0.02);
  lap.rotation.y = 0.45;

  const w = width + 0.03;
  const d = 0.24;
  lap.add(at(box(w, 0.016, d, shell), 0, 0.008, 0));
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, d * 0.45), deck);
  keys.rotation.x = -Math.PI / 2;
  lap.add(at(keys, 0, 0.0165, -0.02));

  // Lid hinged at the back edge and leaning back.
  const lid = new THREE.Group();
  lid.position.set(0, 0.016, -d / 2);
  lid.rotation.x = -0.28;
  const lh = height + 0.025;
  lid.add(at(box(w, lh, 0.01, shell), 0, lh / 2, 0));
  lid.add(at(screenMesh(width, height, texture), 0, lh / 2, 0.0055));
  lap.add(lid);
  group.add(lap);

  const glow = new THREE.PointLight(0x7cc4ff, 0.6, 0.9, 2);
  glow.position.set(-0.55, TOP + 0.15, 0.15);
  group.add(glow);
}

function buildKeyboard(group: THREE.Group) {
  group.add(at(box(0.6, 0.02, 0.19, mat(PALETTE.keyboard)), 0, TOP + 0.01, 0.12));

  const cols = 14;
  const rows = 4;
  const keys = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.034, 0.012, 0.034),
    mat(PALETTE.key),
    cols * rows,
  );
  keys.castShadow = true;
  const m = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.makeTranslation(-0.27 + c * 0.0415, TOP + 0.026, 0.058 + r * 0.042);
      keys.setMatrixAt(i++, m);
    }
  }
  group.add(keys);

  // Mouse
  const mouse = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 7, 5),
    mat(PALETTE.keyboard),
  );
  mouse.scale.set(0.75, 0.4, 1.1);
  mouse.castShadow = true;
  group.add(at(mouse, 0.45, TOP + 0.012, 0.14));
}

function buildMug(group: THREE.Group) {
  const m = mat(PALETTE.mug, { roughness: 0.5 });
  const [mx, mz] = [-1.02, 0.24];
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 10), m);
  cup.castShadow = true;
  group.add(at(cup, mx, TOP + 0.055, mz));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 8), m);
  handle.rotation.y = Math.PI / 2;
  group.add(at(handle, mx + 0.055, TOP + 0.06, mz));
  // Coffee surface
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.044, 10),
    mat(0x3b2618),
  );
  coffee.rotation.x = -Math.PI / 2;
  group.add(at(coffee, mx, TOP + 0.1, mz));
}

function buildLamp(group: THREE.Group) {
  const metal = mat(PALETTE.lamp, { metalness: 0.5, roughness: 0.4 });
  const lamp = new THREE.Group();
  lamp.position.set(-0.95, TOP, -0.25);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.025, 8), metal);
  base.position.y = 0.012;
  base.castShadow = true;

  const lower = box(0.025, 0.5, 0.025, metal);
  lower.position.set(0.06, 0.25, 0);
  lower.rotation.z = -0.25;

  const upper = box(0.025, 0.4, 0.025, metal);
  upper.position.set(0.25, 0.56, 0.08);
  upper.rotation.z = -1.1;
  upper.rotation.y = -0.4;

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.13, 8, 1, true), metal);
  head.position.set(0.42, 0.6, 0.15);
  head.rotation.z = 0.5;
  head.castShadow = true;

  const bulb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.03, 0),
    new THREE.MeshBasicMaterial({ color: PALETTE.bulb, toneMapped: false }),
  );
  bulb.position.set(0.43, 0.57, 0.15);

  lamp.add(base, lower, upper, head, bulb);
  group.add(lamp);

  // Warm cone of light onto the desk.
  const light = new THREE.SpotLight(0xffd9a8, 9, 2.6, 0.75, 0.7, 2);
  light.position.set(-0.95 + 0.43, TOP + 0.56, -0.1);
  light.target.position.set(-0.35, TOP, 0.1);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0008;
  group.add(light, light.target);
  return light;
}

function buildPlant(group: THREE.Group) {
  const plant = new THREE.Group();
  plant.position.set(1.06, TOP, 0.22);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.055, 0.14, 7),
    mat(PALETTE.pot, { roughness: 0.6 }),
  );
  pot.position.y = 0.07;
  pot.castShadow = true;
  plant.add(pot);

  const leaf = mat(PALETTE.leaf);
  const leaves: [number, number, number, number, number][] = [
    [0, 0.25, 0, 0, 0.14],
    [0.06, 0.21, 0.03, -0.5, 0.11],
    [-0.06, 0.22, -0.02, 0.5, 0.12],
    [0.02, 0.2, -0.06, 0.3, 0.1],
    [-0.03, 0.19, 0.06, -0.3, 0.1],
  ];
  for (const [x, y, z, tilt, h] of leaves) {
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.035, h * 2.2, 4), leaf);
    l.position.set(x, y, z);
    l.rotation.z = tilt;
    l.rotation.x = tilt * 0.6;
    l.castShadow = true;
    plant.add(l);
  }
  group.add(plant);
}

export function buildDesk(screens: {
  main: THREE.Texture;
  code: THREE.Texture;
  logs: THREE.Texture;
}) {
  const group = new THREE.Group();
  buildRoom(group);
  buildDeskBody(group);
  buildMonitor(group, screens.main);
  buildPortraitMonitor(group, screens.code);
  buildLaptop(group, screens.logs);
  buildKeyboard(group);
  buildMug(group);
  buildPlant(group);
  const lampLight = buildLamp(group);

  group.add(new THREE.HemisphereLight(0x4a5a75, 0x0e1218, 0.9));

  // Cool glow from the screen onto the keyboard and the desk.
  const glow = new THREE.PointLight(0x7cc4ff, 2.2, 2.4, 2);
  glow.position.set(SCREEN.center.x, SCREEN.center.y - 0.1, SCREEN.center.z + 0.35);
  group.add(glow);

  // Faint moonlight coming through the window.
  const moon = new THREE.DirectionalLight(0x8fb4ff, 0.5);
  moon.position.set(1.4, 3, -3);
  moon.target.position.set(0.4, TOP, 0.2);
  group.add(moon, moon.target);

  return { group, lampLight, skyColor: PALETTE.sky };
}

// Everything visible through the window lives behind the wall.
export const SKY_REGION = {
  x: [-1.5, 6] as const,
  y: [0.6, 6] as const,
  z: [-6, -3] as const,
};
