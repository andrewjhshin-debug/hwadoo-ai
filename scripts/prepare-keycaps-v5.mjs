import fs from 'node:fs/promises';
import sharp from 'sharp';
// Sprite export only: isolate the main generated alpha island and normalize its canvas.
async function object(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Uint8Array(info.width * info.height), queue = new Int32Array(seen.length);
  let best = [];
  for (let p = 0; p < seen.length; p++) {
    if (seen[p] || data[p * 4 + 3] < 32) continue;
    let head = 0, end = 1; queue[0] = p; seen[p] = 1;
    while (head < end) {
      const at = queue[head++], x = at % info.width;
      for (const next of [x ? at - 1 : -1, x < info.width - 1 ? at + 1 : -1, at - info.width, at + info.width]) {
        if (next < 0 || next >= seen.length || seen[next] || data[next * 4 + 3] < 32) continue;
        seen[next] = 1; queue[end++] = next;
      }
    }
    if (end > best.length) best = Array.from(queue.subarray(0, end));
  }
  if (best.length < 1000) throw Error(`Missing alpha object: ${file}`);
  const keep = new Uint8Array(seen.length);
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (const p of best) {
    const x = p % info.width, y = Math.floor(p / info.width);
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (x + dx >= 0 && x + dx < info.width && y + dy >= 0 && y + dy < info.height) keep[(y + dy) * info.width + x + dx] = 1;
    }
  }
  for (let p = 0; p < keep.length; p++) if (!keep[p]) data[p * 4 + 3] = 0;
  return sharp(data, { raw: info }).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
}




const width=1000,height=1400,dir='public/obj/keycaps-v5';
await fs.mkdir(dir,{recursive:true});
const sheet=await sharp('design/keycaps/v5/cups-source.png').metadata();
const mask=Buffer.from('<svg width="1000" height="1400" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M20 1100Q35 945 65 900Q92 900 145 994Q185 935 230 947Q280 953 340 1040Q420 956 500 960Q580 956 660 1040Q720 953 770 947Q815 935 855 994Q908 900 935 900Q965 945 980 1100L980 1400H20Z"/></svg>');
const geometry=[];
for(const [i,id] of ['dongja','podae','mireuk'].entries()){
 const left=Math.floor(sheet.width*i/3),right=Math.floor(sheet.width*(i+1)/3);
 const column=await sharp('design/keycaps/v5/cups-source.png').extract({left,top:0,width:right-left,height:sheet.height}).png().toBuffer();
 const cup=await sharp(await object(column)).resize(960,660,{fit:'fill'}).png().toBuffer();
 const back=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite([{input:cup,left:20,top:720}]).png().toBuffer();
 const front=await sharp(back).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 await sharp(back).webp({lossless:true}).toFile(dir+'/'+id+'-back.webp');
 await sharp(front).webp({lossless:true}).toFile(dir+'/'+id+'-front.webp');
 const body=await fs.readFile('public/obj/keycaps-'+(id==='podae'?'v4':'v3')+'/'+id+'-body.webp');
 await fs.writeFile(dir+'/'+id+'-body.webp',body);
 for(const [name,shift] of [['rest',0],['pressed',112]]){
  const shifted=await sharp(body).extract({left:0,top:0,width,height:height-shift}).extend({top:shift,bottom:0,left:0,right:0,background:'#00000000'}).png().toBuffer();
  const joined=await sharp(back).composite([{input:shifted},{input:front}]).png().toBuffer();
  await sharp(joined).resize(400,560).png().toFile('design/keycaps/v5/'+id+'-'+name+'.png');
 }
 geometry.push({id,canvas:{width,height},cupBox:{left:20,top:720,width:960,height:660},baseline:1380,dip:112});
}
await fs.writeFile(dir+'/geometry.json',JSON.stringify(geometry,null,2));
console.log('Exported three square lotus cups: identical 960x660 bounds, baseline 1380, registered front/back layers.');
