import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";

const root = "public/brand/lotus-gold-dark-v1";
for (const name of ["icon-192.png", "icon-512.png", "icon-512-maskable.png", "apple-touch-icon.png"]) {
  const { data, info } = await sharp(`${root}/${name}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.subarray(0, 4)], [13, 11, 9, 255], `${name}: ink-dark corner`);
  let gold = 0;
  for (let i = 0; i < info.width * info.height * 4; i += 4) if (data[i] > 100 && data[i] > data[i + 1] && data[i + 1] > data[i + 2]) gold++;
  assert(gold > info.width * info.height * .03, `${name}: visible gold lotus`);
}
for (const size of [16, 32, 180]) {
  const { data } = await sharp(`${root}/favicon-${size}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0, `${size}: transparent favicon background`);
  assert.equal((await sharp(`${root}/favicon-${size}.png`).metadata()).width, size);
}
const manifest = JSON.parse(await fs.readFile("public/manifest.json", "utf8"));
for (const icon of manifest.icons) {
  assert(icon.src.startsWith("/brand/lotus-gold-dark-v1/"));
  const meta = await sharp(`public${icon.src}`).metadata();
  assert.equal(`${meta.width}x${meta.height}`, icon.sizes);
}
console.log("PASS: gold lotus on ink-dark mobile icons, transparent favicons, manifest sizes and versioned paths");
