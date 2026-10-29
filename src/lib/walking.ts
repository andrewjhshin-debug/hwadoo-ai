import { createStepDetector, type StepDetector } from "./stepDetect";
import { addMerit } from "./merit";
import { createWalkingGPS, walkingDay, WALK_REWARD_STEPS, WALK_STRIDE } from "./walking-core";
type MotionState = "off" | "waiting" | "live" | "denied" | "silent" | "unavailable";
export type WalkingState = { on: boolean; starting: boolean; steps: number; meters: number; level: number; motion: MotionState; gps: "off" | "waiting" | "live" | "denied"; notice: string; hidden: boolean; estimated: number };
export const WALKING_EMPTY: WalkingState = { on: false, starting: false, steps: 0, meters: 0, level: 0, motion: "off", gps: "off", notice: "", hidden: false, estimated: 0 };
let state = WALKING_EMPTY;
const listeners = new Set<() => void>();
let initialized = false, day = "", generation = 0, sensorSteps = 0, seenAt = 0, levelAt = 0;
let detector: StepDetector | null = null, watch: number | null = null, timer: number | null = null;
let wake: WakeLockSentinel | null = null, wakePending = false;
const gps = createWalkingGPS(), KEY = "hwadu.walking.on";
function update(patch: Partial<WalkingState>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
function saved(key: string) { try { const n = Number(localStorage.getItem(key)); return Number.isFinite(n) ? Math.max(0, Math.min(200000, n)) : 0; } catch { return 0; } }
function store(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Session counting still works. */ } }
function rollDay() {
  const next = walkingDay(); if (day === next) return;
  day = next; sensorSteps = 0; gps.reset(); detector?.reset();
  update({ steps: Math.floor(saved(`hwadu.walking.steps.${day}`)), meters: saved(`hwadu.walking.meters.${day}`), estimated: Math.floor(saved(`hwadu.walking.estimated.${day}`)) });
}
function count(amount: number, estimated = false) {
  rollDay(); if (!state.on || !Number.isInteger(amount) || amount <= 0 || amount > 500) return;
  const previous = state.steps, steps = previous + amount, meters = state.meters + amount * WALK_STRIDE;
  const units = Math.floor(steps / WALK_REWARD_STEPS) - Math.floor(previous / WALK_REWARD_STEPS);
  const guesses = state.estimated + (estimated ? amount : 0);
  store(`hwadu.walking.steps.${day}`, String(steps)); store(`hwadu.walking.meters.${day}`, String(meters)); store(`hwadu.walking.estimated.${day}`, String(guesses));
  update({ steps, meters, estimated: guesses }); if (units > 0) addMerit("walking", units, units);
}
async function keepAwake() {
  if (!state.on || document.hidden || wakePending || wake && !wake.released || !navigator.wakeLock) return;
  const token = generation; wakePending = true;
  try { const next = await navigator.wakeLock.request("screen"); if (token !== generation || !state.on || document.hidden) await next.release(); else wake = next; }
  catch { /* Browser may refuse due to battery policy. */ }
  finally { wakePending = false; if (token !== generation && state.on) void keepAwake(); }
}
function visibility() {
  gps.reset(); detector?.reset(); update({ hidden: document.hidden, level: 0 });
  if (!document.hidden && state.on) { seenAt = Date.now(); update({ motion: state.motion === "live" ? "waiting" : state.motion }); void keepAwake(); }
}
function motion(event: DeviceMotionEvent) {
  if (!state.on || document.hidden || !detector) return;
  rollDay(); const a = event.accelerationIncludingGravity;
  if (!a || typeof a.x !== "number" || typeof a.y !== "number" || typeof a.z !== "number" || ![a.x, a.y, a.z].every(Number.isFinite)) return;
  seenAt = Date.now(); if (state.motion !== "live") update({ motion: "live" });
  detector.feed(a.x, a.y, a.z, performance.now());
}
export function initWalking() {
  if (initialized) return; initialized = true; rollDay();
  document.addEventListener("visibilitychange", visibility);
  // Request sensor permission only from the ON gesture, never on hydration.
  try { if (localStorage.getItem(KEY) === "1") update({ notice: "포행을 다시 켜면 오늘 기록에서 이어집니다." }); } catch { /* Optional storage. */ }
}
export function stopWalking() {
  generation++; if (watch !== null) navigator.geolocation.clearWatch(watch); if (timer !== null) clearInterval(timer);
  watch = timer = null; detector = null; seenAt = sensorSteps = 0; gps.reset(); window.removeEventListener("devicemotion", motion);
  void wake?.release().catch(() => {}); wake = null;
  try { localStorage.removeItem(KEY); } catch { /* Optional storage. */ }
  update({ on: false, starting: false, motion: "off", gps: "off", level: 0, notice: "" });
}
export async function startWalking() {
  initWalking(); if (state.on) return;
  const token = ++generation;
  update({ on: true, starting: true, motion: "waiting", gps: "waiting", hidden: document.hidden, notice: "앱 화면을 켜 둔 채 걸으세요. 화면을 바꿔도 포행은 이어집니다." });
  store(KEY, "1"); void keepAwake(); let allowed = false;
  try {
    const sensor = window.DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
    if (!sensor) update({ motion: "unavailable" });
    else if (sensor.requestPermission && await sensor.requestPermission() !== "granted") { if (token === generation) update({ motion: "denied" }); }
    else allowed = true;
  } catch { if (token === generation) update({ motion: "denied" }); }
  if (token !== generation || !state.on) return;
  if (allowed) {
    seenAt = Date.now();
    detector = createStepDetector({ onStep: n => { if (!state.on || document.hidden) return; sensorSteps += n; count(n); }, onLevel: value => {
      const now = Date.now(); if (now - levelAt < 150) return; levelAt = now;
      update({ level: Math.round(Math.max(0, Math.min(1, value)) * 5) });
    } });
    window.addEventListener("devicemotion", motion, { passive: true });
  }
  if (navigator.geolocation) watch = navigator.geolocation.watchPosition(p => {
    if (token !== generation || !state.on || document.hidden) return;
    rollDay(); update({ gps: "live" });
    const amount = gps.feed({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, at: p.timestamp }, sensorSteps);
    if (amount > 0) count(amount, true);
  }, () => { if (token === generation) update({ gps: "denied" }); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  else update({ gps: "denied" });
  timer = window.setInterval(() => {
    rollDay(); if (document.hidden) return;
    if (allowed && Date.now() - seenAt > 4000 && state.motion !== "silent") update({ motion: "silent", level: 0 });
  }, 1000);
  update({ starting: false });
}
export function toggleWalking() { if (state.on) stopWalking(); else void startWalking(); }
export function disposeWalking() {
  const wasOn = state.on;
  if (state.on) stopWalking();
  if (wasOn) store(KEY, "1");
  document.removeEventListener("visibilitychange", visibility); initialized = false;
}
export function subscribeWalking(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function getWalking() { return state; }
