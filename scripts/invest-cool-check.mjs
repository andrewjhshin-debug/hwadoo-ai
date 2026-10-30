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

// 업보 — 셋 미만이면 없음, 패턴별로 갈린다
const t = (h, mi = 0) => new Date(2026, 9, 30, h, mi).getTime();
assert.equal(m.업보([]), null);
assert.equal(m.업보([{ at: t(10), want: "buy", did: "kept", taps: 108 }, { at: t(10), want: "buy", did: "kept", taps: 108 }]), null);
const 마감 = Array.from({ length: 4 }, () => ({ at: t(15, 10), want: "buy", did: "kept", taps: 108 }));
assert.equal(m.업보(마감).name, "장 마감 5분 전 귀신");
const 밤 = Array.from({ length: 4 }, () => ({ at: t(23), want: "buy", did: "kept", taps: 108 }));
assert.equal(m.업보(밤).name, "미장 야행성 보살");
const 참음 = Array.from({ length: 4 }, () => ({ at: t(10), want: "buy", did: "kept", taps: 108 }));
assert.equal(m.업보(참음).name, "참을 인(忍) 세 번");
const 추격 = Array.from({ length: 4 }, () => ({ at: t(10), want: "buy", did: "did", taps: 108 }));
assert.equal(m.업보(추격).name, "추격매수 보살");
const 하차 = Array.from({ length: 4 }, () => ({ at: t(10), want: "buy", did: "did", taps: 30 }));
assert.equal(m.업보(하차).name, "목탁 중도 하차자");
const 구경 = Array.from({ length: 4 }, () => ({ at: t(10), want: "look", did: "kept", taps: 0 }));
assert.equal(m.업보(구경).name, "구경만 하는 돌부처");

// 한마디 — 연달아 다른 말
assert.notEqual(m.한마디("buy", "kept", 0), m.한마디("buy", "kept", 1));
console.log("invest-cool ✓");
