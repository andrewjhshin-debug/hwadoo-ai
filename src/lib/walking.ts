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

// ── 설치 앱의 걸음 센서 ────────────────────────────────────────
// 형: 「왜 잠금이나 다른 앱 사용 중에는 쓸 수 없지? 쓸 수 있도록 해」
// 웹은 화면이 꺼지면 가속도계가 끊긴다. 안드로이드 앱(Capacitor)은
// StepCounterPlugin 이 폰의 누적 걸음(TYPE_STEP_COUNTER)을 읽어 준다 —
// 꺼져 있던 동안의 차이를 돌아왔을 때 한 번에 더한다. @capacitor/core 를
// 웹 번들에 넣지 않고 다리(window.Capacitor)를 직접 본다: 이 코드는
// 서버(hwa-du.com)에서 내려가 앱 안 WebView 에서도 같이 돈다.
type 센서응답 = { available: boolean; steps?: number; denied?: boolean; quiet?: boolean };
type 다리 = { isNativePlatform?: () => boolean; Plugins?: { StepCounter?: { read(): Promise<센서응답> } } };
const BASE_KEY = "hwadu.walking.native.base";
function 걸음센서() {
  const cap = (globalThis as { Capacitor?: 다리 }).Capacitor;
  return cap?.isNativePlatform?.() ? cap.Plugins?.StepCounter ?? null : null;
}
export function hasNativeSteps() { return !!걸음센서(); }
let 센서읽는중 = false;
/** 폰 누적 걸음을 읽어 아까 값과의 차이를 더한다. 첫 호출은 기준만 잡는다 */
async function 센서합산(): Promise<number> {
  const p = 걸음센서(); if (!p || 센서읽는중) return 0;
  센서읽는중 = true;
  try {
    const r = await p.read();
    if (!r.available) { if (r.denied) update({ motion: "denied" }); return 0; }
    if (typeof r.steps !== "number") return 0;
    const base = saved(BASE_KEY);
    store(BASE_KEY, String(r.steps));
    if (state.motion !== "live") update({ motion: "live" });
    // 재부팅하면 누적이 0 부터 다시 — 기준만 새로 잡는다
    if (base <= 0 || r.steps < base) return 0;
    let delta = Math.min(50000, Math.floor(r.steps - base)), added = 0;
    while (delta > 0) { const n = Math.min(500, delta); count(n); delta -= n; added += n; }
    return added;
  } catch { return 0; } finally { 센서읽는중 = false; }
}
function update(patch: Partial<WalkingState>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
function saved(key: string) { try { const n = Number(localStorage.getItem(key)); return Number.isFinite(n) ? Math.max(0, Math.min(key === BASE_KEY ? 1e9 : 200000, n)) : 0; } catch { return 0; } }
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
  if (!document.hidden && state.on) {
    seenAt = Date.now(); update({ motion: state.motion === "live" ? "waiting" : state.motion }); void keepAwake();
    if (걸음센서()) void 센서합산().then(n => { if (n > 0 && state.on) update({ notice: `꺼진 동안 ${n.toLocaleString("ko-KR")}걸음 더 걸었어요` }); });
  }
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
  try {
    if (localStorage.getItem(KEY) === "1") {
      // 앱이면 손짓 없이 이어 켠다 — 폰이 그동안 센 걸음이 바로 더해진다
      if (걸음센서()) void startWalking(); else update({ notice: "포행을 다시 켜면 오늘 기록에서 이어집니다." });
    }
  } catch { /* Optional storage. */ }
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
  const native = !!걸음센서();
  update({ on: true, starting: true, motion: "waiting", gps: "waiting", hidden: document.hidden, notice: native ? "화면이 꺼져도 폰이 걸음을 셉니다." : "앱 화면을 켜 둔 채 걸으세요. 화면을 바꿔도 포행은 이어집니다." });
  store(KEY, "1"); if (!native) void keepAwake(); let allowed = false;
  if (native) { try { localStorage.removeItem(BASE_KEY); } catch { /* 없으면 그만 */ } void 센서합산(); }
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
