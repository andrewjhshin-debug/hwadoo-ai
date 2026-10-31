// 불심투자 셈 검사 — node --experimental-strip-types 없이 돌게 ts 를 직접 읽지 않고
// tsx 가 없어서 node 24 의 strip-types 로 돈다:  node scripts/invest-cool-check.mjs
import assert from "node:assert/strict";
const m = await import("../src/lib/invest-cool.ts");

// 목탁 — 급하면 안 쳐진다
assert.deepEqual(m.치기(108, 50), [108, false]);
assert.deepEqual(m.치기(108, 200), [107, true]);
assert.deepEqual(m.치기(0, 999), [0, false]);
assert.equal(m.식음(108), 0);
assert.equal(m.식음(0), 1);

// 저장 — 깨진 줄은 버린다, 한도 500
const mem = new Map();
const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
assert.deepEqual(m.읽기(st), []);
mem.set(m.COOL_KEY, JSON.stringify([{ at: 1, want: "buy", did: "kept", taps: 108 }, { bad: 1 }, null]));
assert.equal(m.읽기(st).length, 1);
for (let i = 0; i < 600; i++) m.적기({ at: i, want: "look", did: "kept", taps: 0 }, st);
assert.equal(m.읽기(st).length, 500);

// 업보 — 숫자만
const t = (h, mi = 0) => new Date(2026, 9, 30, h, mi).getTime();
assert.deepEqual(m.업보([]), { kept: 0, did: 0, taps: 0 });
assert.deepEqual(m.업보([{ at: t(10), want: "buy", did: "kept", taps: 108 }, { at: t(10), want: "sell", did: "did", taps: 108 }]), { kept: 1, did: 1, taps: 216 });

// 한마디 — 연달아 다른 말
assert.notEqual(m.한마디("buy", "kept", 0), m.한마디("buy", "kept", 1));
console.log("invest-cool ✓");
