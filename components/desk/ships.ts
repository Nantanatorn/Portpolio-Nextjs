import * as THREE from "three";

// Spacecraft that drift across the night sky now and then: a Sputnik, a
// satellite and an ISS-like space station. Low-poly, built from primitives.

type Range = readonly [number, number];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

const COLORS = {
  hull: 0xc9d3df,
  metal: 0xe3e8ee,
  dark: 0x2a3443,
  panel: 0x2d5f9e,
  gold: 0xc8a25a,
  light: 0xff6b6b,
};

function flat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.55,
    metalness: 0.25,
    ...extra,
  });
}

function beacon(radius: number, color = COLORS.light) {
  return new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 0),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
}

interface Model {
  root: THREE.Group;
  /** Seconds to cross the view, and size, picked at random in these ranges. */
  duration: Range;
  scale: Range;
  /** Called each frame with seconds alive. */
  animate: (t: number) => void;
}

// Polished sphere with four long antennae swept back, tumbling slowly.
function sputnik(): Model {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  body.add(
    new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.13, 1),
      flat(COLORS.metal, { metalness: 0.35, roughness: 0.3 }),
    ),
  );
  const rod = flat(COLORS.hull, { metalness: 0.7, roughness: 0.3 });
  const length = 0.75;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, length, 4), rod);
    // Lay along -x (backwards), then splay outwards.
    antenna.geometry.translate(0, -length / 2, 0);
    antenna.rotation.z = -Math.PI / 2;
    const holder = new THREE.Group();
    holder.rotation.x = a;
    const tilt = new THREE.Group();
    tilt.rotation.z = -0.32;
    tilt.position.y = 0.06;
    tilt.add(antenna);
    holder.add(tilt);
    body.add(holder);
  }

  return {
    root,
    duration: [24, 34],
    scale: [0.55, 0.8],
    animate: (t) => {
      body.rotation.x = t * 0.5;
      body.rotation.z = Math.sin(t * 0.3) * 0.25;
    },
  };
}

// Box satellite with two solar wings and a dish.
function satellite(): Model {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  spin.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.3), flat(COLORS.gold, { metalness: 0.6, roughness: 0.35 })));
  const panelMat = flat(COLORS.panel, { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });
  const armMat = flat(COLORS.dark);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.16), armMat);
    arm.position.z = side * 0.23;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.5), panelMat);
    panel.position.z = side * 0.56;
    spin.add(arm, panel);
  }
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.06, 8, 1, true),
    flat(COLORS.hull, { side: THREE.DoubleSide }),
  );
  dish.position.y = 0.15;
  spin.add(dish);

  const blink = beacon(0.022);
  blink.position.set(0, 0.2, 0);
  spin.add(blink);

  return {
    root,
    duration: [28, 38],
    scale: [0.6, 0.85],
    animate: (t) => {
      spin.rotation.x = t * 0.22;
      spin.rotation.y = 0.4 + Math.sin(t * 0.2) * 0.3;
      (blink.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(t * 3) > 0.7 ? 1 : 0.08;
    },
  };
}

