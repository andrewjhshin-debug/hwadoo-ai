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



const width=1000,height=1400,dir='public/obj/keycaps-v4';
await fs.mkdir(dir,{recursive:true});
const cup=await sharp(await object('design/keycaps/v4/podae-cup-source.png')).resize(960,560,{fit:'fill'}).png().toBuffer();
const back=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite([{input:cup,left:20,top:820}]).png().toBuffer();
const mask=Buffer.from('<svg width="1000" height="1400" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M20 1050L20 1000 Q50 930 72 938 Q105 945 145 1005 Q164 988 180 1000 Q260 1045 338 1130 Q420 1050 500 1044 Q580 1050 662 1130 Q740 1045 820 1000 Q836 988 855 1005 Q895 945 928 938 Q950 930 980 1000L980 1400H20Z"/></svg>');
await sharp(back).webp({lossless:true}).toFile(dir+'/podae-back.webp');
await sharp(back).composite([{input:mask,blend:'dest-in'}]).webp({lossless:true}).toFile(dir+'/podae-front.webp');
const oldBody=await fs.readFile('public/obj/keycaps-v3/podae-body.webp');
const body=await sharp(oldBody).extract({left:0,top:0,width,height:height-80}).extend({top:80,bottom:0,left:0,right:0,background:'#00000000'}).webp({lossless:true}).toBuffer();
await fs.writeFile(dir+'/podae-body.webp',body);
for(const [name,shift] of [['rest',0],['pressed',112]]){
 const shifted=await sharp(body).extract({left:0,top:0,width,height:height-shift}).extend({top:shift,bottom:0,left:0,right:0,background:'#00000000'}).png().toBuffer();
 const joined=await sharp(back).composite([{input:shifted},{input:dir+'/podae-front.webp'}]).png().toBuffer(); await sharp(joined).resize(500,700).png().toFile('design/keycaps/v4/podae-'+name+'.png');
}
console.log('Exported aligned eight-petal gold cup; original body and tap depth retained.');

