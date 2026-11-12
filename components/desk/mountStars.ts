import * as THREE from "three";
import { createNebula } from "./nebula";
import { createFleet } from "./ships";
import { createSky } from "./sky";

const FOV = 50;
const CAMERA_Z = 5;
// How far the camera drifts down per screen scrolled (parallax).
const DRIFT = 0.9;
const STAR_Z = [-20, -3] as const;

/**
 * Fixed starfield behind the page. Pauses while an element marked
 * [data-sky-cover] (the desk hero) fills the viewport. Returns a cleanup
 * function, or null without WebGL.
 */
export function mountStars(host: HTMLElement, reduced: boolean) {
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  } catch {
    return null;
  }
  const pixelRatio = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = "size-full opacity-0 transition-opacity duration-1000";
  host.appendChild(canvas);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  camera.position.z = CAMERA_Z;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  // Shooting stars start inside the part of the sky currently in view.
  const meteorArea = () => {
    const d = CAMERA_Z + 10;
    const halfH = tanHalf * d;
    const halfW = halfH * camera.aspect;
    return {
      x: [camera.position.x - halfW, camera.position.x + halfW] as const,
      y: [camera.position.y - halfH, camera.position.y + halfH] as const,
      z: [-12, -8] as const,
    };
  };

  const sky = createSky({
    count: coarse ? 700 : 1400,
    x: [-28, 28],
    y: [-32, 14],
    z: STAR_Z,
    pixelRatio,
    meteors: !reduced,
    meteorGap: [3, 8],
    meteorLength: 2.2,
    meteorArea,
  });
  const scene = new THREE.Scene();

  // Particle cloud that takes a different cosmic shape for each section.
  const nebula = createNebula({
    count: coarse ? 5000 : 9000,
    pixelRatio,
    cameraZ: CAMERA_Z,
  });
  scene.add(nebula.group);
  scene.add(sky.group);

  const sections = nebula.ids.map((id) => document.getElementById(id));
  // The section under the middle of the screen; before the first one, the first.
  const activeShape = () => {
    const mid = window.innerHeight / 2;
    let active = 0;
    sections.forEach((el, i) => {
      if (el && el.getBoundingClientRect().top <= mid) active = i;
    });
    return active;
  };
  nebula.show(activeShape(), true);

  // Spacecraft drifting past now and then (not with reduced motion).
  const SHIP_Z = [-11, -7] as const;
  const fleet = reduced
    ? null
    : createFleet({
        z: SHIP_Z,
        view: () => {
          const halfH = tanHalf * (CAMERA_Z - (SHIP_Z[0] + SHIP_Z[1]) / 2);
          const halfW = halfH * camera.aspect;
          const { x, y } = camera.position;
          return {
            x: [x - halfW, x + halfW] as const,
            y: [y - halfH, y + halfH] as const,
          };
        },
      });
  if (fleet) {
    scene.add(fleet.group);
    scene.add(new THREE.AmbientLight(0x4a5a7a, 1.6));
    const sun = new THREE.DirectionalLight(0xdfe8ff, 3.2);
    sun.position.set(-4, 5, 6);
    scene.add(sun);
  }

  const pointer = new THREE.Vector2();
  const tilt = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * 2 - 1,
    );
  };
  if (!reduced) window.addEventListener("pointermove", onPointer);

  // The 3D room or desk hero hides the sky; it may mount after this does.
  let cover: HTMLElement | null = null;
  const covered = () => {
    if (!cover?.isConnected) cover = document.querySelector<HTMLElement>("[data-sky-cover]");
    if (!cover) return false;
    const box = cover.getBoundingClientRect();
    return box.top <= 0 && box.bottom >= window.innerHeight;
  };

  let shown = false;
  let last = -1;
  const render = (time: number) => {
    const dt = last < 0 ? 0 : Math.min(0.1, (time - last) / 1000);
    last = time;
    if (!reduced) {
      tilt.lerp(pointer, 0.04);
      camera.position.x = tilt.x * 0.4;
      camera.position.y =
        -(window.scrollY / window.innerHeight) * DRIFT - tilt.y * 0.2;
    }
    sky.update(reduced ? 0 : time);
    fleet?.update(dt);

    nebula.show(activeShape(), reduced);
    // Keep the cloud in view, placed to one side as the section suits;
    // centred, smaller and dimmer on narrow screens where it sits behind text.
    const narrow = camera.aspect < 1;
    nebula.update(time, dt, reduced, narrow ? 0.28 : 1);
    const halfW = tanHalf * CAMERA_Z * camera.aspect;
    nebula.group.position.set(
      camera.position.x + nebula.offset * halfW * (narrow ? 0.6 : 1),
      camera.position.y + nebula.lift * tanHalf * CAMERA_Z * (narrow ? 0.4 : 1),
      0,
    );
    if (narrow) nebula.group.scale.multiplyScalar(0.7);
    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      canvas.style.opacity = "1";
    }
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reduced) render(0);
  };
  resize();
  window.addEventListener("resize", resize);

  let raf = 0;
  const loop = (time: number) => {
    raf = requestAnimationFrame(loop);
    if (!document.hidden && !covered()) render(time);
  };
  if (!reduced) raf = requestAnimationFrame(loop);
  // With reduced motion nothing animates; redraw on scroll so the shape
  // still changes per section (instantly).
  const onScroll = () => render(0);
  if (reduced) window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    fleet?.dispose();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    });
    renderer.dispose();
    canvas.remove();
  };
}
