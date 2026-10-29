import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
function load(path, deps = {}, env = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", ...Object.keys(env), code)(key => deps[key], exports, ...Object.values(env));
  return exports;
}
let clock = Date.parse("2026-10-30T10:00:00+09:00");
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
const core = load("src/lib/walking-core.ts", {}, { Date: ClockDate });
const realDetector = load("src/lib/stepDetect.ts");
for (const hz of [10, 20, 30, 60]) for (const cadence of [.65, 1.2, 1.8]) {
  let counted = 0;
  const detector = realDetector.createStepDetector({ onStep: n => counted += n });
  for (let i = 0; i < Math.ceil((4 + 24 / cadence) * hz); i++) {
    const t = i / hz; let pulse = 0;
    for (let step = 0; step < 24; step++) { const u = t - (2 + step / cadence); if (u >= 0 && u < .2) pulse += .5 * Math.sin(u / .2 * Math.PI); else if (u >= .2 && u < .35) pulse -= .15 * Math.sin((u - .2) / .15 * Math.PI); }
    detector.feed(0, 0, 9.81 + pulse, i * 1000 / hz);
  }
  assert(counted >= 22 && counted <= 25, `${hz}Hz / ${cadence} steps/s must count slow and broad walking pulses, got ${counted}`);
}
const gps = core.createWalkingGPS();
const p = (m, t, accuracy = 5) => ({ lat: 37 + m / 111195, lon: 127, at: t, accuracy });
assert.equal(gps.feed(p(0, 0), 0), 0);
assert.equal(gps.feed(p(14, 14000), 20), 0, "GPS segment already counted by sensor cannot double count");
assert(gps.feed(p(28, 28000), 20) >= 19, "GPS fallback counts movement with no sensor steps in the interval");
gps.reset(); gps.feed(p(0, 0), 0);
assert.equal(gps.feed(p(50, 1000), 0), 0, "vehicle speed is rejected");
assert.equal(gps.feed(p(70, 4000, 150), 0), 0, "poor accuracy is rejected");
gps.reset(); gps.feed(p(0, 0), 0);
assert.equal(gps.feed(p(100, 180000), 0), 0, "background gap is not retroactively counted");
const store = new Map([["hwadu.walking.steps.2026-10-30", "142"], ["hwadu.walking.meters.2026-10-30", "99.4"]]);
const winEvents = new Map(), docEvents = new Map(), intervals = new Map();
let callbacks, gpsCallback, grants = 0, clearWatches = 0, releases = 0;
const window = { DeviceMotionEvent: {}, addEventListener: (name, fn) => winEvents.set(name, fn), removeEventListener: name => winEvents.delete(name), setInterval: fn => { intervals.set(1, fn); return 1; } };
const document = { hidden: false, addEventListener: (name, fn) => docEvents.set(name, fn), removeEventListener: name => docEvents.delete(name) };
const navigator = { geolocation: { watchPosition: fn => { gpsCallback = fn; return 7; }, clearWatch: () => clearWatches++ }, wakeLock: { request: async () => ({ released: false, release: async () => { releases++; } }) } };
const runtime = load("src/lib/walking.ts", { "./stepDetect": { createStepDetector: opts => { callbacks = opts; return { reset() {}, feed() {} }; } }, "./walking-core": core, "./merit": { addMerit: (_kind, n) => { grants += n; } } }, { window, document, navigator, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) }, Date: ClockDate, performance: { now: () => clock }, clearInterval: id => intervals.delete(id) });
runtime.initWalking(); runtime.initWalking(); assert.equal(docEvents.size, 1);
await runtime.startWalking(); await runtime.startWalking(); assert.equal(winEvents.size, 1);
assert.equal(runtime.getWalking().steps, 142);
callbacks.onStep(1); assert.equal(runtime.getWalking().steps, 143); assert.equal(grants, 1, "crossing a reward boundary pays once outside React state updates");
const unsubscribe = runtime.subscribeWalking(() => {}); unsubscribe();
callbacks.onStep(2); assert.equal(runtime.getWalking().steps, 145, "unmounting a screen does not stop the global detector");
document.hidden = true; docEvents.get("visibilitychange")(); callbacks.onStep(20);
assert.equal(runtime.getWalking().steps, 145, "hidden sensor events cannot fabricate steps");
document.hidden = false; docEvents.get("visibilitychange")();
gpsCallback({ coords: { latitude: 37, longitude: 127, accuracy: 5 }, timestamp: 0 });
callbacks.onStep(20);
gpsCallback({ coords: { latitude: 37 + 14 / 111195, longitude: 127, accuracy: 5 }, timestamp: 14000 });
assert.equal(runtime.getWalking().steps, 165, "sensor and GPS fusion avoids duplicates");
runtime.stopWalking(); assert.equal(winEvents.size, 0); assert.equal(intervals.size, 0); assert.equal(clearWatches, 1);
const before = runtime.getWalking().steps; callbacks.onStep(4); assert.equal(runtime.getWalking().steps, before);
let resolvePermission;
window.DeviceMotionEvent.requestPermission = () => new Promise(resolve => { resolvePermission = resolve; });
const starting = runtime.startWalking(); runtime.stopWalking(); resolvePermission("granted"); await starting;
assert.equal(runtime.getWalking().on, false); assert.equal(winEvents.size, 0, "late permission cannot restart a stopped session");
delete window.DeviceMotionEvent.requestPermission;
await runtime.startWalking(); clock += 86400000; intervals.get(1)();
assert.equal(runtime.getWalking().steps, 0, "Korea day rollover resets today's counter");
runtime.stopWalking(); assert(releases > 0);
runtime.disposeWalking(); assert.equal(docEvents.size, 0, "root teardown removes the visibility listener");
const investment = load("src/lib/investment-practice.ts");
assert.equal(investment.normalizeInvestmentRules(["x".repeat(90), 1])[0].length, 80);
const review = investment.investmentReview({ entries: [{ at: clock - 1000, deed: "hold", poison: "tam" }, { at: clock + 1000, deed: "hold", poison: "chi" }, { at: clock - 8 * 86400000, deed: "buy", poison: "chi" }] }, clock);
assert.deepEqual(review, { count: 1, dominant: "tam", held: 1 });
console.log("PASS: route-independent counting, ON/OFF cleanup and late permission race, day rollover, merit once, hidden suspension, GPS deduplication/fallback, investment rules/review");
