"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ROOM_QUERY } from "./roomQuery";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(ROOM_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};
let webgl: boolean | null = null;
const getRoom = () => {
  if (!window.matchMedia(ROOM_QUERY).matches) return false;
  webgl ??= hasWebGL();
  return webgl;
};
// The server (and search engines) always get the classic page.
const getServer = () => false;

/**
 * Desktop with a mouse, motion allowed and WebGL: the 3D room. Everything
 * else (phones, tablets, reduced motion, no WebGL): the classic page.
 */
export function HomeSwitch({
  room,
  classic,
}: {
  room: React.ReactNode;
  classic: React.ReactNode;
}) {
  const useRoom = useSyncExternalStore(subscribe, getRoom, getServer);
  // Show the classic page if it ends up being the one used here.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-room", useRoom);
  }, [useRoom]);
  return <div data-home={useRoom ? "room" : "classic"}>{useRoom ? room : classic}</div>;
}
