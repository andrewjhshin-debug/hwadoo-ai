import { aimSway, cameraFor, contact, dropStone, paintTower, remainingStones, stability, towerHeight, type GameStone, type ReplayFrame } from "./tower-game";
export type TowerStatus = { height: number; peak: number; count: number; phase: "ready" | "busy" | "paused" };

/** Canvas animation is isolated from React. Settled world coordinates are immutable. */
export function createTowerEngine(canvas: HTMLCanvasElement, atlas: HTMLImageElement, seed: number, onChange: (state: TowerStatus) => void, onStable: (height: number) => void, onHit: (depth: number, failed: boolean) => void) {
  const ctx = canvas.getContext("2d")!;
  let stones: readonly GameStone[] = [], phase: TowerStatus["phase"] = "ready";
  let peak = 0, aim = 0, camera = 0, targetCamera = 0, start = 0, last = 0;
  let fallFrom = Infinity, direction = 1, risk = 0, mode = "", disposed = false, reduced = false;
  let raf = 0, recorded = 0;
  let activeMs = 0;
  const history: ReplayFrame[] = [];
  let highlight: ReplayFrame[] = [], bestStones: readonly GameStone[] = [];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionChange = () => { reduced = motion.matches; };
  motionChange(); motion.addEventListener("change", motionChange);
  const state = (): TowerStatus => ({ height: towerHeight(stones), peak, count: stones.length, phase });
  const emit = () => onChange(state());
  let frame: ReplayFrame = { stones, camera, fallFrom, fall: 0, direction, swing: 0, height: 0 };
  const preview = () => dropStone(stones, aim + aimSway(stones.length, activeMs, seed), seed);
  const animate = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(50, now - last); last = now;
    if (phase === "ready") activeMs += dt;
    camera += (targetCamera - camera) * Math.min(1, dt / 95);
    const elapsed = now - start;
    const drop = 0;
    let swing = 0, fall = 0;
    if (mode === "settle") {
      const t = elapsed / (reduced ? 100 : fallFrom === Infinity ? 180 : 500);
      swing = reduced ? 0 : Math.sin(t * Math.PI * 5) * Math.exp(-t * 2.7) * (1 + risk * 2.4) * direction;
      if (t >= 1) {
        if (fallFrom !== Infinity) { mode = "fall"; start = now; }
        else {
          mode = ""; phase = "ready";
          if (towerHeight(stones) >= peak) { peak = towerHeight(stones); bestStones = stones; }
          highlight = history.slice();
          onStable(peak); emit();
        }
      }
    } else if (mode === "fall") {
      fall = Math.min(1, elapsed / (reduced ? 100 : 920));
      if (fall === 1) {
        stones = remainingStones(stones, fallFrom);
        highlight = history.slice();
        mode = ""; fallFrom = Infinity; fall = 0; phase = "ready";
        targetCamera = cameraFor(stones); aim = contact(stones.at(-1)!).x; emit();
      }
    }
    frame = { stones, camera, fallFrom, fall, direction, swing, height: towerHeight(stones), drop };
    paintTower(ctx, atlas, frame, phase === "ready" ? preview() : null, drop, false);
    if (now - recorded >= 125 && phase !== "paused") {
      recorded = now; history.push({ ...frame });
      if (history.length > 64) history.shift();
    }
  };
  let hiddenAt: number | null = document.hidden ? performance.now() : null;
  const visibility = () => {
    const now = performance.now();
    if (document.hidden) hiddenAt = now;
    else if (hiddenAt !== null) { start += now - hiddenAt; hiddenAt = null; }
    last = now;
  };
  document.addEventListener("visibilitychange", visibility);
  raf = requestAnimationFrame(animate); emit();
  return {
    aim(x: number) { if (phase === "ready") aim = x; },
    nudge(dx: number) { if (phase === "ready") aim += dx; },
    drop(x = aim) {
      if (phase !== "ready") return;
      aim = x;
      const stone = dropStone(stones, x + aimSway(stones.length, activeMs, seed), seed);
      stones = [...stones, stone];
      const balance = stability(stones);
      risk = balance.risk; direction = balance.direction;
      fallFrom = balance.stable && !(stones.length > 5 && risk > .97) ? Infinity : Math.max(1, balance.joint);
      targetCamera = cameraFor(stones); phase = "busy"; mode = "settle"; start = performance.now();
      frame = { stones, camera, fallFrom, fall: 0, direction, swing: 0, height: towerHeight(stones), drop: 0 };
      paintTower(ctx, atlas, frame, null, 0, false);
      onHit(stones.length - 1, fallFrom !== Infinity); emit();
    },
    resume() { if (phase === "paused") { phase = "ready"; emit(); } },
    pause() { if (phase === "ready") { phase = "paused"; emit(); } },
    replay() { return highlight.length ? highlight.slice() : history.length ? history.slice() : [{ ...frame }]; },
    frame() { return { ...frame }; },
    record() { return { ...frame, stones: bestStones, camera: cameraFor(bestStones), height: peak, fallFrom: Infinity, fall: 0, swing: 0, drop: 0 }; },
    dispose() { disposed = true; cancelAnimationFrame(raf); motion.removeEventListener("change", motionChange); document.removeEventListener("visibilitychange", visibility); },
  };
}
export type TowerEngine = ReturnType<typeof createTowerEngine>;
