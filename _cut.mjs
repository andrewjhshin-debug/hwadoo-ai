import { dec, enc } from './_png.mjs';
const D='C:/Users/user/Downloads/';
const OUT='C:/Users/user/AppData/Local/Temp/claude/C--Users-user-Desktop-HWADU-AI/4c3b5ee6-ca90-40f0-ba5d-b59cc92e7cde/scratchpad/';

/** 초록을 **빛깔(hue)로** 뺀다 — 초록 채널로 재면 살구빛 초가 올리브가 된다 */
export function chroma(im){
  const {w,h,d}=im;
  for(let i=0;i<w*h;i++){
    const r=d[i*4],g=d[i*4+1],b=d[i*4+2];
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b), c=mx-mn;
    if(c<26 || mx!==g){ continue; }            // 무채색이거나 초록이 으뜸이 아니면 둔다
    let hdeg=60*(((b-r)/c)+2);                 // g 가 으뜸일 때의 색상
    const sat=mx?c/mx:0;
    if(hdeg>=72 && hdeg<=168 && sat>0.34){
      d[i*4+3]=0;
    } else if(hdeg>=60 && hdeg<=186 && sat>0.16){
      // 가장자리 — 반투명으로 두고 초록기만 깎는다(despill)
      d[i*4+3]=Math.round(d[i*4+3]*0.45);
      d[i*4+1]=Math.round((r+b)/2);
    }
  }
  // 남은 초록기 죽이기 — g 가 r·b 평균보다 튀면 눌러 준다
  for(let i=0;i<w*h;i++){ if(!d[i*4+3])continue;
    const r=d[i*4],g=d[i*4+1],b=d[i*4+2], m=(r+b)/2;
    if(g>m+12) d[i*4+1]=Math.round(m+12);
  }
  return im;
}
export function crop(im,x0,y0,x1,y1){
  const w=x1-x0, h=y1-y0, d=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++) im.d.copy(d, y*w*4, ((y0+y)*im.w+x0)*4, ((y0+y)*im.w+x1)*4);
  return {w,h,d};
}
export function trim(im,th=8){
  const {w,h,d}=im; let x0=w,x1=-1,y0=h,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3]>th){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; y1=y; } }
  if(x1<0) return im;
  return crop(im,x0,y0,x1+1,y1+1);
}
if (process.argv[1].endsWith('_cut.mjs')) {
  // 2x2 판을 넷으로 갈라 어디에 무엇이 있나 본다
  for (const f of ['l0mezul0mezul0me','c7y73vc7y73vc7y7']) {
    const im=dec(D+`Gemini_Generated_Image_${f}.png`);
    const hw=im.w>>1, hh=im.h>>1;
    const 칸=[['lt',0,0,hw,hh],['rt',hw,0,im.w,hh],['lb',0,hh,hw,im.h],['rb',hw,hh,im.w,im.h]];
    for (const [n,a,b,c,e] of 칸){
      const q=trim(chroma(crop(im,a,b,c,e)));
      enc(OUT+`q-${f.slice(0,6)}-${n}.png`, q);
      console.log(f.slice(0,6), n, `${q.w}x${q.h}`);
    }
  }
}
