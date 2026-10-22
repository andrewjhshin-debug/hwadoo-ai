// Exercise the component's real handlers/effect with a controlled clock, without user data.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(fs.readFileSync("src/components/ReflectionPractice.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helperCode = ts.transpileModule(fs.readFileSync("src/lib/reflectionPractice.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helper = { exports: {} };
new Function("exports", helperCode)(helper.exports);

function harness() {
  let cursor = 0, tree, now = 0, awards = 0, calls = [], save = false;
  const slots = [], effects = [], timers = new Set(), listeners = new Set();
  const window = { setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn) };
  const document = { hidden: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const module = { exports: {} };
  const require = name => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "fragment" };
    if (name.endsWith("/reflectionPractice")) return helper.exports;
    if (name.endsWith("/meditation")) return { recordMeditation: (_, breaths) => { assert.equal(breaths, 6); awards++; return 126; } };
    throw new Error(name);
  };
  new Function("require", "exports", "window", "document", "performance", code)(require, module.exports, window, document, { now: () => now });
  const render = () => { cursor = 0; tree = module.exports.default({ onReflect: text => { calls.push(text); return save; } }); while (effects.length) effects.shift()(); };
  const nodes = value => !value || typeof value !== "object" ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
  const find = (type, text) => nodes(tree).find(n => n.type === type && (!text || nodes(n.props.children).length === 0 && n.props.children === text));
  const click = label => { const node = find("button", label); assert(node, label); node.props.onClick(); render(); };
  render();
  return {
    click, find,
    step(ms) { now += ms; [...timers].forEach(fn => fn()); render(); },
    hide(hidden) { document.hidden = hidden; [...listeners].forEach(fn => fn()); render(); },
    allowSave() { save = true; },
    edit(text) { find("textarea").props.onChange({ target: { value: text } }); render(); },
    get awards() { return awards; }, get calls() { return calls; }, get timers() { return timers.size; }, get tree() { return tree; },
  };
}
const a = harness();
assert.equal(a.timers, 0, "must opt in");
a.click("1분 호흡 시작");
a.step(30000); a.hide(true); a.step(120000);
assert.equal(a.awards, 0, "background time cannot complete a practice");
a.hide(false); a.step(29999);
assert.equal(a.awards, 0);
a.step(1);
assert.equal(a.awards, 1);
assert.equal(a.timers, 0, "timer removed on completion");
a.step(60000); assert.equal(a.awards, 1, "no duplicate award");
assert.equal(a.find("button", "단상에 남기기").props.disabled, true);
a.edit("테스트 기록"); a.click("단상에 남기기");
assert(a.find("textarea"), "failed save keeps the draft");
a.allowSave(); a.click("단상에 남기기");
assert.equal(a.calls.at(-1), "호흡 뒤 돌아보기\n테스트 기록");
assert.equal(a.tree, null);
const b = harness(); b.click("1분 호흡 시작"); b.step(10000); b.click("여기서 그만하기"); b.step(60000);
assert.equal(b.awards, 0); assert.equal(b.timers, 0);
const c = harness(); c.click("1분 호흡 시작"); c.step(60000); c.click("기록 없이 마치기"); assert.equal(c.calls.length, 0);
console.log("PASS: opt-in, foreground-only timer, cancel, exactly-once merit, failed-save retry and skip reflection");
