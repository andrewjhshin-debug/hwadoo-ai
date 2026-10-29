export const WALK_STRIDE = .7;
export const WALK_REWARD_STEPS = Math.ceil(100 / WALK_STRIDE);
export type WalkPoint = { lat: number; lon: number; at: number; accuracy: number };
export function walkingDay() { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }); }
export function walkDistance(a: WalkPoint, b: WalkPoint) {
  const rad = Math.PI / 180;
  const n = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(Math.min(1, n)), Math.sqrt(Math.max(0, 1 - n)));
}
/** A GPS segment containing sensor-counted steps must never count them again. */
export function createWalkingGPS() {
  let anchor: (WalkPoint & { sensor: number }) | null = null, carry = 0;
  return {
    reset() { anchor = null; carry = 0; },
    feed(p: WalkPoint, sensor: number) {
      if (![p.lat, p.lon, p.at, p.accuracy].every(Number.isFinite) || p.accuracy < 0 || p.accuracy > 65) return 0;
      if (!anchor) { anchor = { ...p, sensor }; return 0; }
      const seconds = (p.at - anchor.at) / 1000;
      if (seconds <= 0) return 0;
      if (seconds > 120) { anchor = { ...p, sensor }; carry = 0; return 0; }
      const moved = walkDistance(anchor, p);
      if (moved < Math.max(4, Math.min(24, (anchor.accuracy + p.accuracy) * .3))) return 0;
      const sensed = sensor - anchor.sensor;
      anchor = { ...p, sensor };
      if (moved / seconds < .25 || moved / seconds > 2.8 || sensed > 0) { carry = 0; return 0; }
      carry += moved;
      const steps = Math.floor(carry / WALK_STRIDE);
      carry -= steps * WALK_STRIDE;
      return steps;
    },
  };
}
