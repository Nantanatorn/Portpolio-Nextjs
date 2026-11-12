import * as THREE from "three";
import { LAPTOP, PORTRAIT, SCREEN, SKY_REGION, buildDesk } from "./buildDesk";
import { createNebula } from "./nebula";
import {
  ABOUT_WALL,
  BOARD,
  HOLO,
  SHELF,
  buildRoomProps,
  type AboutInfo,
  type ContactCard,
  type Article,
  type Card,
  type SkillGroup,
} from "./roomProps";
import { createScreenTexture, type ContactOutput, type ScreenText } from "./screenTexture";
import { createMediumTexture } from "./mediumPage";
import { createCodeTexture, createLogTexture } from "./sideScreens";
import { signal } from "./signals";
import { createSky } from "./sky";

// Scroll-driven tour of the room: wide shot of the desk → photo and diploma
// on the back wall (about) → cork board → past
// the hologram to the bookshelf → back to the monitors (projects) → notebook
// on the desk (writing) → out of the window (contact).
//
// Smoothness: the page scroll is turned into one continuous tour value
// (one unit per stage) and the camera eases towards it, so wheel
// steps don't make it jump and stage changes have no seams.
// Cost: shadows are drawn once (the room is static), the code screen scrolls
// by texture offset, pixel ratio is capped and drops if frames run slow.

const FOV = 40;
/** Share of a stage spent moving the camera; the panel follows. */
const MOVE = 0.4;
/** How quickly the camera catches up with the scroll (per second). */
const FOLLOW = 4.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

interface View {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** Horizontal view shift in viewport widths (+ moves the scene left). */
  shift: number;
}

export interface RoomData {
  screen: ScreenText;
  cards: Card[];
  groups: SkillGroup[];
  projects: { name: string; image: string }[];
  article?: Article;
  about?: AboutInfo;
  contact?: { card: ContactCard; terminal: ContactOutput; cv: string; prompt: string; key: string };
}

/** Window event the projects panel sends to show a project on the monitor. */
export const PICK_PROJECT = "room:project";

