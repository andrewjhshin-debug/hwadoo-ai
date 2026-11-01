// Decorative spring only: never advances beads or changes merit/counting.
export type MalaElastic = { energy: number; displacement: number; velocity: number; lastHit: number | null; idle: number };
export const createMalaElastic = (): MalaElastic => ({ energy: 0, displacement: 0, velocity: 0, lastHit: null, idle: 0 });
export function pulseMalaElastic(state: MalaElastic, now: number) {
  const gap = state.lastHit === null ? Infinity : Math.max(0, now - state.lastHit);
  state.lastHit = now;
  state.idle = 0;
  const intensity = Math.max(0, Math.min(1, (280 - gap) / 220));
  state.energy = Math.max(state.energy, intensity);
  state.velocity = Math.max(-.75, state.velocity - .08 * intensity);
  return state.energy > .001;
}
export function stepMalaElastic(state: MalaElastic, elapsed: number) {
  const dt = Math.max(1 / 240, Math.min(1 / 30, elapsed / 1000));
  state.idle += dt;
  // Hold a clearer compression while turning; release the load quickly so the ring rebounds.
  state.energy *= Math.exp(-(state.idle > .11 ? 38 : 9.5) * dt);
  const target = -.085 * state.energy;
  state.velocity += (250 * (target - state.displacement) - 10 * state.velocity) * dt;
  state.displacement = Math.max(-.095, Math.min(.028, state.displacement + state.velocity * dt));
  const done = state.energy < .001 && Math.abs(state.displacement) < .0001 && Math.abs(state.velocity) < .002;
  if (done) { state.energy = state.displacement = state.velocity = 0; }
  return { scale: 1 + state.displacement, done };
}
