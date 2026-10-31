// Mechanical extraction and registration of ImageGen sprites; artwork stays untouched.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const [input, material] = process.argv.slice(2);
if (!input || !['stone','zodiac'].includes(material)) throw Error('Usage: source.png stone|zodiac');
const cols = material === 'stone' ? 3 : 4, rows = 3;
const folder = `public/obj/mala-${material}-v3`;
await fs.mkdir(folder, {recursive:true});
await fs.copyFile(input, `${folder}/source.png`);
const {data,info:{width,height}} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const seen=new Uint8Array(width*height), queue=new Int32Array(width*height), parts=[];
for(let p=0;p<seen.length;p++) {
  if(seen[p]||data[p*4+3]<128)continue;
  let head=0,end=1,x0=width,y0=height,x1=0,y1=0;queue[0]=p;seen[p]=1;
  while(head<end){const v=queue[head++],x=v%width,y=Math.floor(v/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    for(const n of [x>0?v-1:-1,x<width-1?v+1:-1,y>0?v-width:-1,y<height-1?v+width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=128){seen[n]=1;queue[end++]=n;}}
  if(end>10000)parts.push({x0,y0,x1,y1,size:end,pixels:Array.from(queue.subarray(0,end))});
}
parts.sort((a,b)=>b.size-a.size);parts.splice(cols*rows);parts.sort((a,b)=>a.y0-b.y0);
if(parts.length!==cols*rows)throw Error(`Expected ${cols*rows} separate beads, found ${parts.length}`);
for(let row=0;row<rows;row++)parts.splice(row*cols,cols,...parts.slice(row*cols,(row+1)*cols).sort((a,b)=>a.x0-b.x0));
const template=await sharp('public/obj/bead-paw-one.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const mask=Buffer.alloc(920*920*4,255);for(let p=0;p<920*920;p++)mask[p*4+3]=template.data[p*4+3];
const maskPng=await sharp(mask,{raw:{width:920,height:920,channels:4}}).png().toBuffer();
for (let i=0;i<cols*rows;i++) {
  const part=parts[i], clean=Buffer.alloc(data.length);for(const p of part.pixels)data.copy(clean,p*4,p*4,p*4+4);
  const cell=await sharp(clean,{raw:{width,height,channels:4}}).extract({left:part.x0,top:part.y0,width:part.x1-part.x0+1,height:part.y1-part.y0+1}).png().toBuffer();
  // Identical 920px canvas and 806px diameter to preserve the existing ring footprint.
  const bead=await sharp(cell).resize(806,806,{fit:'fill'}).png().toBuffer();
  const canvas=await sharp({create:{width:920,height:920,channels:4,background:'#00000000'}}).composite([{input:bead,left:57,top:57}]).png().toBuffer();
  await sharp(canvas).composite([{input:maskPng,blend:'dest-in'}]).webp({quality:92,alphaQuality:100}).toFile(`${folder}/${i}.webp`);
}
console.log(`${folder}: ${cols*rows} registered sprites`);
