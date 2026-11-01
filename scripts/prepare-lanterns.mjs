// Mechanical crop/registration only; all artwork comes from ImageGen.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const input=process.argv[2];
if(!input)throw Error('Usage: node scripts/prepare-lanterns.mjs source.png');
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const names=['pink','gold','mint'];
await fs.mkdir('design/lanterns',{recursive:true});
await fs.mkdir('public/obj/lotus-lantern-v1',{recursive:true});
await fs.copyFile(input,'design/lanterns/source-v1.png');
for(let column=0;column<3;column++) {
  const left=Math.floor(column*info.width/3),right=Math.floor((column+1)*info.width/3);
  const seen=new Uint8Array(info.width*info.height),queue=new Int32Array(seen.length);
  let best=[];
  for(let y=0;y<info.height;y++)for(let x=left;x<right;x++) {
    const p=y*info.width+x;if(seen[p]||data[p*4+3]<32)continue;
    let head=0,end=1;queue[0]=p;seen[p]=1;
    while(head<end){const v=queue[head++],xx=v%info.width,yy=Math.floor(v/info.width);
      for(const n of [xx>left?v-1:-1,xx<right-1?v+1:-1,yy>0?v-info.width:-1,yy<info.height-1?v+info.width:-1])
        if(n>=0&&!seen[n]&&data[n*4+3]>=32){seen[n]=1;queue[end++]=n;}}
    if(end>best.length)best=Array.from(queue.subarray(0,end));
  }
  if(best.length<10000)throw Error(`Missing ${names[column]} lantern`);
  const clean=Buffer.alloc(data.length);let x0=info.width,y0=info.height,x1=0,y1=0;
  for(const p of best){data.copy(clean,p*4,p*4,p*4+4);const x=p%info.width,y=Math.floor(p/info.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const sprite=await sharp(clean,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(288,320,{fit:'contain',background:'#00000000'}).png().toBuffer();
  await sharp({create:{width:320,height:352,channels:4,background:'#00000000'}}).composite([{input:sprite,left:16,top:16}]).webp({quality:94,alphaQuality:100}).toFile(`public/obj/lotus-lantern-v1/${names[column]}.webp`);
}
console.log('Registered three 320×352 lanterns');
