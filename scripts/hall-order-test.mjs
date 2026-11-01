// node scripts/hall-order-test.mjs — 법당 줄 세우기 잣대가 그대로인지 (Node 24 는 .ts 를 바로 읽는다)
import assert from "node:assert/strict";
const { 차례 } = await import("../src/lib/hallOrder.ts");
const p = (o) => ({ uid: o.u, name: o.u, sex: "", age: 0, area: "", temple: "", line: "", photo: false, at: 0, open: false, merit: 0, ...o });
const 나 = { temple: "진관사", area: "서울" };
const 줄 = [p({ u: "old", at: 1 }), p({ u: "rich", merit: 9 }), p({ u: "near", area: "서울" }), p({ u: "temple", temple: "진관사" }), p({ u: "open", open: true })];
줄.sort((a, b) => 차례(나, a, b));
assert.deepEqual(줄.map((x) => x.uid), ["open", "temple", "near", "rich", "old"]);
console.log("hall-order ok");
