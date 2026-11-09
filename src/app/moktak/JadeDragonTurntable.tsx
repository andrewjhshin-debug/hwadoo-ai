"use client";

import { useCallback, useEffect, useRef } from "react";
import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 192;
const COLUMNS = 4;
const VIEWS = 12;

type Point = { x: number; y: number };

// Gold links sit underneath the dragon and its neighbors, covering only the
// exposed part of the joint. Their endpoints follow the same bead transitions.
export function JadeDragonLinks({
  head, neighbors, transition = ".16s linear",
}: { head: Point; neighbors: readonly [Point, Point]; transition?: string }) {
  return neighbors.map((bead, side) => {
    const length = Math.hypot(bead.x - head.x, bead.y - head.y);
    const dx = (bead.y - head.y) * 0.68 / length;
    const dy = (head.x - bead.x) * 0.68 / length;
    return (
      <span
        key={side}
        aria-hidden
        data-dragon-link
        className="absolute inset-0"
        style={{
          background: "linear-gradient(145deg, #deb668, #a56d2a)",
          clipPath: `polygon(${head.x + dx}% ${head.y + dy}%, ${bead.x + dx}% ${bead.y + dy}%, ${bead.x - dx}% ${bead.y - dy}%, ${head.x - dx}% ${head.y - dy}%)`,
          transition: `clip-path ${transition}`,
        }}
      />
    );
  });
}

// Show one crisp view at a time while the same 108-step angle moves the strand.
export default function JadeDragonTurntable({ angle, duration = 160 }: { angle: number; duration?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const atlas = useRef<HTMLImageElement | null>(null);
  const shown = useRef(angle);
  const drawn = useRef(-1);

  const paint = useCallback((degrees: number) => {
    const surface = canvas.current;
    const ctx = surface?.getContext("2d");
    const sheet = atlas.current;
    if (!surface || !ctx || !sheet) return;

    const index = (((degrees % 360) + 360) % 360) * VIEWS / 360;
    const frame = Math.round(index) % VIEWS;
    if (frame !== drawn.current) {
      ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      ctx.drawImage(sheet, frame % COLUMNS * FRAME_WIDTH, Math.floor(frame / COLUMNS) * FRAME_HEIGHT,
        FRAME_WIDTH, FRAME_HEIGHT, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      drawn.current = frame;
    }
    surface.dataset.view = index.toFixed(3);
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      atlas.current = image;
      drawn.current = -1;
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
