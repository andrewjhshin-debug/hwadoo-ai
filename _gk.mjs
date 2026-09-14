// 초록(#00FF00) 배경을 지운다.
//  1) 초록기(g - max(r,b))로 알파를 깎고
//  2) 남은 픽셀의 초록 물듦(spill)을 뺀 뒤
//  3) 덩어리를 세어 잔챙이(제미나이 반짝이 워터마크)를 버리고
//  4) 내용에 맞춰 잘라 정사각형으로 앉힌다.
import sharp from "sharp";

const [, , inPath, outPath, sizeArg] = process.argv;
const SIZE = Number(sizeArg || 1024);

const src = sharp(inPath).ensureAlpha();
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const HARD = 60; // 이 위로는 확실히 배경
const SOFT = 18; // 이 아래로는 확실히 물체
const a = new Uint8Array(W * H);

for (let i = 0, p = 0; i < W * H; i++, p += C) {
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const green = g - Math.max(r, b);
  let al = 255;
  if (green >= HARD) al = 0;
  else if (green > SOFT) al = Math.round(255 * (1 - (green - SOFT) / (HARD - SOFT)));
  a[i] = al;
}

// ── 덩어리 세기 — 잔챙이 버리기 ──
const lab = new Int32Array(W * H).fill(-1);
const sizes = [];
const stack = new Int32Array(W * H);
for (let i = 0; i < W * H; i++) {
  if (a[i] < 24 || lab[i] !== -1) continue;
  const id = sizes.length;
  let n = 0, sp = 0;
  stack[sp++] = i; lab[i] = id;
  while (sp) {
    const q = stack[--sp]; n++;
    const x = q % W, y = (q / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (lab[k] === -1 && a[k] >= 24) { lab[k] = id; stack[sp++] = k; }
    }
  }
  sizes.push(n);
}
const biggest = Math.max(...sizes);
const keep = sizes.map((n) => n >= biggest * 0.02); // 2% 미만은 버린다
for (let i = 0; i < W * H; i++) if (lab[i] >= 0 && !keep[lab[i]]) a[i] = 0;

// ── 초록 물듦 빼기 + 알파 쓰기 ──
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let i = 0, p = 0; i < W * H; i++, p += C) {
  const al = a[i];
  data[p + 3] = al;
  if (al === 0) { data[p] = data[p + 1] = data[p + 2] = 0; continue; }
  const r = data[p], g = data[p + 1], b = data[p + 2];
  const cap = Math.max(r, b) + 6;
  if (g > cap) data[p + 1] = cap;
  const x = i % W, y = (i / W) | 0;
  if (al > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}

const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

// 내용만 오려 낸 뒤, 정사각 판 한가운데에 앉힌다.
// (extend → extract 를 한 파이프에서 하면 sharp 가 extract 를 먼저 걸어
//  범위를 벗어난다 — 그래서 오리고, 줄이고, 늘리는 세 걸음으로 나눈다.)
const inner = Math.round(SIZE * 0.9);
const body = await sharp(data, { raw: { width: W, height: H, channels: C } })
  .extract({ left: x0, top: y0, width: bw, height: bh })
  .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
  .png()
  .toBuffer();
const got = await sharp(body).metadata();
const padX = Math.round((SIZE - (got.width ?? inner)) / 2);
const padY = Math.round((SIZE - (got.height ?? inner)) / 2);

await sharp(body)
  .extend({
    top: padY,
    bottom: SIZE - (got.height ?? inner) - padY,
    left: padX,
    right: SIZE - (got.width ?? inner) - padX,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(outPath, `bbox ${bw}x${bh}`, `㔼ㅣㅡㄱㅣ ${sizes.length}ㄱㅐ ㅈㅞㅇ ${keep.filter(Boolean).length}ㄱㅐ ㄴㅏㅁㄱㅵ`);