// ISS-like station: long truss, pressurised modules, four solar arrays and
// radiators. Larger and slower than the others.
function station(): Model {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const truss = flat(COLORS.hull);
  const moduleMat = flat(COLORS.metal, { metalness: 0.35, roughness: 0.5 });
  const panelMat = flat(COLORS.panel, { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide });
  const radiatorMat = flat(0xf2f4f7, { roughness: 0.8, side: THREE.DoubleSide });

  body.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.05), truss));

  // Modules along z through the centre, and one short one along x.
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.8, 8), moduleMat);
  spine.rotation.x = Math.PI / 2;
  body.add(spine);
  const node = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), moduleMat);
  node.rotation.z = Math.PI / 2;
  body.add(node);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 8), moduleMat);
  lab.rotation.z = Math.PI / 2;
  lab.position.set(0, 0, 0.32);
  body.add(lab);

  // Solar arrays at both ends of the truss; they turn slowly to track the sun.
  const arrays: THREE.Group[] = [];
  for (const x of [-0.78, -0.58, 0.58, 0.78]) {
    const wing = new THREE.Group();
    wing.position.x = x;
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.62), panelMat);
      p.position.z = side * 0.36;
      wing.add(p);
    }
    body.add(wing);
    arrays.push(wing);
  }

  for (const x of [-0.25, 0.25]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.006, 0.14), radiatorMat);
    r.position.set(x, -0.1, 0);
    r.rotation.z = Math.PI / 2;
    body.add(r);
  }

  const blink = beacon(0.02);
  blink.position.set(0.86, 0.03, 0);
  body.add(blink);

  return {
    root,
    duration: [46, 62],
    scale: [0.9, 1.25],
    animate: (t) => {
      body.rotation.y = 0.5 + t * 0.03;
      body.rotation.x = 0.5 + Math.sin(t * 0.05) * 0.15;
      arrays.forEach((a) => (a.rotation.x = Math.sin(t * 0.08) * 0.6));
      (blink.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(t * 2.2) > 0.85 ? 1 : 0.05;
    },
  };
}

// The station is the showpiece, so it appears less often.
const MAKERS = [sputnik, satellite, sputnik, station];

interface Ship {
  model: Model;
  velocity: THREE.Vector3;
  age: number;
  exitX: number;
}

export interface FleetOptions {
  /** Part of the sky currently in view at the ships' depth. */
  view: () => { x: Range; y: Range };
  z: Range;
  max?: number;
  gap?: Range;
}

export function createFleet(opts: FleetOptions) {
  const group = new THREE.Group();
  const max = opts.max ?? 2;
  const gap = opts.gap ?? [6, 14];
  const ships: Ship[] = [];
  let nextSpawn = rand(2, 4);
  let lastKind = -1;

  function spawn() {
    let kind = Math.floor(Math.random() * MAKERS.length);
    if (kind === lastKind) kind = (kind + 1) % MAKERS.length;
    lastKind = kind;
    const model = MAKERS[kind]();

    const { x, y } = opts.view();
    const fromLeft = Math.random() < 0.5;
    const margin = 2;
    const startX = fromLeft ? x[0] - margin : x[1] + margin;
    const exitX = fromLeft ? x[1] + margin : x[0] - margin;
    const h = y[1] - y[0];
    const startY = rand(y[0] + h * 0.15, y[1] - h * 0.15);
    const width = x[1] - x[0] + margin * 2;
    const vx = (width / rand(...model.duration)) * (fromLeft ? 1 : -1);

    model.root.position.set(startX, startY, rand(opts.z[0], opts.z[1]));
    model.root.scale.setScalar(rand(...model.scale));
    model.root.rotation.y = fromLeft ? -0.3 : Math.PI + 0.3;
    group.add(model.root);
    ships.push({
      model,
      velocity: new THREE.Vector3(vx, rand(-0.05, 0.05), 0),
      age: 0,
      exitX,
    });
  }

  function remove(ship: Ship) {
    group.remove(ship.model.root);
    ship.model.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose());
    });
  }

  function update(dt: number) {
    nextSpawn -= dt;
    if (nextSpawn <= 0 && ships.length < max) {
      spawn();
      nextSpawn = rand(gap[0], gap[1]);
    }
    for (let i = ships.length - 1; i >= 0; i--) {
      const s = ships[i];
      s.age += dt;
      s.model.root.position.addScaledVector(s.velocity, dt);
      s.model.animate(s.age);
      const p = s.model.root.position.x;
      const done = s.velocity.x > 0 ? p > s.exitX : p < s.exitX;
      if (done || s.age > 120) {
        remove(s);
        ships.splice(i, 1);
      }
    }
  }

  function dispose() {
    ships.forEach(remove);
    ships.length = 0;
  }

  return { group, update, dispose };
}
