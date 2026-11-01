// Mechanical sprite registration only. ImageGen supplies all creative artwork.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const [input,name]=process.argv.slice(2);
if(!input||!/^bowl-[a-z]+-v\d+$/.test(name??''))throw Error('Usage: source.png bowl-name-v1');
const template=await sharp('public/obj/bowl.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
let x0=template.info.width,y0=template.info.height,x1=0,y1=0;
for(let y=0;y<template.info.height;y++)for(let x=0;x<template.info.width;x++)if(template.data[(y*template.info.width+x)*4+3]>=128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const seen=new Uint8Array(info.width*info.height),queue=new Int32Array(seen.length),clean=Buffer.alloc(data.length);
let a=info.width,b=info.height,c=0,d=0,parts=0;
for(let p=0;p<seen.length;p++){
 if(seen[p]||data[p*4+3]<64)continue;
 let head=0,end=1;seen[p]=1;queue[0]=p;
 while(head<end){const v=queue[head++],x=v%info.width,y=Math.floor(v/info.width);for(const n of [x>0?v-1:-1,x<info.width-1?v+1:-1,y>0?v-info.width:-1,y<info.height-1?v+info.width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=64){seen[n]=1;queue[end++]=n;}}
 if(end<500)continue;parts++;
 for(let i=0;i<end;i++){const v=queue[i],x=v%info.width,y=Math.floor(v/info.width);data.copy(clean,v*4,v*4,v*4+4);a=Math.min(a,x);c=Math.max(c,x);b=Math.min(b,y);d=Math.max(d,y);}
}
if(!parts)throw Error('No bowl artwork found');
const targetWidth=x1-x0+1,targetHeight=y1-y0+1;
const sprite=await sharp(clean,{raw:info}).extract({left:a,top:b,width:c-a+1,height:d-b+1}).resize(targetWidth,targetHeight,{fit:'contain',background:'#00000000'}).png().toBuffer();
await fs.mkdir('design/singing-bowls',{recursive:true});
await fs.copyFile(input,`design/singing-bowls/${name}-source.png`);
await sharp({create:{width:template.info.width,height:template.info.height,channels:4,background:'#00000000'}}).composite([{input:sprite,left:x0,top:y0}]).webp({quality:94,alphaQuality:100}).toFile(`public/obj/${name}.webp`);
console.log(`public/obj/${name}.webp: ${template.info.width}x${template.info.height}, same original display box`);
