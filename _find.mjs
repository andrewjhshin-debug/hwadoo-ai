import { dec } from './_png.mjs';
const D='C:/Users/user/Downloads/';
for (const f of ['Gemini_Generated_Image_c7y73vc7y73vc7y7.png','Gemini_Generated_Image_v5avtsv5avtsv5av.png','Gemini_Generated_Image_l0mezul0mezul0me.png','Gemini_Generated_Image_4wgncw4wgncw4wgn.png','Gemini_Generated_Image_mzamsamzamsamzam.png']) {
  try{
    const im = dec(D+f); const {w,h,d}=im;
    // 가운데 십자(흰 띠)가 있나 — 2x2 판인지 본다
    const at=(x,y)=>{const i=(y*w+x)*4;return [d[i],d[i+1],d[i+2]];};
    const mid = at(w>>1, 40), q = (qx,qy)=>at(Math.round(w*qx), Math.round(h*qy));
    console.log(f.slice(22,30), `${w}x${h}`, '가운데세로', mid.join(','),
      '| 좌상', q(.25,.2).join(','), '우상', q(.75,.2).join(','), '좌하', q(.25,.72).join(','), '우하', q(.75,.72).join(','));
  }catch(e){ console.log(f.slice(22,30),'X',e.message); }
}
