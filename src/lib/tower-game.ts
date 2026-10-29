import { TOWER_STONES } from "./tower-balance";

export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 520;
export const FLOOR = 484;
export const PX_PER_CM = 12;
export type GameStone = { depth: number; art: number; x: number; y: number; width: number; height: number; angle: number; support: number; offset: number; massOffset: number; top: number; bottom: number };
export type Stability = { stable: boolean; risk: number; joint: number; direction: number };
export type ReplayFrame = { stones: readonly GameStone[]; camera: number; fallFrom: number; fall: number; direction: number; swing: number; height: number; drop?: number };

function random(seed: number) {
  let x = seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
export function seedOf(text: string) {
  let hash = 2166136261;
  for (const ch of text.slice(0, 32)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return hash >>> 0;
}
/** Visible timing challenge, never a hidden random landing penalty. */
export function aimSway(depth: number, activeMs: number, seed: number) {
  if (depth < 3) return 0;
  const level = Math.min(1, (depth - 2) / 14);
  const phase = activeMs / 1000 * (1.7 + level * 1.3) + random(seed ^ depth) * Math.PI * 2;
  return Math.sin(phase) * (7 + level * 17) + Math.sin(phase * 1.73) * level * 4;
}
export function stoneSpec(depth: number, seed: number): Omit<GameStone, "x" | "y"> {
  const r = random(seed ^ Math.imul(depth + 1, 2654435761));
  const art = depth === 0 ? 0 : depth < 3 ? [1, 2][depth - 1] : 1 + Math.floor(r * 8);
  const source = TOWER_STONES[art];
  const width = depth === 0 ? 210 : depth < 3 ? 180 - depth * 12 : 110 + Math.round(random(seed ^ (depth + 71) * 829) * 48);
  return { depth, art, width, height: source.crop[3] / source.crop[2] * width,
    angle: depth === 0 ? 0 : depth < 3 ? source.tilt * .4 : source.tilt * .65 + (r - .5) * 5,
    support: depth < 3 ? .34 : Math.max(.135, source.support + .02 - Math.min(.055, (depth - 3) * .004)),
    offset: source.offset * .65, massOffset: source.massOffset,
    top: source.top, bottom: source.bottom };
}
export function clampAim(spec: Pick<GameStone, "width">, x: number) {
  const edge = (GAME_WIDTH - spec.width) / 2 - 7;
  return Math.max(-edge, Math.min(edge, Number.isFinite(x) ? x : 0));
}
export function contact(stone: GameStone) {
  const angle = stone.angle * Math.PI / 180;
  const dx = stone.width * stone.offset, dy = stone.height * (stone.top - stone.bottom);
  return { x: stone.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: stone.y + stone.height * stone.bottom + dx * Math.sin(angle) + dy * Math.cos(angle),
    half: stone.width * stone.support, slope: Math.tan(angle) };
}
export function dropStone(stones: readonly GameStone[], x: number, seed: number): GameStone {
  const spec = stoneSpec(stones.length, seed), below = stones.at(-1);
  const at = below ? contact(below) : null;
  const bounded = clampAim(spec, x);
  const floor = at ? at.y + (bounded - at.x) * at.slope : FLOOR;
  // v4 silhouettes have real contact pixels; do not bury a slab halfway into a wedge.
  const overlap = below ? 2 : 0;
  return { ...spec, x: bounded, y: floor - spec.height * spec.bottom + overlap };
}

/** Suffix mass moments: linear work rather than quadratic work as the tower grows. */
export function stability(stones: readonly GameStone[]): Stability {
  let result: Stability = { stable: true, risk: 0, joint: 0, direction: 1 };
  let weight = 0, moment = 0;
  for (let i = stones.length - 1; i >= 1; i--) {
    const s = stones[i], a = s.angle * Math.PI / 180;
    const mass = s.width * s.height;
    const center = s.x + s.massOffset * s.width * Math.cos(a) - s.height * (.5 - s.bottom) * Math.sin(a);
    weight += mass; moment += center * mass;
    const below = contact(stones[i - 1]);
    const delta = moment / weight - below.x;
    const half = Math.max(9, below.half - 2);
    const risk = Math.max(Math.abs(delta) / half, Math.abs(s.x - below.x) / (half + s.width * .23));
    if (risk > result.risk) result = { stable: risk <= 1, risk, joint: i, direction: delta < 0 ? -1 : 1 };
  }
  return result;
}
export function towerHeight(stones: readonly GameStone[]) {
  return stones.length ? Math.max(0, (FLOOR - stones.reduce((top, s) => Math.min(top, s.y + s.height * s.top), FLOOR)) / PX_PER_CM) : 0;
}
export function cameraFor(stones: readonly GameStone[]) {
  return stones.length ? Math.max(0, 140 - stones.reduce((top, s) => Math.min(top, s.y), FLOOR)) : 0;
}
export function remainingStones(stones: readonly GameStone[], joint: number) {
  return stones.slice(0, Math.max(1, joint));
}
export function rewardTier(height: number) { return Math.max(0, Math.floor(height / 10)); }

export function paintTower(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, frame: ReplayFrame, preview?: GameStone | null, drop = frame.drop ?? 0) {
  const width = ctx.canvas.width, height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfaf8"; ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
  ctx.save(); ctx.translate(width / 2, height - GAME_HEIGHT * scale); ctx.scale(scale, scale);
  ctx.fillStyle = "#77786f"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
  const startCm = Math.max(0, Math.floor((frame.camera - 20) / PX_PER_CM / 10) * 10);
  for (let cm = startCm; cm < startCm + 60; cm += 5) {
    const y = FLOOR - cm * PX_PER_CM + frame.camera;
    if (y < 40 || y > GAME_HEIGHT) continue;
    ctx.strokeStyle = "#d7d7cf"; ctx.beginPath(); ctx.moveTo(166, y); ctx.lineTo(173, y); ctx.stroke();
    if (cm % 10 === 0) ctx.fillText(String(cm), 160, y + 4);
  }
  if (frame.camera < 40) {
    ctx.fillStyle = "#d9d8d0"; ctx.beginPath(); ctx.ellipse(0, FLOOR + frame.camera + 4, 106, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  const draw = (stone: GameStone, ghost: boolean, offset: number) => {
    const falling = !ghost && stone.depth >= frame.fallFrom;
    const t = falling ? frame.fall : 0;
    const y = stone.y + frame.camera + offset + t * t * 230;
    if (y > GAME_HEIGHT + stone.height || y < -stone.height * 2) return;
    const [sx, sy, sw, sh] = TOWER_STONES[stone.art].crop;
    ctx.save(); ctx.globalAlpha = ghost ? .64 : Math.max(0, 1 - t * .85);
    ctx.translate(stone.x + (falling ? t * 135 * frame.direction : frame.swing * Math.min(1, stone.depth / 5)), y + stone.height * stone.bottom);
    ctx.rotate((stone.angle + (falling ? t * 74 * frame.direction : stone.depth > 0 ? frame.swing * .7 : 0)) * Math.PI / 180);
    ctx.drawImage(atlas, sx, sy, sw, sh, -stone.width / 2, -stone.height * stone.bottom, stone.width, stone.height);
    ctx.restore();
  };
  for (const stone of frame.stones) draw(stone, false, stone.depth === frame.stones.length - 1 ? drop : 0);
  if (preview) draw(preview, true, 0);
  ctx.restore();
}
