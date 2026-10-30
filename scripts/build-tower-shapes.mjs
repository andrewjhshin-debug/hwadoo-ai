// Derive collision metadata from the generated atlas; never changes image pixels.
import fs from "node:fs";
import sharp from "sharp";
const source = "public/obj/stone-cairn-atlas-v5.png";
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
const regions = [[0,0,452,450],[452,0,451,450],[903,0,351,450],[0,450,452,400],[452,450,452,400],[904,450,350,400],[0,850,474,404],[474,850,360,404],[834,850,420,404]];
if (w !== 1254 || h !== 1254) throw new Error("Atlas dimensions changed; inspect regions before deriving metadata.");
const out = [];
for (const [rx, ry, rw, rh] of regions) {
  const seen = new Uint8Array(w * h), queue = new Int32Array(rw * rh);
  let best = [];
  for (let y = ry; y < Math.min(h, ry + rh); y++) for (let x = rx; x < Math.min(w, rx + rw); x++) {
    const p = y * w + x;
    if (seen[p] || data[p * 4 + 3] < 120) continue;
    let head = 0, end = 1; queue[0] = p; seen[p] = 1;
    while (head < end) {
      const v = queue[head++], xx = v % w, yy = Math.floor(v / w);
      for (const u of [xx > rx ? v - 1 : -1, xx < rx + rw - 1 ? v + 1 : -1, yy > ry ? v - w : -1, yy < Math.min(h, ry + rh) - 1 ? v + w : -1]) {
        if (u >= 0 && !seen[u] && data[u * 4 + 3] >= 120) { seen[u] = 1; queue[end++] = u; }
      }
    }
    if (end > best.length) best = Array.from(queue.subarray(0, end));
  }
  if (best.length < 2000) throw new Error("Missing rock component");
  let x0=w, y0=h, x1=0, y1=0;
  for (const p of best) { const x=p%w,y=Math.floor(p/w); x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); }
  const width=x1-x0+1,height=y1-y0+1,N=128,top=Array(N).fill(Infinity),bottom=Array(N).fill(-Infinity);
  for (const p of best) { const x=p%w,y=Math.floor(p/w),i=Math.min(N-1,Math.floor((x-x0)/width*N));top[i]=Math.min(top[i],(y-y0)/height);bottom[i]=Math.max(bottom[i],(y-y0+1)/height); }
  if (top.some(v=>!Number.isFinite(v))) throw new Error("Empty silhouette column");
  out.push({ crop:[x0,y0,width,height], top:top.map(v=>+v.toFixed(4)), bottom:bottom.map(v=>+v.toFixed(4)) });
}
fs.writeFileSync("src/lib/tower-shapes.json", JSON.stringify(out));
// Mechanical atlas-coordinate refresh, preserving all gameplay metadata.
let cropIndex = 0;
const metadataPath = "src/lib/tower-balance.ts";
const metadata = fs.readFileSync(metadataPath, "utf8").replace(/crop: \[[^\]]+\]/g, () => `crop: [${out[cropIndex++].crop.join(",")}]`);
if (cropIndex !== 9) throw new Error("Expected exactly nine crop definitions");
fs.writeFileSync(metadataPath, metadata);
console.log(JSON.stringify(out.map(s=>s.crop)));
