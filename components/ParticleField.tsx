"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const COUNT = 9000;
const RADIUS = 1.6;
const CAMERA_Z = 5;
const FOV = 45;

const vertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uPx;
  uniform vec2 uMouse;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vec3 p = position;

    float a = uTime * 0.07 + uMouse.x * 0.6;
    float c = cos(a);
    float s = sin(a);
    p.xz = mat2(c, -s, s, c) * p.xz;

    float b = uMouse.y * 0.35;
    float cb = cos(b);
    float sb = sin(b);
    p.yz = mat2(cb, -sb, sb, cb) * p.yz;

    p *= 1.0 + 0.035 * sin(aSeed * 40.0 + uTime * 0.6);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.1 + aSeed * 1.8) * uPx * (${CAMERA_Z.toFixed(1)} / -mv.z);
  }
`;

const fragment = /* glsl */ `
  precision mediump float;
  uniform float uAlpha;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 accent = vec3(0.486, 0.769, 1.0);
    vec3 col = mix(accent, vec3(1.0), vSeed * 0.45);
    gl_FragColor = vec4(col, soft * uAlpha * (0.3 + 0.7 * vSeed));
  }
`;

// A fixed particle sphere behind the page. It sits right of the hero text,
// then drifts, shrinks and dims as the reader scrolls.
export function ParticleField() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      return; // No WebGL: the flat ink background stays.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = "size-full";
    el.appendChild(canvas);

    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Uniform direction on a sphere, mostly on a shell with some depth.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const shell = RADIUS * (0.86 + 0.14 * Math.sqrt(Math.random()));
      positions[i * 3] = r * Math.cos(t) * shell;
      positions[i * 3 + 1] = u * shell;
      positions[i * 3 + 2] = r * Math.sin(t) * shell;
      seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPx: { value: renderer.getPixelRatio() },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uAlpha: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    const scene = new THREE.Scene();
    scene.add(points);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    camera.position.z = CAMERA_Z;

    const pointer = new THREE.Vector2(0, 0);
    const onPointer = (e: PointerEvent) => {
      pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
    };
    window.addEventListener("pointermove", onPointer);

    const render = (time: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      const s = window.scrollY / h; // scrolled screens
      const near = Math.min(1, s);
      const half = Math.tan((FOV / 2) * (Math.PI / 180)) * CAMERA_Z * aspect;

      uniforms.uTime.value = reduced ? 0 : time / 1000;
      uniforms.uMouse.value.lerp(reduced ? new THREE.Vector2() : pointer, 0.05);

      const wide = aspect > 1;
      points.position.set(
        wide ? half * 0.5 * Math.cos(s * 1.1) : 0,
        0.15 * Math.sin(s * 1.7),
        0,
      );
      points.scale.setScalar((wide ? 1 : 0.75) * (1 - 0.4 * near));
      uniforms.uAlpha.value = (wide ? 1 : 0.6) * (1 - 0.7 * Math.min(1, s * 1.2));
      renderer.render(scene, camera);
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render(performance.now());
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (!document.hidden) render(time);
    };
    const onScroll = () => render(performance.now());
    if (reduced) {
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
