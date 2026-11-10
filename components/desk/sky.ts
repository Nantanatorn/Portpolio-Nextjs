import * as THREE from "three";

type Range = readonly [number, number];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const starVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPx;
  varying float vSeed;
  varying float vTwinkle;

  void main() {
    vSeed = aSeed;
    vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 40.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.0 + aSeed * aSeed * 2.6) * uPx;
  }
`;

const starFragment = /* glsl */ `
  precision mediump float;
  varying float vSeed;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(1.0), vec3(0.486, 0.769, 1.0), vSeed * 0.5);
    gl_FragColor = vec4(col, soft * vTwinkle * (0.35 + 0.65 * vSeed));
  }
`;

const trailVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Bright head at uv.x = 1 fading to nothing at the tail.
const trailFragment = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float a = pow(vUv.x, 2.5) * across * uOpacity;
    gl_FragColor = vec4(mix(vec3(0.486, 0.769, 1.0), vec3(1.0), vUv.x), a);
  }
`;

interface Meteor {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  active: boolean;
  t: number;
  duration: number;
  from: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
}

export interface SkyOptions {
  count: number;
  x: Range;
  y: Range;
  z: Range;
  pixelRatio: number;
  /** Seconds between shooting stars, picked at random in this range. */
  meteorGap?: Range;
  meteorLength?: number;
  /** Set false for a still sky (reduced motion). Default true. */
  meteors?: boolean;
  /** Where new shooting stars may start; defaults to the star box. */
  meteorArea?: () => { x: Range; y: Range; z: Range };
  /** Custom placement for each star instead of a uniform box. */
  place?: (i: number) => [number, number, number];
  /** Number of shooting stars that can be in flight at once. Default 2. */
  meteorPool?: number;
}

// Twinkling stars plus the occasional shooting star, all in one group.
export function createSky(opts: SkyOptions) {
  const group = new THREE.Group();
  const { count, x, y, z } = opts;
  const gap = opts.meteorGap ?? [2.5, 7];
  const length = opts.meteorLength ?? 0.9;
  const speedScale = length / 0.9;
  const meteorsOn = opts.meteors ?? true;
  const area = opts.meteorArea ?? (() => ({ x, y, z }));

  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [px, py, pz] = opts.place
      ? opts.place(i)
      : [rand(x[0], x[1]), rand(y[0], y[1]), rand(z[0], z[1])];
    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;
    seeds[i] = Math.random();
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const starUniforms = {
    uTime: { value: 0 },
    uPx: { value: opts.pixelRatio },
  };
  const stars = new THREE.Points(
    starGeometry,
    new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  stars.frustumCulled = false;
  group.add(stars);

  const trailGeometry = new THREE.PlaneGeometry(length, length * 0.022);
  const meteors: Meteor[] = Array.from({ length: opts.meteorPool ?? 2 }, () => {
    const mesh = new THREE.Mesh(
      trailGeometry,
      new THREE.ShaderMaterial({
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        uniforms: { uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.visible = false;
    group.add(mesh);
    return {
      mesh,
      active: false,
      t: 0,
      duration: 1,
      from: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      speed: 1,
    };
  });

  let nextMeteor = rand(0.8, 2);
  let last = -1;

  function launch(m: Meteor) {
    // Fall down and to the left at a shallow angle, from the upper part of the sky.
    const angle = rand(Math.PI * 1.08, Math.PI * 1.25);
    m.dir.set(Math.cos(angle), Math.sin(angle), 0);
    const a = area();
    m.from.set(
      rand(a.x[0] + (a.x[1] - a.x[0]) * 0.3, a.x[1]),
      rand(a.y[0] + (a.y[1] - a.y[0]) * 0.55, a.y[1]),
      rand(a.z[0], a.z[1]),
    );
    m.speed = rand(2.4, 3.6) * speedScale;
    m.duration = rand(0.7, 1.1);
    m.t = 0;
    m.active = true;
    m.mesh.visible = true;
    // The plane's +x is the head; point it along the direction of travel.
    m.mesh.rotation.z = angle;
  }

  function update(time: number) {
    const seconds = time / 1000;
    const dt = last < 0 ? 0 : Math.min(0.1, seconds - last);
    last = seconds;
    starUniforms.uTime.value = seconds;

    nextMeteor -= dt;
    if (meteorsOn && nextMeteor <= 0) {
      const free = meteors.find((m) => !m.active);
      if (free) launch(free);
      nextMeteor = rand(gap[0], gap[1]);
    }

    for (const m of meteors) {
      if (!m.active) continue;
      m.t += dt;
      const k = m.t / m.duration;
      if (k >= 1) {
        m.active = false;
        m.mesh.visible = false;
        continue;
      }
      m.mesh.position
        .copy(m.from)
        .addScaledVector(m.dir, m.speed * m.t);
      m.mesh.material.uniforms.uOpacity.value = Math.sin(Math.PI * k);
    }
  }

  return { group, update };
}
