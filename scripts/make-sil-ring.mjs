// 오색실 사진을 고리(팔찌)로 말아 머리 아이콘용 그림을 굽는다 — 극좌표 변환.
// 실행: node scripts/make-sil-ring.mjs  → public/obj/sil-ring-{sae,baram,seong,cut}.webp
import sharp from "sharp";
const S = 192, R1 = 95, R0 = 30, TILE = 1; // 바깥·안쪽 반지름, 실 사진을 몇 번 이어 한 바퀴를 채우나
for (const n of ["sae", "baram", "seong", "cut"]) {
  const { data, info } = await sharp(`public/obj/sil-${n}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = (x, y) => { // 가장자리는 투명, 가로는 이어 붙임
    x = ((Math.floor(x) % W) + W) % W; y = Math.floor(y);
    if (y < 0 || y >= H) return [0, 0, 0, 0];
    const i = (y * W + x) * 4; const a = data[i + 3] / 255;
    return [data[i] * a, data[i + 1] * a, data[i + 2] * a, a];
  };
  const out = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2, r = Math.hypot(dx, dy);
    if (r < R0 || r > R1) continue;
    const th = (Math.atan2(dy, dx) + Math.PI * 1.5) % (Math.PI * 2); // 위에서 시계방향
    const u = (th / (Math.PI * 2)) * W * TILE, v = ((r - R0) / (R1 - R0)) * (H - 1);
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
    const c = [0, 0, 0, 0];
    for (const [ox, oy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
      const p = px(x0 + ox, y0 + oy); for (let k = 0; k < 4; k++) c[k] += p[k] * w;
    }
    const a = c[3], i = (y * S + x) * 4;
    if (a > 0.003) { out[i] = c[0] / a; out[i + 1] = c[1] / a; out[i + 2] = c[2] / a; out[i + 3] = a * 255; }
  }
  await sharp(out, { raw: { width: S, height: S, channels: 4 } }).webp({ quality: 90, alphaQuality: 100 }).toFile(`public/obj/sil-ring-${n}.webp`);
}
console.log("ok");
