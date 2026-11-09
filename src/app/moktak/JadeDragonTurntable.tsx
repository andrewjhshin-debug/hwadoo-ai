"use client";

import { useCallback, useEffect, useRef } from "react";
import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 192;
const COLUMNS = 4;
const VIEWS = 12;

// Blend the two nearest views while the same 108-step angle moves the strand.
export default function JadeDragonTurntable({ angle, duration = 160 }: { angle: number; duration?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const atlas = useRef<HTMLImageElement | null>(null);
  const shown = useRef(angle);

  const paint = useCallback((degrees: number) => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    const sheet = atlas.current;
    if (!surface || !ctx || !sheet) return;

    const index = (((degrees % 360) + 360) % 360) * VIEWS / 360;
    const lower = Math.floor(index);
    const mix = index - lower;
    const draw = (frame: number, opacity: number) => {
      ctx.globalAlpha = opacity;
      ctx.drawImage(sheet, frame % COLUMNS * FRAME_WIDTH, Math.floor(frame / COLUMNS) * FRAME_HEIGHT,
        FRAME_WIDTH, FRAME_HEIGHT, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    };
    ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.globalCompositeOperation = "source-over";
    draw(lower, 1 - mix);
    if (mix > 0) {
      ctx.globalCompositeOperation = "lighter";
      draw((lower + 1) % VIEWS, mix);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    surface.dataset.view = index.toFixed(3);
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      atlas.current = image;
      paint(shown.current);
    };
    image.src = JADE_DRAGON.turntable;
    return () => { image.onload = null; atlas.current = null; };
  }, [paint]);

  useEffect(() => {
    const from = shown.current;
    const delta = angle - from;
    if (Math.abs(delta) > 90 || delta === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = angle;
      paint(angle);
      return;
    }
    const start = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      shown.current = from + delta * progress;
      paint(shown.current);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [angle, duration, paint]);

  return <canvas ref={canvas} width={FRAME_WIDTH} height={FRAME_HEIGHT} className="block h-auto w-full" aria-hidden />;
}
