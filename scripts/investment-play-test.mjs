import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
function loader(react = React) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!fs.existsSync(file)) file = [file + ".ts", file + ".tsx"].find(fs.existsSync);
    assert(file, "source module exists");
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    new Function("require", "module", "exports", code)(key => key === "react" ? react : key.startsWith("@/") ? load(path.join("src", key.slice(2))) : key.startsWith(".") ? load(path.resolve(path.dirname(file), key)) : require(key), module, module.exports);
    return module.exports;
  }
  return load;
}

const load = loader();
const core = load("src/lib/tamjinchi.ts");
assert.deepEqual(core.poisonLevels(Array(9).fill(0)), { tam: 0, jin: 0, chi: 0 });
assert.deepEqual(core.poisonLevels(Array(9).fill(3)), { tam: 1, jin: 1, chi: 1 });
assert.deepEqual(core.poisonLevels([3, 0, 0, 3, 0, 0, 3, 0, 0]), { tam: 1, jin: 0, chi: 0 });
assert.deepEqual(core.poisonLevels([Infinity, -5, 99]), { tam: 0, jin: 0, chi: 1 / 3 });
assert.equal(core.TAMJINCHI_KEY, "hwadu.tamjinchi.v1");

let cursor = 0;
const hooks = [];
const hookReact = {
  ...React,
  useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial; return [hooks[index], next => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; }]; },
  useRef(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = { current: initial }; return hooks[index]; },
  useEffect() { cursor++; },
};
const Practice = loader(hookReact)("src/components/InvestmentPractice.tsx").default;
let attempts = 0, success = true, paused = 0;
const props = { book: null, onPause: () => paused++, onRecord: (poison, text) => { attempts++; assert(["tam", "jin", "chi"].includes(poison)); assert(text.includes(".")); return success; } };
const render = () => { cursor = 0; return Practice(props); };
function nodes(tree, predicate) { const out = []; function walk(node) { if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === "object" && node.props) { if (predicate(node)) out.push(node); walk(node.props.children); } } walk(tree); return out; }
const columns = tree => nodes(tree, n => n.type === "button" && n.props.className?.startsWith("investment-column"));
const actions = tree => nodes(tree, n => n.props.className === "investment-actions")[0].props.children;
let tree = render();
assert.equal(columns(tree).length, 3);
assert(actions(tree)[1].props.disabled);
for (let i = 0; i < 3; i++) { columns(tree)[i].props.onClick(); tree = render(); }
assert(!actions(tree)[1].props.disabled);
assert(columns(tree).every(n => n.props["aria-pressed"]));
const record = actions(tree)[1].props.onClick;
record(); record();
assert.equal(attempts, 1, "fast repeated taps record only once");
tree = render();
assert(columns(tree).every(n => n.props.disabled));
actions(tree)[1].props.onClick(); tree = render();
assert(columns(tree).every(n => !n.props["aria-pressed"]));
assert.equal(nodes(tree, n => n.type === "button" && n.props["aria-pressed"])[0].props["aria-label"], "잃은 걸 되찾고 싶어");
for (let i = 0; i < 3; i++) { columns(tree)[i].props.onClick(); tree = render(); }
success = false; actions(tree)[1].props.onClick(); tree = render();
assert(columns(tree).every(n => n.props["aria-pressed"] && !n.props.disabled), "failed saves retain the completed round for retry");
success = true; actions(tree)[1].props.onClick(); tree = render();
assert.equal(attempts, 3);
assert(columns(tree).every(n => n.props.disabled));
actions(tree)[0].props.onClick(); assert.equal(paused, 1);

const art = load("src/components/InvestmentDancheong.tsx");
const graphic = renderToStaticMarkup(React.createElement(React.Fragment, null,
  ...["jade", "coral", "gold"].map(tone => React.createElement(art.DancheongColumn, { key: tone, filled: true, tone })),
  React.createElement(art.DancheongGauge, { value: .6, tone: "jade", label: "탐욕 응답" }),
  React.createElement(art.DancheongGauge, { value: 9, tone: "coral", label: "성냄 응답" })));
const ids = [...graphic.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, "paint and clipping IDs are unique across simultaneous charts");
for (const match of graphic.matchAll(/url\(#([^)]*)\)/g)) assert(ids.includes(match[1]), "every pattern reference resolves");
assert(graphic.includes('width="276"'), "chart length is capped at its track");

const currentPractice = load("src/components/InvestmentPractice.tsx").default;
const markup = renderToStaticMarkup(React.createElement(currentPractice, props));
assert(markup.includes("세 번, 툭.") && markup.includes("investment-column-art"));
assert(!markup.includes("지금 어떤 마음인가요?"));
console.log("PASS: real-response charts, three-tap progress, duplicate-save guard, retry without progress loss, next round, pause routing and unique SVG paint IDs");

if (process.argv.includes("--preview")) {
  const sharp = require("sharp");
  const columnsArt = ["jade", "coral", "gold"].map((tone, i) => renderToStaticMarkup(React.createElement(art.DancheongColumn, { filled: true, tone }), { identifierPrefix: `sample-${tone}-` }).replace("<svg", `<svg x="${25 + i * 107}" y="40" width="88" height="166"`)).join("");
  const gaugesArt = ["jade", "coral", "gold"].map((tone, i) => renderToStaticMarkup(React.createElement(art.DancheongGauge, { value: [0.75, 0.4, 0.6][i], tone, label: tone }), { identifierPrefix: `gauge-${tone}-` }).replace("<svg", `<svg x="375" y="${60 + i * 54}" width="280" height="30"`)).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="690" height="236"><rect width="690" height="236" fill="#fffbf1"/><text x="30" y="26" fill="#286e63" font-family="sans-serif" font-size="12" letter-spacing="3">DANCHEONG</text>${columnsArt}${gaugesArt}</svg>`;
  const target = path.resolve(root, "..", "bulsim-dancheong-preview.png");
  await sharp(Buffer.from(svg)).png().toFile(target);
  console.log(`Pattern preview: ${target}`);
}
