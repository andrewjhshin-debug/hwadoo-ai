import fs from 'node:fs/promises';
import sharp from 'sharp';

const width = 1000, height = 1400;
const cupBox = { left: 20, top: 820, width: 960, height: 560 };
const specs = [
  { id: 'dongja', source: 'pink', bodyHeight: 1060 },
  { id: 'podae', source: 'yellow', bodyHeight: 1000 },
  { id: 'mireuk', source: 'gold', bodyHeight: 1060 },
];
const dir = 'public/obj/keycaps-v3';
await fs.mkdir(dir, { recursive: true });
const blank = () => sharp({ create: { width, height, channels: 4, background: '#00000000' } });

// Sprite export only: isolate the main generated alpha island and normalize its canvas.
async function object(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height), queue = new Int32Array(seen.length);
  let best = [];
  for (let p = 0; p < seen.length; p++) {
    if (seen[p] || data[p * 4 + 3] < 32) continue;
    let head = 0, end = 1; queue[0] = p; seen[p] = 1;
    while (head < end) {
      const at = queue[head++], x = at % info.width;
      for (const next of [x ? at - 1 : -1, x < info.width - 1 ? at + 1 : -1, at - info.width, at + info.width]) {
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 32) continue;
        seen[next] = 1; queue[end++] = next;
      }
    }
    if (end > best.length) best = Array.from(queue.subarray(0, end));
  }
  if (best.length < 1000) throw Error(`Missing alpha object: ${file}`);
  const keep = new Uint8Array(seen.length);
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (const p of best) {
    const x = p % info.width, y = Math.floor(p / info.width);
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (x + dx >= 0 && x + dx < info.width && y + dy >= 0 && y + dy < info.height) keep[(y + dy) * info.width + x + dx] = 1;
    }
  }
  for (let p = 0; p < keep.length; p++) if (!keep[p]) data[p * 4 + 3] = 0;
  return sharp(data, { raw: info }).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
}

// Follows the visible front-petal rim; no painted patches or synthetic shadows.
const frontMask = Buffer.from(`<svg width="1000" height="1400" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M20 1060L20 1008 Q45 932 72 938 Q102 942 145 986 Q196 953 229 984 Q290 1016 338 1100 Q424 999 500 1010 Q576 999 662 1100 Q710 1016 771 984 Q804 953 855 986 Q898 942 928 938 Q955 932 980 1008L980 1400H20Z"/></svg>`);
const metadata = [];
for (const spec of specs) {
  const cup = await sharp(await object(`design/keycaps/v3/${spec.source}-source.png`)).resize(cupBox.width, cupBox.height, { fit: 'fill' }).png().toBuffer();
  const back = await blank().composite([{ input: cup, left: cupBox.left, top: cupBox.top }]).png().toBuffer();
  await sharp(back).webp({ lossless: true }).toFile(`${dir}/${spec.id}-back.webp`);
  await sharp(back).composite([{ input: frontMask, blend: 'dest-in' }]).webp({ lossless: true }).toFile(`${dir}/${spec.id}-front.webp`);
  const body = await sharp(await object(`public/obj/kc-${spec.id}-body.png`)).resize({ height: spec.bodyHeight }).png().toBuffer();
  const size = await sharp(body).metadata();
  const bodyBox = { left: Math.round((width - size.width) / 2), top: 1110 - size.height, width: size.width, height: size.height };
  await blank().composite([{ input: body, left: bodyBox.left, top: bodyBox.top }]).webp({ lossless: true }).toFile(`${dir}/${spec.id}-body.webp`);
  metadata.push({ id: spec.id, canvas: { width, height }, cupBox, bodyBox });
}
await fs.writeFile(`${dir}/geometry.json`, JSON.stringify(metadata, null, 2));
console.log('Prepared three aligned keycaps, each with stationary cup back/front and a separate body.');
