import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../src/lib/tower-balance.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const m = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const { TOWER_STONES, placeStone, evaluateBalance, nextAim, TOWER_HEIGHT } = m;
assert.equal(TOWER_STONES.length, 9);
assert.equal(new Set(TOWER_STONES.map(s => s.crop.join(","))).size, 9);
assert.equal(evaluateBalance([]).stable, true);
assert.equal(evaluateBalance([placeStone(0, 0)]).stable, true);
assert.equal(evaluateBalance([placeStone(0, 108)]).stable, false);

let solution = [];
for (let i = 0; i < 9; i++) {
  let best;
  for (let x = -100; x <= 100; x += .5) {
    const candidate = placeStone(i, x, solution.at(-1));
    const assessment = evaluateBalance([...solution, candidate]);
    if (assessment.stable && (!best || assessment.risk < best.risk)) best = { candidate, risk: assessment.risk };
  }
  assert.ok(best, `stone ${i + 1} must have a reachable stable placement`);
  const before = JSON.stringify(solution);
  solution = [...solution, best.candidate];
  assert.equal(JSON.stringify(solution.slice(0, -1)), before, "placing a stone must not move previous rocks");
  assert.ok(best.candidate.y >= 0 && best.candidate.y < TOWER_HEIGHT, "successful rock stays inside the stage");
}
const final = evaluateBalance(solution);
assert.ok(final.stable);
const frozen = JSON.stringify(solution);
evaluateBalance(solution);
assert.equal(JSON.stringify(solution), frozen, "completion evaluation cannot modify coordinates");

// A narrow upper contact must not allow alternating extremes to cancel into a win.
const deliberatelyBad = [...solution.slice(0, 6), placeStone(6, 100, solution[5])];
assert.equal(evaluateBalance(deliberatelyBad).stable, false);
let lowerJointFailure = false;
for (let length = 3; length < 9; length++) {
  for (let x = -100; x <= 100; x++) {
    const lower = solution[length - 1];
    const candidate = placeStone(length, x, lower);
    const whole = evaluateBalance([...solution.slice(0, length), candidate]);
    if (evaluateBalance([lower, candidate]).stable && !whole.stable && whole.joint < length) lowerJointFailure = true;
  }
}
assert.ok(lowerJointFailure, "new upper weight must be able to destabilize an older lower joint");
let centered = [], centeredFailure = null;
for (let i = 0; i < 9; i++) {
  centered.push(placeStone(i, 0, centered.at(-1)));
  if (!evaluateBalance(centered).stable) { centeredFailure = i + 1; break; }
}
assert.ok(centeredFailure, "repeated center tapping must not automatically finish the challenge");

let guided = [];
for (let i = 0; i < 9; i++) guided.push(placeStone(i, nextAim(guided), guided.at(-1)));
assert.ok(evaluateBalance(guided).stable, "keyboard/support-centered route must remain winnable");

console.log(JSON.stringify({ ok: true, centeredFailure, solution: solution.map(p => ({ x: p.x, y: +p.y.toFixed(2) })), risk: final.risk }, null, 2));
