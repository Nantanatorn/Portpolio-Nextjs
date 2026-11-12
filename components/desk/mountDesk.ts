import * as THREE from "three";
import { LAPTOP, PORTRAIT, SCREEN, SKY_REGION, buildDesk } from "./buildDesk";
import { createScreenTexture, type ScreenText } from "./screenTexture";
import { createCodeTexture, createLogTexture } from "./sideScreens";
import { signal } from "./signals";
import { createSky } from "./sky";

const FOV = 40;
const START_LOOK = new THREE.Vector3(0, 1.1, -0.2);
// Overlay text is fully faded by this scroll progress (matches the CSS).
const FADED_AT = 0.34;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

// Camera distance at which a halfW × halfH rectangle fills the view.
function fitDistance(halfW: number, halfH: number, aspect: number) {
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return Math.max(halfH / tanV, halfW / (tanV * aspect));
}

/**
 * Renders the desk into `host`. Scroll progress through `track` moves the
 * camera from a wide shot into the monitor and is written to `track` as the
 * CSS variable --p. Returns a cleanup function, or null without WebGL.
 */
export function mountDesk(
  track: HTMLElement,
  host: HTMLElement,
  text: ScreenText,
): (() => void) | null {
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !coarse, alpha: false });
  } catch {
    return null;
  }
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = !coarse;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // static scene: draw shadows once
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const canvas = renderer.domElement;
  canvas.className =
    "absolute inset-0 size-full opacity-0 transition-opacity duration-700";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const screenTex = createScreenTexture(text);
  const codeTex = createCodeTexture(PORTRAIT.width, PORTRAIT.height);
  const logTex = createLogTexture(LAPTOP.width, LAPTOP.height);
  const screens = [screenTex, codeTex, logTex];
  const desk = buildDesk({
    main: screenTex.texture,
    code: codeTex.texture,
    codeTab: codeTex.tab,
    logs: logTex.texture,
  });
  scene.background = new THREE.Color(desk.skyColor);
  if (coarse) desk.lampLight.castShadow = false;
  scene.add(desk.group);

  const sky = createSky({
    count: coarse ? 260 : 420,
    ...SKY_REGION,
    pixelRatio,
  });
  scene.add(sky.group);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 30);
  const startPos = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const size = { w: 1, h: 1 };

  const layout = () => {
    const aspect = camera.aspect;
    // Portrait screens crop to the monitor and its neighbours.
    const halfW = aspect < 1 ? 0.8 : 1.35;
    const d = Math.max(2.6, fitDistance(halfW, 0.75, aspect));
    startPos.set(0, START_LOOK.y + 0.18 * d, START_LOOK.z + d);
    const close =
      fitDistance(SCREEN.width / 2, SCREEN.height / 2, aspect) * 1.06;
    endPos.copy(SCREEN.center).add(new THREE.Vector3(0, 0, close));
  };

  const pointer = new THREE.Vector2();
  const tilt = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * 2 - 1,
    );
  };
  window.addEventListener("pointermove", onPointer);

  const progress = () => {
    const box = track.getBoundingClientRect();
    const run = box.height - window.innerHeight;
    return run > 0 ? clamp01(-box.top / run) : 0;
  };

  let shown = false;
  let faded = false;
  // The camera eases towards the scroll position so wheel steps don't jump.
  let p = progress();
  let last = -1;
  const render = (time: number) => {
    const dt = last < 0 ? 0 : Math.min(0.1, (time - last) / 1000);
    last = time;
    const target = progress();
    p += (target - p) * (1 - Math.exp(-dt * 4.5));
    if (Math.abs(target - p) < 0.0005) p = target;
    track.style.setProperty("--p", p.toFixed(3));
    if (p >= FADED_AT !== faded) {
      faded = !faded;
      // Hidden overlay must not catch clicks or keyboard focus.
      track.toggleAttribute("data-faded", faded);
    }
    const e = smooth(p);

    if (coarse) {
      // No hover on touch screens: drift slowly on its own.
      tilt.set(Math.sin(time / 3200) * 0.6, Math.sin(time / 4100) * 0.3);
    } else {
      tilt.lerp(pointer, 0.05);
    }
    const free = 1 - e;
    camera.position.lerpVectors(startPos, endPos, e);
    camera.position.x += tilt.x * 0.35 * free;
    camera.position.y -= tilt.y * 0.18 * free;
    look.lerpVectors(START_LOOK, SCREEN.center, e);
    camera.lookAt(look);

    // The desk starts clear of the hero text (right of it on wide screens,
    // above it on portrait ones), then centres as the camera reaches the
    // monitor.
    const aspect = size.w / size.h;
    const shiftX = aspect > 1.2 ? -0.1 * size.w * free : 0;
    const shiftY = aspect < 1 ? 0.2 * size.h * free : 0;
    camera.setViewOffset(size.w, size.h, shiftX, shiftY, size.w, size.h);

    screens.forEach((s) => s.update(time));
    sky.update(time);
    renderer.render(scene, camera);

    if (!shown) {
      shown = true;
      canvas.style.opacity = "1";
      signal("ready");
    }
  };

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    size.w = Math.max(1, width);
    size.h = Math.max(1, height);
    renderer.setSize(width, height, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    layout();
    renderer.shadowMap.needsUpdate = true;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  // Only animate while the hero is on screen and the tab is visible.
  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  io.observe(track);

  let raf = 0;
  const loop = (time: number) => {
    raf = requestAnimationFrame(loop);
    if (visible && !document.hidden) render(time);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onPointer);
    track.style.removeProperty("--p");
    track.removeAttribute("data-faded");
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m?.dispose());
    });
    desk.lampLight.shadow.map?.dispose();
    screens.forEach((s) => s.texture.dispose());
    codeTex.tab.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
