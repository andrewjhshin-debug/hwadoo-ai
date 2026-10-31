// Render the actual vector engraving component on its stone sprites for visual review.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
const require = createRequire(import.meta.url), mod = {};
new Function("require", "exports", ts.transpileModule(await fs.readFile("src/components/StoneMalaBead.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(require, mod);
const layers = [], labels = [], cell = 128, row = 150, columns = 6;
for (let i = 0; i < mod.STONE_MALA_SYMBOLS.length; i++) {
  const fill = i >= 24 ? 1 : 0;
  const html = renderToStaticMarkup(React.createElement(mod.default, { base: "/base.png", gold: "/gold.png", fill, index: i }));
  const svg = html.match(/<svg[\s\S]*?<\/svg>/)[0].replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  const engraving = await sharp(Buffer.from(svg)).resize(116, 116).png().toBuffer();
  const bead = await sharp(`public/obj/bead-stone-one${fill ? "-gold" : ""}-v2.png`).resize(116, 116).composite([{ input: engraving }]).png().toBuffer();
  const left = i % columns * cell, top = Math.floor(i / columns) * row;
  layers.push({ input: bead, left: left + 6, top: top + 4 });
  labels.push(`<text x="${left + cell / 2}" y="${top + 138}" text-anchor="middle">${mod.STONE_MALA_SYMBOLS[i].name}</text>`);
}
const width = cell * columns, height = Math.ceil(mod.STONE_MALA_SYMBOLS.length / columns) * row;
layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g font-family="Malgun Gothic, sans-serif" font-size="14" fill="#37443c">${labels.join("")}</g></svg>`), left: 0, top: 0 });
await fs.mkdir("design/mala", { recursive: true });
await sharp({ create: { width, height, channels: 4, background: "#fbfaf8" } }).composite(layers).png().toFile("design/mala/stone-buddhist-symbols-2026-10-31.png");
console.log("design/mala/stone-buddhist-symbols-2026-10-31.png");
