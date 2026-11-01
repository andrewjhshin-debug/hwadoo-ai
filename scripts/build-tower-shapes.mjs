// Derive collision metadata from the generated atlas; never changes image pixels.
import fs from "node:fs";
import sharp from "sharp";
const source = "public/obj/stone-cairn-atlas-v6.png";
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;
if (w !== h) throw new Error("Expected square atlas");
// Derive each sprite's region from its connected outline, not a fixed cell size.
const visited = new Uint8Array(w*h), pending = new Int32Array(w*h), components = [];
for(let p=0;p<w*h;p++) {
  if(visited[p] || data[p*4+3]<120) continue;
  let head=0,end=1;pending[0]=p;visited[p]=1;
  let x0=w,y0=h,x1=0,y1=0;
  while(head<end) {
    const v=pending[head++],x=v%w,y=Math.floor(v/w);
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    for(const n of [x>0?v-1:-1,x<w-1?v+1:-1,y>0?v-w:-1,y<h-1?v+w:-1])
      if(n>=0&&!visited[n]&&data[n*4+3]>=120){visited[n]=1;pending[end++]=n;}
  }
  if(end>2000)components.push({crop:[x0,y0,x1-x0+1,y1-y0+1]});
}
if(components.length!==9)throw new Error(`Expected nine stones, found ${components.length}`);
components.sort((a,b)=>(a.crop[1]+a.crop[3]/2)-(b.crop[1]+b.crop[3]/2));
const regions=[];
for(let row=0;row<3;row++)regions.push(...components.slice(row*3,row*3+3).sort((a,b)=>a.crop[0]-b.crop[0]).map(c=>c.crop));
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
const metadata = fs.readFileSync(metadataPath, "utf8").replace(/ATLAS_SIZE = \d+/, `ATLAS_SIZE = ${w}`).replace(/crop: \[[^\]]+\]/g, () => `crop: [${out[cropIndex++].crop.join(",")}]`);
if (cropIndex !== 9) throw new Error("Expected exactly nine crop definitions");
fs.writeFileSync(metadataPath, metadata);
console.log(JSON.stringify(out.map(s=>s.crop)));
