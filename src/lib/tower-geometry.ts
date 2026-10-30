import silhouettes from "./tower-shapes.json";
import type { GameStone } from "./tower-game";
type Shape = Pick<GameStone, "art" | "width" | "height" | "angle" | "bottom">;
type Envelope = { minX: number; maxX: number; top: number[]; bottom: number[] };
const cache = new Map<string, Envelope>();
/** Rasterize a rotated outline once, then reuse it while the player aims horizontally. */
export function stoneEnvelope(stone: Shape): Envelope {
  const key = [stone.art, stone.width, stone.height, stone.angle, stone.bottom].join(":");
  const saved = cache.get(key); if (saved) return saved;
  const shape = silhouettes[stone.art], angle = stone.angle * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle), pivot = stone.height * stone.bottom;
  const point = (i: number, y: number) => { const x = ((i + .5) / shape.top.length - .5) * stone.width, dy = y * stone.height - pivot; return { x: x * c - dy * s, y: pivot + x * s + dy * c }; };
  const outline = [...shape.top.map((y, i) => point(i, y)), ...shape.bottom.map((y, i) => point(i, y)).reverse()];
  const minX = Math.floor(Math.min(...outline.map(p => p.x))), maxX = Math.ceil(Math.max(...outline.map(p => p.x)));
  const top = Array(maxX - minX + 1).fill(Infinity), bottom = Array(maxX - minX + 1).fill(-Infinity);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length], dx = b.x - a.x;
    for (let x = Math.ceil(Math.min(a.x, b.x)); x <= Math.floor(Math.max(a.x, b.x)); x++) {
      const y = Math.abs(dx) < 1e-8 ? Math.min(a.y, b.y) : a.y + (b.y - a.y) * (x - a.x) / dx;
      const j = x - minX; top[j] = Math.min(top[j], y); bottom[j] = Math.max(bottom[j], y);
      if (Math.abs(dx) < 1e-8) bottom[j] = Math.max(bottom[j], a.y, b.y);
    }
  }
  const envelope = { minX, maxX, top, bottom };
  if (cache.size >= 64) cache.clear(); cache.set(key, envelope); return envelope;
}
export function surfaceAt(envelope: Envelope, x: number, side: "top" | "bottom") {
  const n = x - envelope.minX, i = Math.floor(n), t = n - i, values = envelope[side];
  if (i < 0 || i >= values.length) return null;
  const a = values[i], b = values[Math.min(values.length - 1, i + 1)];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a + (b - a) * t;
}
export function silhouetteSeat(stone: Shape & { x: number }, below: GameStone | undefined, floor: number) {
  const upper = stoneEnvelope(stone);
  if (!below) return floor - Math.max(...upper.bottom.filter(Number.isFinite));
  const lower = stoneEnvelope(below);
  const left = Math.max(stone.x + upper.minX, below.x + lower.minX), right = Math.min(stone.x + upper.maxX, below.x + lower.maxX);
  let y = Infinity;
  for (let x = left; x <= right; x += .5) {
    const a = surfaceAt(lower, x - below.x, "top"), b = surfaceAt(upper, x - stone.x, "bottom");
    if (a !== null && b !== null) y = Math.min(y, below.y + a - b);
  }
  // Tiny overlap closes antialiasing seams, not half-rock interpenetration.
  return Number.isFinite(y) ? y + 1.25 : null;
}
