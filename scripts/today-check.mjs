// 오늘(음력·절기·재일) 셈 검사 — node --experimental-strip-types scripts/today-check.mjs
import assert from "node:assert/strict";
const m = await import("../src/lib/today.ts");
const t = m.오늘읽기(new Date(2026, 9, 31));
assert.equal(t.음력, "음 9월 22일"); assert.equal(t.일진, "무인일"); assert.match(t.해, /병오년 · 말띠 해/);
assert.equal(t.절기, null); assert.deepEqual(t.다음절기, { name: "입동", days: 7 }); assert.equal(t.재일, null);
const d = m.오늘읽기(new Date(2026, 10, 7)); assert.equal(d.절기, "입동"); assert.equal(d.다음절기, null);
// 재일 — 음력 24 관음재일 2026-11-02 는 음 9월 24일
const g = m.오늘읽기(new Date(2026, 10, 2)); assert.equal(g.재일?.name, "관음재일");
assert.equal(m.날수(new Date(2026, 9, 31)), m.날수(new Date(2026, 9, 31, 23, 59)));
const dh = await import("../src/lib/dhammapada.ts"); assert.equal(dh.오늘법구(0).n, 1); assert.ok(dh.오늘법구(-3).text);
console.log("today ✓", t.음력, t.일진, t.해, JSON.stringify(t.다음절기));
