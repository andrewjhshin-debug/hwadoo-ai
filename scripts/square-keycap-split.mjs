// 사각 키캡 누름 그림 굽기 — node scripts/square-keycap-split.mjs (원본 square-keycap-v2.webp → 키별·그 키 뺀 원본·바닥 판)
import sharp from "sharp";
const src = "public/obj/practice-collection-v1/square-keycap-v2.webp";
const outDir = "public/obj/practice-collection-v1/";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
// 키 바탕색 — 판에서 흔한 자리를 골라 잰다
const ref = { 0: px(90, 120), 1: px(285, 205), 2: px(90, 420), 3: px(450, 420) };
console.log(JSON.stringify(ref));
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
// 세로 솔기(좌우) — 각 행에서 x=200..310 사이 가장 어두운 열
const seamX = new Array(H).fill(256);
for (let y = 0; y < H; y++) { let best = 1e9, bx = 256; for (let x = 220; x < 300; x++) { const p = px(x, y); if (p[3] < 30) continue; const l = p[0] + p[1] + p[2]; if (l < best) { best = l; bx = x; } } seamX[y] = bx; }
// 가로 경계(위/아래) — 각 열에서 위·아래 키 사이 그늘진 틈(가장 어두운 줄). 매듭 무늬(y>=255)는 피한다
const rowB = new Array(W).fill(232);
for (let x = 0; x < W; x++) {
  const face = (x > 95 && x < 235) || (x > 290 && x < 430);
  const y0 = 205, y1 = face ? 250 : 278;
  let best = 1e9, by = 232;
  for (let y = y0; y < y1; y++) { const p = px(x, y); if (p[3] < 30) continue; const l = p[0] + p[1] + p[2]; if (l < best) { best = l; by = y; } }
  rowB[x] = by;
}
// 들쑥날쑥 고르기(중앙값)
const med = (arr, i, r) => { const s = arr.slice(Math.max(0, i - r), i + r + 1).sort((a, b) => a - b); return s[s.length >> 1]; };
const avg = (arr, i, r) => { let t = 0, n = 0; for (let k = Math.max(0, i - r); k <= Math.min(arr.length - 1, i + r); k++) { t += arr[k]; n++; } return t / n; };
const rowM = rowB.map((_, i) => med(rowB, i, 12)), seamM = seamX.map((_, i) => med(seamX, i, 12));
const rowS = rowM.map((_, i) => avg(rowM, i, 8)), seamS = seamM.map((_, i) => avg(seamM, i, 8));
// 경계는 한 줄로 딱 자르지 않고 1.5px 에 걸쳐 녹인다 — 계단(깨짐)이 안 보이게
// 좌우 경계는 줄이 키 모서리(둥근 귀)를 다 못 따라간다 — 솔기 ±9px 안은 그 줄 양옆 색 중 가까운 쪽 키로 보낸다
const colR = new Float32Array(W * H).fill(-1);
let lastG = 0, lastGy = -99;
for (let y = 0; y < H; y++) {
  const sx = Math.round(seamS[y]);
  let L = px(Math.max(0, sx - 11), y), R = px(Math.min(W - 1, sx + 11), y);
  // 키 사이가 비어 있는 줄(맨 위·맨 아래 귀)은 그 줄 양옆 대신 키 바탕색과 견준다
  if (L[3] < 200) L = y < 232 ? ref[0] : ref[2];
  if (R[3] < 200) R = y < 232 ? ref[1] : ref[3];
  // 두 키 사이에 빈틈이 보이는 줄이면 그 틈이 곧 경계다 — 틈 왼쪽은 왼쪽 키, 오른쪽은 오른쪽 키
  let gx = 0, gn = 0;
  for (let x = sx - 12; x <= sx + 12; x++) if (px(x, y)[3] < 30) { gx += x; gn++; }
  if (gn) { lastG = gx / gn; lastGy = y; }
  // 틈이 막 닫힌 아래 몇 줄도 같은 경계로 — 거기서 색으로 가르면 한두 점이 엉뚱한 키로 붙는다
  if (gn || (lastGy >= 0 && Math.abs(y - lastGy) <= 10)) { const g = lastG; for (let x = sx - 14; x <= sx + 14; x++) colR[y * W + x] = x < g ? 0 : 1; continue; }
  for (let x = sx - 9; x <= sx + 9; x++) {
    const p = px(x, y); if (p[3] < 30) continue;
    const dl = Math.sqrt(d2(p, L)), dr = Math.sqrt(d2(p, R));
    if (Math.min(dl, dr) < 0.4 * Math.max(dl, dr)) colR[y * W + x] = dl < dr ? 0 : 1;
  }
}
const share = (x, y) => {
  const b = Math.max(0, Math.min(1, (y - rowS[x] + 0.75) / 1.5));      // 아래 키 몫
  const c = colR[y * W + x];
  const r = c >= 0 ? c : Math.max(0, Math.min(1, (x - seamS[y] + 0.75) / 1.5));     // 오른쪽 키 몫
  return [(1 - b) * (1 - r), (1 - b) * r, b * (1 - r), b * r];
};
const wells = { 2: [240, 216, 182], 3: [222, 182, 222] }; // 위 키 앞 옆면을 키 색으로 녹인 뒤의 빛
for (let k = 0; k < 4; k++) {
  const out = Buffer.from(data);
  const well = wells[k] ? Buffer.from(data) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = Math.round(data[i + 3] * share(x, y)[k]);
    out[i + 3] = a;
    // 비는 자리엔 바로 위 키 앞 옆면을 **그 열 그대로** 이어 내린다(틈 3줄 위 빛) — 한 색으로 칠하면 키 모양 띠가 떴다(형: 「번지지 말라」)
    // 판은 비는 띠(경계 ~ 경계+내려앉는 폭)에만 — 키 바깥 옆선까지 깔면 그늘색 줄이 선다
    if (well && y > rowS[x] + 12) { well[i + 3] = 0; continue; }
    if (well) { let a2 = a; for (let dy = 1; dy <= 3 && y + dy < H; dy++) a2 = Math.max(a2, Math.round(data[i + dy * W * 4 + 3] * share(x, y + dy)[k])); const yy = Math.max(0, Math.round(rowS[x]) - 3), j = (yy * W + x) * 4; well[i] = data[j]; well[i + 1] = data[j + 1]; well[i + 2] = data[j + 2]; well[i + 3] = Math.min(255, a2 * 4); } // 바닥 판은 그 키보다 3px 위까지 — 바탕에 남은 키 테두리를 덮는다(판을 바탕 위에 깐다) // 가장자리 반투명이 겹쳐 흰 테가 비치지 않게 바닥 판은 진하게
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(outDir + `square-keycap-${k}.webp`);
  // 그 키만 뺀 원본 — 평소엔 원본 한 장(이음매 0), 누를 때만 이것 + 그 키 한 장으로 바꿔 끼운다
  const base = Buffer.from(data);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; base[i + 3] = Math.round(data[i + 3] * (1 - share(x, y)[k])); }
  await sharp(base, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(outDir + `square-keycap-without-${k}.webp`);
  if (well) await sharp(well, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 90, alphaQuality: 100 }).toFile(outDir + `square-keycap-well-${k}.webp`);
}
console.log("rows", rowS.filter((_, i) => i % 32 === 0).join(","), "seam", seamS.filter((_, i) => i % 32 === 0).join(","));
