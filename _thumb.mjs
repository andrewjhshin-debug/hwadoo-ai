import { dec, enc } from './_png.mjs';
import fs from 'fs';
const D='C:/Users/user/Downloads/';
const OUT='C:/Users/user/AppData/Local/Temp/claude/C--Users-user-Desktop-HWADU-AI/4c3b5ee6-ca90-40f0-ba5d-b59cc92e7cde/scratchpad/';
const files = fs.readdirSync(D).filter(f=>/^Gemini_Generated_Image.*\.png$/.test(f))
  .map(f=>({f, t:fs.statSync(D+f).mtimeMs})).sort((a,b)=>b.t-a.t).slice(0,10).map(x=>x.f);
const W=210;
// 한 장에 10 칸
const cols=5, rows=2, CH=Math.round(W*1.35);
const sheet={w:W*cols,h:CH*rows,d:Buffer.alloc(W*cols*CH*rows*4,0)};
for(let k=0;k<files.length;k++){
  const im=dec(D+files[k]); const sx=im.w/W, sy=im.h/CH;
  const ox=(k%cols)*W, oy=Math.floor(k/cols)*CH;
  for(let y=0;y<CH;y++)for(let x=0;x<W;x++){
    const s=((Math.min(im.h-1,Math.floor(y*sy)))*im.w+Math.min(im.w-1,Math.floor(x*sx)))*4;
    const t=((oy+y)*sheet.w+(ox+x))*4;
    sheet.d[t]=im.d[s];sheet.d[t+1]=im.d[s+1];sheet.d[t+2]=im.d[s+2];sheet.d[t+3]=255;}
  console.log(k, files[k], `${im.w}x${im.h}`);
}
enc(OUT+'thumbs.png', sheet);