/** `stages`: hero, about, work, stack, projects, writing, contact, in page order. */
export function mountRoom(
  host: HTMLElement,
  stages: HTMLElement[],
  data: RoomData,
): (() => void) | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  // Pixel ratio steps down if frames run slow (see `adapt`).
  const ratios = [1.5, 1.25, 1].filter((r) => r <= Math.max(1, window.devicePixelRatio));
  let ratioIndex = 0;
  renderer.setPixelRatio(ratios[0]);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // static room: draw shadows once
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-700";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const main = createScreenTexture(data.screen, data.contact?.terminal);
  const code = createCodeTexture(PORTRAIT.width, PORTRAIT.height);
  const logs = createLogTexture(LAPTOP.width, LAPTOP.height);
  const screens = [main, code, logs];
  const desk = buildDesk({ main: main.texture, code: code.texture, codeTab: code.tab, logs: logs.texture });
  scene.background = new THREE.Color(desk.skyColor);
  scene.add(desk.group);

  const props = buildRoomProps(data.cards, data.groups, data.about, data.contact?.card);
  scene.add(props.group);

  // The chosen project's screenshot, laid over the main monitor during the
  // projects stage. Projects without one leave the name screen showing.
  const loader = new THREE.TextureLoader();
  const shots = data.projects.map((p) => {
    if (!p.image) return null;
    const t = loader.load(p.image);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  // Writing: a Medium article page laid over the laptop screen.
  const medium = data.article ? createMediumTexture(LAPTOP.width, LAPTOP.height, data.article) : null;
  const pageMat = new THREE.MeshBasicMaterial({
    map: medium?.texture ?? null,
    transparent: true,
    opacity: 0,
    toneMapped: false,
  });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(LAPTOP.width, LAPTOP.height), pageMat);
  page.position.set(0, desk.laptop.screenY, 0.0065);
  page.visible = false;
  desk.laptop.lid.add(page);
  // Where the laptop screen is, and which way it faces, in the room.
  desk.group.updateMatrixWorld(true);
  const laptopCenter = desk.laptop.lid.localToWorld(v3(0, desk.laptop.screenY, 0));
  const laptopFacing = v3(0, 0, 1).transformDirection(desk.laptop.lid.matrixWorld);

  let picked = 0;
  const onPick = (e: Event) => {
    picked = (e as CustomEvent<number>).detail ?? 0;
  };
  window.addEventListener(PICK_PROJECT, onPick);
  const slideMat = new THREE.MeshBasicMaterial({
    map: shots[0] ?? null,
    transparent: true,
    opacity: 0,
    toneMapped: false,
  });
  const slide = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.width, SCREEN.height), slideMat);
  slide.position.copy(SCREEN.center).add(v3(0, 0, 0.002));
  slide.visible = false;
  scene.add(slide);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sky = createSky({ count: 420, ...SKY_REGION, pixelRatio: ratios[0], meteors: !reduced });
  scene.add(sky.group);

  // Hologram: the morphing particle cloud, shrunk onto the projector.
  const holo = createNebula({ count: 4000, pixelRatio: ratios[0], cameraZ: 1.6 });
  const holder = new THREE.Group();
  holder.position.copy(HOLO);
  holder.scale.setScalar(0.11);
  holder.add(holo.group);
  scene.add(holder);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);
  const size = { w: 1, h: 1 };

  // Viewpoints along the tour.
  const views = {
    start: { pos: v3(0, 1.65, 2.75), look: v3(0, 1.1, -0.2), shift: -0.1 },
    near: { pos: v3(0, 1.55, 2.35), look: v3(0, 1.12, -0.2), shift: -0.1 },
    aboutVia: { pos: v3(-0.2, 1.7, 2.6), look: v3(-0.9, 1.4, -0.3), shift: 0 },
    about: { pos: v3(-1.05, 1.64, 1.55), look: ABOUT_WALL.clone().add(v3(0.05, -0.06, 0)), shift: 0.2 },
    back: { pos: v3(1.4, 1.8, 3.0), look: v3(-1.1, 1.3, 0.9), shift: 0 },
    board: { pos: v3(1.15, 1.55, 2.35), look: BOARD.center.clone().add(v3(0, -0.02, 0.15)), shift: 0.14 },
    middle: { pos: v3(0, 1.62, 3.2), look: HOLO.clone(), shift: 0 },
    shelf: { pos: v3(0.15, 1.35, 2.25), look: SHELF.center.clone().add(v3(0, -0.05, 0.1)), shift: -0.2 },
    turn: { pos: v3(1.0, 1.6, 2.6), look: v3(0.4, 1.25, 0.4), shift: 0 },
    projects: { pos: v3(0.05, 1.42, 1.25), look: SCREEN.center.clone().add(v3(0, -0.04, 0)), shift: 0.17 },
    lean: {
      pos: laptopCenter.clone().addScaledVector(laptopFacing, 1.1).add(v3(0.25, 0.25, 0)),
      look: laptopCenter.clone(),
      shift: 0,
    },
    writing: {
      pos: laptopCenter.clone().addScaledVector(laptopFacing, 0.62).add(v3(0, 0.03, 0)),
      look: laptopCenter.clone(),
      shift: -0.17,
    },
    rise: { pos: v3(0.3, 1.7, 2.1), look: v3(0.3, 1.2, -0.2), shift: 0 },
    // Monitor on the left of the frame, printer on the right; panel left.
    contact: { pos: v3(1.1, 1.78, 2.75), look: v3(0.8, 1.0, 0.0), shift: -0.22 },
  } satisfies Record<string, View>;

  // Wide shots need more distance on narrow screens.
  const layout = () => {
    const pull = camera.aspect < 1.2 ? (1.2 - camera.aspect) * 2.2 : 0;
    views.start.pos.set(0, 1.65 + pull * 0.2, 2.75 + pull);
    views.near.pos.set(0, 1.55 + pull * 0.2, 2.35 + pull);
  };

  // Three-point legs, built once (positions are live Vector3s, so `layout`
  // changes flow through; CatmullRom reads them on every getPoint).
  const leg = (a: View, via: View, b: View) => ({
    a,
    via,
    b,
    pos: new THREE.CatmullRomCurve3([a.pos, via.pos, b.pos]),
    look: new THREE.CatmullRomCurve3([a.look, via.look, b.look]),
  });
  // Leg i takes the camera into stage i + 1.
  const legs = [
    leg(views.near, views.aboutVia, views.about),
    leg(views.about, views.back, views.board),
    leg(views.board, views.middle, views.shelf),
    leg(views.shelf, views.turn, views.projects),
    leg(views.projects, views.lean, views.writing),
    leg(views.writing, views.rise, views.contact),
  ];

  const cur: View = { pos: v3(0, 0, 0), look: v3(0, 0, 0), shift: 0 };
  function place(l: ReturnType<typeof leg>, t: number) {
    l.pos.getPoint(t, cur.pos);
    l.look.getPoint(t, cur.look);
    cur.shift =
      t < 0.5
        ? l.a.shift + (l.via.shift - l.a.shift) * t * 2
        : l.via.shift + (l.b.shift - l.via.shift) * (t - 0.5) * 2;
  }

  const stageList = stages;
  const progress = (el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    const run = box.height - window.innerHeight;
    return run > 0 ? clamp01(-box.top / run) : box.top <= 0 ? 1 : 0;
  };
  // One unit per stage: 0–1 desk, 1–2 board, 2–3 shelf, …
  const rawTour = () => stageList.reduce((sum, el) => sum + progress(el), 0);
  let tour = rawTour();

  const pointer = new THREE.Vector2();
  const tilt = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-9, -9);
  let overCv = false;
  let inContact = false;
  const hitCv = () => {
    const paper = props.contact?.paper;
    if (!inContact || !paper || !paper.visible) return false;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(paper, false).length > 0;
  };
  const isUi = (t: EventTarget | null) =>
    !!(t as Element | null)?.closest?.("a, button, input, [role='button'], header, nav, .pointer-events-auto");
  const onMove = (e: PointerEvent) => {
    ndc.set((e.clientX / size.w) * 2 - 1, -(e.clientY / size.h) * 2 + 1);
    const over = !isUi(e.target) && hitCv();
    if (over !== overCv) {
      overCv = over;
      // The custom cursor grows its ring while this is set.
      document.documentElement.toggleAttribute("data-cursor-hover", over);
    }
  };
  // Clicking the printed CV picks it up: the page shows it as a note (see
  // CvViewer), starting from where the paper is on screen.
  let viewing = false;
  const pickUp = (x: number, y: number) => {
    viewing = true;
    overCv = false;
    document.documentElement.removeAttribute("data-cursor-hover");
    window.dispatchEvent(new CustomEvent("room:cv-open", { detail: { x, y } }));
  };
  const onClick = (e: MouseEvent) => {
    if (!data.contact || viewing || isUi(e.target)) return;
    ndc.set((e.clientX / size.w) * 2 - 1, -(e.clientY / size.h) * 2 + 1);
    if (hitCv()) pickUp(e.clientX, e.clientY);
  };
  const onClosed = () => {
    viewing = false;
  };
  window.addEventListener("room:cv-closed", onClosed);

  // Game-style interaction prompt floating over the printed CV. A real
  // button, so keyboard users can open the CV too.
  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.className =
    "cv-prompt pointer-events-auto fixed left-0 top-0 z-10 flex items-center gap-2 whitespace-nowrap rounded-full border border-accent/50 bg-ink/80 py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-paper opacity-0 shadow-lg backdrop-blur transition-opacity duration-300 hover:border-accent hover:text-accent";
  prompt.innerHTML =
    '<span class="relative flex size-2.5"><span class="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75"></span><span class="relative inline-flex size-2.5 rounded-full bg-accent"></span></span>' +
    '<kbd class="rounded border border-line bg-panel px-1.5 py-px font-mono text-[11px] text-mist"></kbd><span data-label></span>';
  prompt.querySelector("kbd")!.textContent = data.contact?.key ?? "";
  prompt.querySelector("[data-label]")!.textContent = data.contact?.prompt ?? "";
  prompt.tabIndex = -1;
  prompt.style.visibility = "hidden";
  prompt.addEventListener("click", () => {
    const box = prompt.getBoundingClientRect();
    pickUp(box.left + box.width / 2, box.bottom + 40);
  });
  if (data.contact) document.body.appendChild(prompt);
  const promptAt = v3(0, 0, 0);
  let promptShown = false;
  window.addEventListener("pointermove", onMove);
  window.addEventListener("click", onClick);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener("pointermove", onPointer);

  // Frame-time watch: if frames average over ~22ms for a while, lower the
  // pixel ratio one step (at most twice).
  let slowFor = 0;
  function adapt(dt: number) {
    if (ratioIndex >= ratios.length - 1) return;
    slowFor = dt > 0.022 ? slowFor + dt : Math.max(0, slowFor - dt * 0.5);
    if (slowFor > 1.5) {
      slowFor = 0;
      ratioIndex++;
      renderer.setPixelRatio(ratios[ratioIndex]);
      renderer.setSize(size.w, size.h, false);
    }
  }

  let shown = false;
  let last = -1;
  const render = (time: number) => {
    const dt = last < 0 ? 0 : Math.min(0.1, (time - last) / 1000);
    last = time;

    tour = reduced ? rawTour() : tour + (rawTour() - tour) * (1 - Math.exp(-dt * FOLLOW));
    if (Math.abs(rawTour() - tour) < 0.0005) tour = rawTour();

    // Panels follow the eased value too, so text and camera stay in step.
    stageList.forEach((el, i) => {
      const q = clamp01(tour - i);
      el.style.setProperty("--q", q.toFixed(3));
      // The last panel stays up at the end of the page.
      const last = i === stageList.length - 1;
      el.toggleAttribute("data-on", q > MOVE - 0.05 && (q < 0.999 || last));
    });

    // Hologram shape per stage: hero and about share the sphere, then ring,
    // wall, planet, galaxy, dust.
    const stage = Math.min(legs.length, Math.floor(tour));
    if (stage === 0) {
      const e = smooth(tour);
      cur.pos.lerpVectors(views.start.pos, views.near.pos, e);
      cur.look.lerpVectors(views.start.look, views.near.look, e);
      cur.shift = views.start.shift;
    } else {
      place(legs[stage - 1], smooth(clamp01((tour - stage) / MOVE)));
    }
    const shape = Math.max(0, stage - 1);

    // Projects: show the picked project's screenshot. Switching fades the
    // old one out first, swaps, then fades the new one in.
    const want = shots[picked] ?? null;
    const inStage = stage === 4 ? clamp01((tour - 4 - 0.25) * 6) : 0;
    const target = want && slideMat.map === want ? inStage : 0;
    slideMat.opacity += (target - slideMat.opacity) * (1 - Math.exp(-dt * 9));
    if (slideMat.opacity < 0.02 && want && slideMat.map !== want) {
      slideMat.map = want;
      slideMat.needsUpdate = true;
    }
    slide.visible = slideMat.opacity > 0.01;

    // Writing: bring up the Medium page on the laptop.
    const pageOn = stage === 5 && medium ? clamp01((tour - 5 - 0.2) * 6) : 0;
    pageMat.opacity += (pageOn - pageMat.opacity) * (1 - Math.exp(-dt * 6));
    page.visible = pageMat.opacity > 0.01;

    if (!reduced) tilt.lerp(pointer, 1 - Math.exp(-dt * 3));
    camera.position.copy(cur.pos);
    camera.position.x += tilt.x * 0.12;
    camera.position.y -= tilt.y * 0.06;
    camera.lookAt(cur.look);
    camera.setViewOffset(size.w, size.h, cur.shift * size.w, 0, size.w, size.h);

    holo.show(shape);
    holo.update(reduced ? 0 : time, dt, reduced);
    screens.forEach((s) => s.update(time));
    sky.update(reduced ? 0 : time);
    props.update(dt);
    // Contact: type the contact command on the monitor, print the CV.
    inContact = stage === 6 && tour - 6 > MOVE * 0.6;
    main.setContact(inContact);
    props.contact?.update(dt, inContact, overCv, viewing);

    // Keep the prompt just above the paper while it is out on the tray.
    const paper = props.contact?.paper;
    const showPrompt = !!paper && inContact && !viewing && tour - 6 > MOVE;
    if (paper && showPrompt) {
      paper.getWorldPosition(promptAt);
      promptAt.y += 0.16;
      promptAt.project(camera);
      const x = (promptAt.x * 0.5 + 0.5) * size.w;
      const y = (-promptAt.y * 0.5 + 0.5) * size.h;
      prompt.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    if (showPrompt !== promptShown) {
      promptShown = showPrompt;
      prompt.style.opacity = showPrompt ? "1" : "0";
      prompt.style.visibility = showPrompt ? "visible" : "hidden";
      prompt.tabIndex = showPrompt ? 0 : -1;
    }
    renderer.render(scene, camera);
    adapt(dt);

    if (!shown) {
      shown = true;
      canvas.style.opacity = "1";
      signal("ready");
    }
  };

  const resize = () => {
    size.w = Math.max(1, window.innerWidth);
    size.h = Math.max(1, window.innerHeight);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    layout();
    renderer.shadowMap.needsUpdate = true;
  };
  resize();
  window.addEventListener("resize", resize);

  let raf = 0;
  const loop = (time: number) => {
    raf = requestAnimationFrame(loop);
    if (!document.hidden) render(time);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("click", onClick);
    window.removeEventListener("room:cv-closed", onClosed);
    prompt.remove();
    document.documentElement.removeAttribute("data-cursor-hover");
    props.dispose();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        (m as THREE.MeshStandardMaterial | undefined)?.map?.dispose();
        m?.dispose();
      });
    });
    screens.forEach((s) => s.texture.dispose());
    shots.forEach((t) => t?.dispose());
    medium?.dispose();
    window.removeEventListener(PICK_PROJECT, onPick);
    code.tab.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
