import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
function load(file, deps = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "exports", ...Object.keys(globals), code)(name => { if (!(name in deps)) throw new Error(name); return deps[name]; }, module.exports, ...Object.values(globals));
  return module.exports;
}
const balance = load("src/lib/tower-balance.ts");
const game = load("src/lib/tower-game.ts", { "./tower-balance": balance });
assert.deepEqual(game.stoneSpec(40, 123), game.stoneSpec(40, 123));
assert.notDeepEqual(game.stoneSpec(40, 123), game.stoneSpec(40, 124));
assert.equal(game.aimSway(2, 1000, 17), 0, "first three stones teach positioning without sway");
assert.notEqual(game.aimSway(10, 1000, 17), game.aimSway(10, 1400, 17), "timing changes the visible release position");
for (let depth = 3; depth < 60; depth++) {
  const s = game.stoneSpec(depth, 123);
  const previousSupport = Math.max(.19, balance.TOWER_STONES[s.art].support + .055);
  assert(s.support < previousSupport, "advanced support windows are narrower than the original easy mode");
}
for (let t = 0; t < 10000; t += 100) assert(Math.abs(game.aimSway(100, t, 17)) <= 28);
for (const x of [-10000, 0, 10000]) assert(game.stability([game.dropStone([], x, 1)]).stable);
assert.equal(game.rewardTier(9.99), 0); assert.equal(game.rewardTier(10), 1);
let longest = 0;
for (let seed = 1; seed <= 30; seed++) {
  let stones = [];
  for (let depth = 0; depth < 35; depth++) {
    let best;
    for (let x = -105; x <= 105; x += 2) {
      const candidate = game.dropStone(stones, x, seed);
      const b = game.stability([...stones, candidate]);
      if (b.stable && b.risk < .97 && (!best || b.risk < best.risk)) best = { stone: candidate, risk: b.risk };
    }
    if (!best) break;
    const before = JSON.stringify(stones);
    stones = [...stones, best.stone];
    assert.equal(JSON.stringify(stones.slice(0, -1)), before, "new placements do not change old world positions");
    assert(Number.isFinite(game.cameraFor(stones)));
  }
  longest = Math.max(longest, stones.length);
}
assert(longest >= 20, "there must be playable paths past the old nine-stone finish");
const storage = new Map();
const record = load("src/lib/tower-record.ts", { "./tower-game": game }, { localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } });
assert.equal(record.claimTowerHeight("u1", 31).delta, 3);
assert.equal(record.claimTowerHeight("u1", 12).delta, 0);
assert.equal(record.claimTowerHeight("u1", 31).delta, 0);
assert.equal(record.claimTowerHeight("u1", 41).delta, 1);
assert.equal(record.claimTowerHeight("u2", 12).delta, 1);
const stale = { best: 41, day: "2000-01-01", paidTier: 4 };
storage.set("hwadu.tower.height.v1:u1", JSON.stringify(stale));
assert.equal(record.claimTowerHeight("u1", 11).delta, 1, "new day pays once again");

let now = 0, raf, rewards = 0, hits = 0, status;
const listeners = new Map();
const document = { hidden: false, addEventListener: (k, fn) => listeners.set(k, fn), removeEventListener: k => listeners.delete(k) };
const ctx = new Proxy({ canvas: { width: 720, height: 1040 } }, { get: (obj, key) => key in obj ? obj[key] : () => {} });
const engineModule = load("src/lib/tower-engine.ts", { "./tower-game": game }, {
  window: { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }, document,
  performance: { now: () => now }, requestAnimationFrame: fn => { raf = fn; return 1; }, cancelAnimationFrame: () => { raf = null; },
});
const engine = engineModule.createTowerEngine({ getContext: () => ctx }, {}, 17, s => status = s, () => rewards++, () => hits++);
const step = ms => { for (let t = 0; t < ms; t += 20) { now += 20; raf?.(now); } };
engine.drop(0); engine.drop(50); // duplicate input during landing is ignored
assert.equal(engine.frame().stones.length, 1, "stone appears immediately without waiting for RAF");
assert.equal(engine.frame().drop, 0, "instant placement has no airborne offset");
assert.equal(hits, 1, "sound fires on placement, not after a drop animation");
step(1300); assert.equal(status.count, 1); assert.equal(rewards, 1);
engine.pause(); engine.drop(0); step(200); assert.equal(status.count, 1);
engine.resume(); engine.drop(0); step(100);
document.hidden = true; listeners.get("visibilitychange")(); step(10000);
document.hidden = false; listeners.get("visibilitychange")(); step(40);
assert.equal(status.phase, "busy", "background time cannot skip the landing/settling phases");
step(1300); assert.equal(status.phase, "ready");
const old = engine.frame().stones;
engine.drop(140); step(2400);
assert.equal(status.phase, "fallen");
assert(engine.frame().stones.length >= 1);
for (const [i, stone] of engine.frame().stones.entries()) assert.equal(stone, old[i], "surviving objects remain identical");
engine.resume(); assert.equal(status.phase, "ready");
assert(engine.replay().length <= 64);
engine.dispose(); assert.equal(raf, null); assert.equal(listeners.size, 0);
console.log(`PASS: deterministic seeded stones; playable path ${longest} stones; unchanged survivors; partial collapse; duplicate input lock; hidden pause; bounded replay; daily reward replay prevention`);
