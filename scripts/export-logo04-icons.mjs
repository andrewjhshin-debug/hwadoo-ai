// Mechanical size/format exports of the approved image; no creative redrawing.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const input = process.argv[2] ?? "design/brand/2026-10-17/logo04-master.png";
const output = process.argv[3] ?? "public/brand/dongja-gradient-v1";
await fs.mkdir(output, { recursive: true });
const source = input.endsWith(".svg") ? await sharp(input, { density: 384 }).png().toBuffer() : await fs.readFile(input);
const meta = await sharp(source).metadata();
const stats = await sharp(source).ensureAlpha().stats();
if (!meta.hasAlpha || stats.channels.at(-1).min !== 0) throw new Error("Approved master must have a transparent background");
const plain = async size => {
  const mark = await sharp(source).resize(Math.round(size * .84), Math.round(size * .84), { fit: "contain", background: "#00000000" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#00000000" } })
    .composite([{ input: mark, gravity: "centre" }]).png().toBuffer();
};
const opaque = async (size, safe = false) => {
  const inner = safe ? Math.round(size * .82) : size;
  const mark = await plain(inner);
  return sharp({ create: { width: size, height: size, channels: 4, background: "#fbfaf8" } })
    .composite([{ input: mark, gravity: "centre" }]).flatten({ background: "#fbfaf8" }).png().toBuffer();
};
const outputs = new Map();
for (const size of [16, 32, 180, 192, 512]) {
  const name = size === 16 || size === 32 || size === 180 ? `favicon-${size}.png` : `icon-${size}.png`;
  outputs.set(name, await plain(size));
}
outputs.set("apple-touch-icon.png", await opaque(180));
outputs.set("icon-512-maskable.png", await opaque(512, true));
const icoSizes = [16, 32, 48, 256];
const images = await Promise.all(icoSizes.map(plain));
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((png, i) => {
  const start = 6 + i * 16;
  header[start] = icoSizes[i] === 256 ? 0 : icoSizes[i];
  header[start + 1] = header[start];
  header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(png.length, start + 8); header.writeUInt32LE(offset, start + 12);
  offset += png.length;
});
outputs.set("favicon.ico", Buffer.concat([header, ...images]));
// SVG compatibility wrapper, intentionally embeds the approved raster master.
outputs.set("icon.svg", Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${outputs.get("icon-512.png").toString("base64")}"/></svg>`));
if (input.endsWith(".svg")) outputs.set("icon.svg", await fs.readFile(input));
for (const [name, data] of outputs) {
  await fs.writeFile(path.join(output, name), data);
  // Preserve old entry-point compatibility; backups are in design/brand/2026-10-17/previous-icons.
  await fs.writeFile(path.join("public", name), data);
}
for (const [name] of outputs) {
  if (!name.endsWith(".png")) continue;
  const file = path.join(output, name);
  const info = await sharp(file).metadata();
  const opaqueFile = name.includes("maskable") || name.includes("apple-touch");
  if (opaqueFile && (await sharp(file).ensureAlpha().stats()).channels.at(-1).min !== 255) throw new Error(`${name}: expected opaque platform background`);
  console.log(`${name}: ${info.width}x${info.height}, alpha=${info.hasAlpha}`);
}
console.log(`Exported ${outputs.size} approved-logo files; all archived boards and old icons were preserved.`);
