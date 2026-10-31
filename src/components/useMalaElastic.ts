"use client";
import { useCallback, useEffect, useRef } from "react";
import { createMalaElastic, pulseMalaElastic, stepMalaElastic } from "@/lib/mala-elastic";

export default function useMalaElastic(enabled: boolean) {
  const normalRef = useRef<HTMLDivElement>(null), expandedRef = useRef<HTMLDivElement>(null);
  const model = useRef(createMalaElastic()), frame = useRef<number | null>(null), lastFrame = useRef(0), reduced = useRef(false);
  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null; lastFrame.current = 0; model.current = createMalaElastic();
    for (const el of [normalRef.current, expandedRef.current]) if (el) { el.style.transform = ""; el.style.willChange = ""; }
  }, []);
  const tick = useCallback(function tick(now: number) {
    const value = stepMalaElastic(model.current, lastFrame.current ? now - lastFrame.current : 16);
    lastFrame.current = now;
    for (const el of [normalRef.current, expandedRef.current]) if (el) {
      el.style.transform = value.done ? "" : `scale(${value.scale.toFixed(4)})`;
      el.style.transformOrigin = "50% 50%";
      el.style.willChange = value.done ? "" : "transform";
    }
    if (value.done) { frame.current = null; lastFrame.current = 0; }
    else frame.current = requestAnimationFrame(tick);
  }, []);
  const pulse = useCallback(() => {
    if (!enabled || reduced.current || document.hidden) return;
    if (pulseMalaElastic(model.current, performance.now()) && frame.current === null) frame.current = requestAnimationFrame(tick);
  }, [enabled, tick]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => { reduced.current = media.matches; if (media.matches) stop(); };
    const visibility = () => { if (document.hidden) stop(); };
    motion(); if (!enabled) stop();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => { stop(); media.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, stop]);
  return { normalRef, expandedRef, pulse };
}
