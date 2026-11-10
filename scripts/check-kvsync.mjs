// 나머지 서랍 동기화(src/lib/kvSync.ts) 검산 — node scripts/check-kvsync.mjs
// 가짜 localStorage 두 벌(폰·노트북)과 가짜 구름 한 장으로, 늦게 쓴 쪽이 이기는지·빼는 칸은 안 오르는지 본다.
import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

const src = fs.readFileSync(new URL("../src/lib/kvSync.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

const cloud = { kv: {} };
const setDoc = async (_ref, data) => { for (const [k, v] of Object.entries(data.kv)) cloud.kv[k] = v; };

let now = 1000;
function device() {
  class Storage {
    constructor() { this.m = new Map(); }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
    key(i) { return [...this.m.keys()][i] ?? null; }
    get length() { return this.m.size; }
  }
  const localStorage = new Storage();
  const window = { localStorage, dispatchEvent() {} };
  const mod = { exports: {} };
  new Function("module", "exports", "require", "window", "Storage", "StorageEvent", "Date", "setTimeout", "clearTimeout", js)(
    mod, mod.exports, () => ({ setDoc }), window, Storage, class {}, { now: () => now }, () => 0, () => {},
  );
  return { ls: localStorage, kv: mod.exports };
}

const phone = device(), laptop = device();
phone.ls.setItem("hwadu.skin.v1", '{"bead":"jade-dragon"}');
phone.ls.setItem("hwadu.merit.v1", "공덕은 제 길로");          // 빼는 칸
phone.ls.setItem("hwadoo.sound-path", "element");              // 이 기기 것
phone.kv.kvAdopt(null); phone.kv.kvStart({});
await phone.kv.kvFlush();
assert.ok(cloud.kv["hwadu~skin~v1"], "살갗이 올라가야 한다");
assert.equal(cloud.kv["hwadu~merit~v1"], undefined, "공덕은 sync.ts 길 — 여기로 안 오른다");
assert.equal(cloud.kv["hwadoo~sound-path"], undefined, "소리 길은 기기 것");

now = 500; // 노트북엔 더 옛날에 고른 살갗이 있다
laptop.ls.setItem("hwadu.skin.v1", '{"bead":"paw"}');
laptop.kv.kvAdopt(cloud.kv);
assert.equal(laptop.ls.getItem("hwadu.skin.v1"), '{"bead":"jade-dragon"}', "늦게 쓴 폰 쪽이 이긴다");

now = 2000; // 노트북에서 새로 고르면 그게 이긴다
laptop.kv.kvStart({});
laptop.ls.setItem("hwadu.skin.v1", '{"bead":"ebony"}');
await laptop.kv.kvFlush();
phone.kv.kvAdopt(cloud.kv);
assert.equal(phone.ls.getItem("hwadu.skin.v1"), '{"bead":"ebony"}', "노트북의 새 선택이 폰에 온다");
console.log("kvSync ok");
