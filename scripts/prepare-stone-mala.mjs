// Mechanical sprite preparation only: isolate, crop and register generated art to the existing model.
import fs from 'node:fs';
import sharp from 'sharp';
const input=process.argv[2];
const material=process.argv[3] === 'wood' ? 'wood' : 'stone';
if(!input)throw Error('Pass the ImageGen two-cell source PNG path');
fs.copyFileSync(input,`public/obj/bead-${material}-source-v1.png`);
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const cell=Math.floor(info.width/2), outputs=[`public/obj/bead-${material}-one-v1.png`,`public/obj/bead-${material}-one-gold-v1.png`];
const template=await sharp('public/obj/bead-paw-one.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const mask=Buffer.alloc(920*920*4);
for(let i=0;i<920*920;i++){mask[i*4]=mask[i*4+1]=mask[i*4+2]=255;mask[i*4+3]=template.data[i*4+3];}
const maskPng=await sharp(mask,{raw:{width:920,height:920,channels:4}}).png().toBuffer();
for(let half=0;half<2;half++){
 const seen=new Uint8Array(info.width*info.height),queue=new Int32Array(cell*info.height);let best=[];
 const startX=half*cell,endX=(half+1)*cell;
 for(let y=0;y<info.height;y++)for(let x=startX;x<endX;x++){
  const p=y*info.width+x;if(seen[p]||data[p*4+3]<128)continue;
  let head=0,end=1;queue[0]=p;seen[p]=1;
  while(head<end){const v=queue[head++],xx=v%info.width,yy=Math.floor(v/info.width);for(const n of [xx>startX?v-1:-1,xx<endX-1?v+1:-1,yy>0?v-info.width:-1,yy<info.height-1?v+info.width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=128){seen[n]=1;queue[end++]=n;}}
  if(end>best.length)best=Array.from(queue.subarray(0,end));
 }
 if(best.length<10000)throw Error('Missing main bead component');
 let x0=info.width,y0=info.height,x1=0,y1=0;const keep=new Uint8Array(info.width*info.height);
 for(const p of best){keep[p]=1;const x=p%info.width,y=Math.floor(p/info.width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const clean=Buffer.from(data);for(let p=0;p<keep.length;p++)if(!keep[p])clean[p*4+3]=0;
 const bead=await sharp(clean,{raw:{width:info.width,height:info.height,channels:4}}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).resize(806,806,{fit:'fill'}).png().toBuffer();
 await sharp({create:{width:920,height:920,channels:4,background:'#00000000'}}).composite([{input:bead,left:57,top:57}]).png().toBuffer().then(png=>sharp(png).composite([{input:maskPng,blend:'dest-in'}]).png().toFile(outputs[half]));
 console.log(outputs[half]);
}
