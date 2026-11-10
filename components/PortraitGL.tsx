"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const ASPECT = 1276 / 2048;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Shows the photo in its real colours; the image ripples outward from the
// pointer in proportion to pointer speed.
const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uMouse;
  uniform float uStrength;
  uniform float uTime;

  void main() {
    vec2 d = vUv - uMouse;
    d.x *= ${ASPECT.toFixed(5)};
    float dist = length(d);
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);

    float falloff = smoothstep(0.4, 0.0, dist);
    vec2 offset = dir * sin(dist * 42.0 - uTime * 5.0) * 0.014 * uStrength * falloff;
    offset.x /= ${ASPECT.toFixed(5)};

    vec3 color = texture2D(uTex, vUv + offset).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function PortraitGL({ src, alt }: { src: string; alt: string }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    } catch {
      return; // WebGL unavailable: the plain <img> stays visible.
    }

    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "absolute inset-0 size-full opacity-0 transition-opacity duration-500";
    el.appendChild(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uMouse: { value: new THREE.Vector2(0.5, 0.74) },
      uStrength: { value: 0 },
      uTime: { value: 0 },
    };
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const target = new THREE.Vector2(0.5, 0.74);
    let raf = 0;
    let running = false;
    let disposed = false;

    const draw = (time: number) => {
      uniforms.uTime.value = time / 1000;
      const prev = uniforms.uMouse.value.clone();
      uniforms.uMouse.value.lerp(target, 0.12);
      const moved = prev.distanceTo(uniforms.uMouse.value);
      uniforms.uStrength.value = reduced
        ? 0
        : Math.min(1, uniforms.uStrength.value * 0.92 + moved * 14);
      renderer.render(scene, camera);

      const settled = moved < 0.0003 && uniforms.uStrength.value < 0.01;
      if (settled || disposed) {
        running = false;
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    const start = () => {
      if (running || disposed) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      target.set(
        (e.clientX - box.left) / box.width,
        1 - (e.clientY - box.top) / box.height,
      );
      start();
    };
    el.addEventListener("pointermove", onMove);

    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    new THREE.TextureLoader().load(src, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.minFilter = THREE.LinearFilter;
      uniforms.uTex.value = texture;
      resize();
      canvas.style.opacity = "1";
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener("pointermove", onMove);
      uniforms.uTex.value?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [src]);

  return (
    <div
      ref={wrap}
      className="relative w-full touch-pan-y overflow-hidden rounded-2xl bg-panel"
      style={{ aspectRatio: `${1276} / ${2048}` }}
    >
      {/* Visible until the WebGL canvas takes over, and the no-WebGL fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}
