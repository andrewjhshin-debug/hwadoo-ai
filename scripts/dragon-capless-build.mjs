// 청옥 금룡 그림에서 양 끝 금마개를 지운 판 만들기 — 제미나이로 끝만 고친 그림(_shots/dr/out-N.png)을 원래 칸에 맞춰 붙이고 윤곽을 다시 잰다
import sharp from "sharp";
const ORIG = "_shots/dr/atlas-orig.webp";
const { data: A, info } = await sharp(ORIG).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const AW = info.width, FW = 256, FH = 192;
const FR = [0, 1, 2, 4, 5, 6, 7, 8, 10, 11];
const out = Buffer.from(A);
const masks = {};
const cellMask = (buf, W, ox, oy) => { const m = new Uint8Array(FW * FH); for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) m[y * FW + x] = buf[((oy + y) * W + ox + x) * 4 + 3] > 100 ? 1 : 0; return m; };
for (const f of FR) {
  const ox = (f % 4) * FW, oy = Math.floor(f / 4) * FH;
  const inM = cellMask(A, AW, ox, oy);
  // 흰 바탕 → 알파(금은 파랑 채널이 낮다)
  const { data: G, info: gi } = await sharp(`_shots/dr/out-${f}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const gw = gi.width, gh = gi.height;
  const rgba = Buffer.alloc(gw * gh * 4);
  for (let i = 0; i < gw * gh; i++) {
    const r = G[i * 3], g = G[i * 3 + 1], b = G[i * 3 + 2];
    const mn = Math.min(r, g, b);
    const a = Math.max(0, Math.min(1, ((255 - mn) - 10) / 34));
    const un = c => a > 0.02 ? Math.max(0, Math.min(255, Math.round((c - (1 - a) * 255) / a))) : 0;
    rgba[i * 4] = un(r); rgba[i * 4 + 1] = un(g); rgba[i * 4 + 2] = un(b); rgba[i * 4 + 3] = Math.round(a * 255);
  }
  // 맞춤 — 크기·자리를 바꿔 가며 원래 칸 윤곽과 가장 많이 겹치는 걸 고른다
  let best = { iou: -1 };
  for (let s = 0.86; s <= 1.16; s += 0.01) {
    const w = Math.round(FW * s), h = Math.round(FH * s);
    const small = await sharp(rgba, { raw: { width: gw, height: gh, channels: 4 } }).resize(w, h).raw().toBuffer();
    for (let dx = -24; dx <= 24; dx += 2) for (let dy = -20; dy <= 20; dy += 2) {
      let inter = 0, uni = 0;
      for (let y = 0; y < FH; y += 2) for (let x = 0; x < FW; x += 2) {
        const sx = x - Math.round((FW - w) / 2) - dx, sy = y - Math.round((FH - h) / 2) - dy;
        const o = sx >= 0 && sy >= 0 && sx < w && sy < h && small[(sy * w + sx) * 4 + 3] > 100 ? 1 : 0;
        const i = inM[y * FW + x];
        inter += o & i; uni += o | i;
      }
      const iou = inter / uni;
      if (iou > best.iou) best = { iou, s, dx, dy };
    }
  }
  // 고운 맞춤(1px)
  for (let s = best.s - 0.01; s <= best.s + 0.01; s += 0.005) {
    const w = Math.round(FW * s), h = Math.round(FH * s);
    const small = await sharp(rgba, { raw: { width: gw, height: gh, channels: 4 } }).resize(w, h).raw().toBuffer();
    for (let dx = best.dx - 2; dx <= best.dx + 2; dx++) for (let dy = best.dy - 2; dy <= best.dy + 2; dy++) {
      let inter = 0, uni = 0;
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        const sx = x - Math.round((FW - w) / 2) - dx, sy = y - Math.round((FH - h) / 2) - dy;
        const o = sx >= 0 && sy >= 0 && sx < w && sy < h && small[(sy * w + sx) * 4 + 3] > 100 ? 1 : 0;
        const i = inM[y * FW + x]; inter += o & i; uni += o | i;
      }
      const iou = inter / uni; if (iou > best.iou) best = { iou, s, dx, dy };
    }
  }
  const w = Math.round(FW * best.s), h = Math.round(FH * best.s);
  const small = await sharp(rgba, { raw: { width: gw, height: gh, channels: 4 } }).resize(w, h, { kernel: "lanczos3" }).raw().toBuffer();
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const sx = x - Math.round((FW - w) / 2) - best.dx, sy = y - Math.round((FH - h) / 2) - best.dy;
    const j = ((oy + y) * AW + ox + x) * 4;
    if (sx >= 0 && sy >= 0 && sx < w && sy < h) { const k = (sy * w + sx) * 4; out[j] = small[k]; out[j + 1] = small[k + 1]; out[j + 2] = small[k + 2]; out[j + 3] = small[k + 3]; }
    else out[j + 3] = 0;
  }
  console.log(f, "iou", best.iou.toFixed(3), "s", best.s.toFixed(3), best.dx, best.dy);
}
await sharp(out, { raw: { width: AW, height: info.height, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile("public/obj/jade-dragon-mala-v1/gold-dragon-turntable.webp");
// 새 그림의 윤곽 수치 — HALF_WIDTH · HALF_HEIGHT · OUTLINE(15°마다, 오른쪽부터 시계방향)
const HW = [], HH = [], OL = [];
for (let f = 0; f < 12; f++) {
  const ox = (f % 4) * FW, oy = Math.floor(f / 4) * FH;
  const m = cellMask(out, AW, ox, oy);
  let hw = 0, hh = 0;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (m[y * FW + x]) { hw = Math.max(hw, Math.abs(x + 0.5 - 128)); hh = Math.max(hh, Math.abs(y + 0.5 - 96)); }
  HW.push(Math.round(hw)); HH.push(Math.round(hh));
  const rs = [];
  for (let k = 0; k < 24; k++) { const t = k * 15 * Math.PI / 180; let r = 0; for (let d = 0; d < 140; d += 0.5) { const x = Math.round(128 + d * Math.cos(t)), y = Math.round(96 + d * Math.sin(t)); if (x >= 0 && y >= 0 && x < FW && y < FH && m[y * FW + x]) r = d; } rs.push(Math.round(r)); }
  OL.push(rs);
}
console.log("HALF_WIDTH", JSON.stringify(HW)); console.log("HALF_HEIGHT", JSON.stringify(HH));
console.log("OUTLINE", JSON.stringify(OL));
