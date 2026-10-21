import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sharp from "sharp";

const root = "public/brand/lotus-gradient-dark-v2";
for (const name of ["icon-192.png", "icon-512.png", "icon-512-maskable.png", "apple-touch-icon.png"]) {
  const { data, info } = await sharp(`${root}/${name}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.subarray(0, 4)], [0, 0, 0, 255], `${name}: black corner`);
  const center = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4;
  assert.deepEqual([...data.subarray(center, center + 4)], [0, 0, 0, 255], `${name}: black petal interior`);
}
for (const size of [16, 32, 180]) {
  const { data } = await sharp(`${root}/favicon-${size}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0, `${size}: transparent favicon background`);
  assert.equal((await sharp(`${root}/favicon-${size}.png`).metadata()).width, size);
}
const manifest = JSON.parse(await fs.readFile("public/manifest.json", "utf8"));
for (const icon of manifest.icons) {
  assert(icon.src.startsWith("/brand/lotus-gradient-dark-v2/"));
  const meta = await sharp(`public${icon.src}`).metadata();
  assert.equal(`${meta.width}x${meta.height}`, icon.sizes);
}
console.log("PASS: black mobile icons, transparent favicons, manifest sizes and versioned paths");
