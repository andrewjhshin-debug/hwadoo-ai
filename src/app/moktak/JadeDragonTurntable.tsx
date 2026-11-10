"use client";

import { useCallback, useEffect, useRef } from "react";
import { JADE_DRAGON } from "@/lib/practice-collection";

const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 192;
const COLUMNS = 12;
const VIEWS = 108;
// Outermost visible pixel from the center of each frame in gold-dragon-108-smooth.webp.
const HALF_WIDTH = [
  117, 116, 114, 113, 111, 110, 108, 107, 105, 103, 100, 98,
  95, 92, 90, 87, 85, 83, 80, 78, 76, 73, 70, 67,
  64, 61, 57, 54, 55, 57, 59, 60, 62, 64, 66, 68,
  70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 91, 94,
  97, 100, 103, 105, 108, 111, 114, 112, 110, 107, 105, 103,
  100, 98, 96, 93, 90, 88, 85, 82, 79, 76, 73, 70,
  67, 66, 65, 63, 62, 60, 58, 57, 55, 53, 56, 58,
  61, 63, 65, 67, 70, 72, 75, 78, 80, 82, 84, 87,
  89, 92, 95, 97, 100, 102, 104, 106, 109, 111, 113, 115,
];

export function fitJadeDragonX(x: number, width: number, angle: number) {
  const frame = Math.round(angle * VIEWS / 360);
  // Allow for the neighboring poses shown during a step transition as well.
  const extent = Math.max(...[-2, -1, 0, 1, 2].map(offset =>
    HALF_WIDTH[((frame + offset) % VIEWS + VIEWS) % VIEWS],
  ));
  // The shared ring spring can expand by up to 2.8% during a fast roll.
  const inset = width * extent / FRAME_WIDTH + 1.7;
  return Math.min(100 - inset, Math.max(inset, x));
}

type Point = { x: number; y: number };

// Gold links sit underneath the dragon and its neighbors, covering only the
// exposed part of the joint. Their endpoints follow the same bead transitions.
export function JadeDragonLinks({
  head, neighbors, transition = ".16s linear",
}: { head: Point; neighbors: readonly [Point, Point]; transition?: string }) {
  return neighbors.map((bead, side) => {
    const length = Math.hypot(bead.x - head.x, bead.y - head.y);
    const dx = (bead.y - head.y) * 0.86 / length;
    const dy = (head.x - bead.x) * 0.86 / length;
    const tipX = dx * 0.86, tipY = dy * 0.86;
    return (
      <span
        key={side}
        aria-hidden
        data-dragon-link
        className="absolute inset-0"
        style={{
          background: "linear-gradient(145deg, #e8c47c, #b78036)",
          clipPath: `polygon(${head.x + dx}% ${head.y + dy}%, ${bead.x + tipX}% ${bead.y + tipY}%, ${bead.x - tipX}% ${bead.y - tipY}%, ${head.x - dx}% ${head.y - dy}%)`,
          transition: `clip-path ${transition}`,
        }}
      />
    );
  });
}

// Each count has its own frame. Draw only the nearest view, without a crossfade.
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
