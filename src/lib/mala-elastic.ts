// Decorative spring only: never advances beads or changes merit/counting.
export type MalaElastic = { energy: number; displacement: number; velocity: number; lastHit: number | null };
export const createMalaElastic = (): MalaElastic => ({ energy: 0, displacement: 0, velocity: 0, lastHit: null });
export function pulseMalaElastic(state: MalaElastic, now: number) {
  const gap = state.lastHit === null ? Infinity : Math.max(0, now - state.lastHit);
  state.lastHit = now;
  state.energy = Math.max(state.energy, Math.max(0, Math.min(1, (280 - gap) / 220)));
  return state.energy > .001;
}
export function stepMalaElastic(state: MalaElastic, elapsed: number) {
  const dt = Math.max(1 / 240, Math.min(1 / 30, elapsed / 1000));
  state.energy *= Math.exp(-11 * dt);
  const target = -.045 * state.energy;
  state.velocity += (230 * (target - state.displacement) - 12 * state.velocity) * dt;
  state.displacement = Math.max(-.055, Math.min(.018, state.displacement + state.velocity * dt));
  const done = state.energy < .001 && Math.abs(state.displacement) < .0001 && Math.abs(state.velocity) < .002;
  if (done) { state.energy = state.displacement = state.velocity = 0; }
  return { scale: 1 + state.displacement, done };
}
