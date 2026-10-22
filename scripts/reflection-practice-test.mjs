import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(readFileSync("src/lib/reflectionPractice.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { reflectionPhase: phase, reflectionNote: note } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
assert.equal(phase(-1).secondsLeft, 60);
assert.equal(phase(0).inhale, true);
assert.equal(phase(3999).inhale, true);
assert.equal(phase(4000).inhale, false);
assert.equal(phase(10000).inhale, true);
assert.equal(phase(59999).done, false);
assert.equal(phase(60000).done, true);
assert.equal(phase(90000).breaths, 6);
assert.equal(phase(90000).secondsLeft, 0);
assert.equal(note("  "), "");
assert.equal(note(" 조금 차분해졌다 "), "호흡 뒤 돌아보기\n조금 차분해졌다");
assert.equal(note("가".repeat(600)).split("\n")[1].length, 500);
const ui = readFileSync("src/components/ReflectionPractice.tsx", "utf8");
assert(ui.includes('stage !== "running"'), "no auto-start");
assert(ui.includes("!awarded.current"), "completion award is guarded");
assert(ui.includes('document.removeEventListener("visibilitychange", tick)'));
assert(!ui.includes("fetch(") && !ui.includes("localStorage"), "no new note transfer or independent memory store");
console.log("PASS: breath phases, duration, bounded reflection, opt-in, cleanup and no external transfer");
