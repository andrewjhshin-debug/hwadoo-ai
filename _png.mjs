import fs from 'fs'; import zlib from 'zlib';
export function dec(p){
  const b=fs.readFileSync(p); let i=8,w=0,h=0,bd=0,ct=0,idat=[];
  while(i<b.length){const len=b.readUInt32BE(i),t=b.toString('ascii',i+4,i+8);
    if(t==='IHDR'){w=b.readUInt32BE(i+8);h=b.readUInt32BE(i+12);bd=b[i+16];ct=b[i+17];}
    if(t==='IDAT')idat.push(b.subarray(i+8,i+8+len)); i+=12+len;}
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const ch=ct===6?4:ct===2?3:ct===4?2:1, bpp=ch, stride=w*bpp;
  const out=Buffer.alloc(w*h*4); let prev=Buffer.alloc(stride),o=0;
  for(let y=0;y<h;y++){const f=raw[o++];const line=Buffer.from(raw.subarray(o,o+stride));o+=stride;
    for(let x=0;x<stride;x++){const a=x>=bpp?line[x-bpp]:0,bb=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=line[x];
      if(f===1)v+=a;else if(f===2)v+=bb;else if(f===3)v+=(a+bb)>>1;else if(f===4){const p2=a+bb-c,pa=Math.abs(p2-a),pb=Math.abs(p2-bb),pc=Math.abs(p2-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?bb:c);}
      line[x]=v&255;}
    prev=line;
    for(let x=0;x<w;x++){const s=x*ch,d=(y*w+x)*4;
      if(ch===4){out[d]=line[s];out[d+1]=line[s+1];out[d+2]=line[s+2];out[d+3]=line[s+3];}
      else if(ch===3){out[d]=line[s];out[d+1]=line[s+1];out[d+2]=line[s+2];out[d+3]=255;}
      else {out[d]=out[d+1]=out[d+2]=line[s];out[d+3]=ch===2?line[s+1]:255;}}}
  return {w,h,d:out};
}
export function enc(p,im){
  const {w,h,d}=im, stride=w*4, raw=Buffer.alloc((stride+1)*h);
  for(let y=0;y<h;y++){ raw[y*(stride+1)]=0; d.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride); }
  const T=[...Array(256)].map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=T[(c^x)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
  const ck=(t,dd)=>{const L=Buffer.alloc(4);L.writeUInt32BE(dd.length);const body=Buffer.concat([Buffer.from(t,'ascii'),dd]);const C=Buffer.alloc(4);C.writeUInt32BE(crc(body));return Buffer.concat([L,body,C]);};
  const ih=Buffer.alloc(13); ih.writeUInt32BE(w,0); ih.writeUInt32BE(h,4); ih[8]=8; ih[9]=6;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ck('IHDR',ih),ck('IDAT',zlib.deflateSync(raw,{level:9})),ck('IEND',Buffer.alloc(0))]));
}
