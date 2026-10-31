// Inspect production engraved artwork at mobile bead size, without a browser.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import sharp from "sharp";
const require = createRequire(import.meta.url), mod = {};
const output = process.argv[2] ?? "design/mala/engraved-stone-zodiac-v3.png";
new Function("require", "exports", ts.transpileModule(await fs.readFile("src/components/StoneMalaBead.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(require, mod);
const layers = [], labels = [], cell = 128, row = 150, columns = 6;
const symbols=[...mod.STONE_MALA_SYMBOLS,...mod.ZODIAC_MALA_SYMBOLS];
for (let i = 0; i < symbols.length; i++) {
  const bead = await sharp(`public${symbols[i].src}`).resize(116, 116).png().toBuffer();
  const left = i % columns * cell, top = Math.floor(i / columns) * row;
  layers.push({ input: bead, left: left + 6, top: top + 4 });
  labels.push(`<text x="${left + cell / 2}" y="${top + 138}" text-anchor="middle">${symbols[i].name}</text>`);
}
const width = cell * columns, height = Math.ceil(symbols.length / columns) * row;
layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g font-family="Malgun Gothic, sans-serif" font-size="14" fill="#37443c">${labels.join("")}</g></svg>`), left: 0, top: 0 });
await fs.mkdir("design/mala", { recursive: true });
await sharp({ create: { width, height, channels: 4, background: "#fbfaf8" } }).composite(layers).png().toFile(output);
console.log(output);
