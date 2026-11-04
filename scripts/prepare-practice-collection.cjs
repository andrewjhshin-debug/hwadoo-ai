const sharp = require('sharp');
const fs = require('node:fs/promises');
const root = 'C:/Users/user/.codex/generated_images/01a0b989-e0c6-7773-b293-56c901392936/';
const out = 'public/obj/practice-collection-v1';
async function tile(file, name, col, row, cols, rows) {
  const meta = await sharp(root + file).metadata();
  const width = Math.floor(meta.width / cols), height = Math.floor(meta.height / rows);
  const cropped = await sharp(root + file).extract({left: col * width, top: row * height, width, height}).png().toBuffer();
  const trimmed = await sharp(cropped).trim({threshold: 30}).png().toBuffer();
  await sharp(trimmed).resize(448, 448, {fit:'contain', background:'#00000000'}).extend({top:32,bottom:32,left:32,right:32,background:'#00000000'}).webp({quality:90}).toFile(`${out}/${name}.webp`);
}
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const atlas='exec-6051e1cc-d935-41fa-ab0d-bf38bb4fe48a.png';
  for (const [i,name] of ['ebony','carved','blackgold','lotuswood'].entries()) await tile(atlas,name,i%2,Math.floor(i/2),2,2);
  const extra='exec-1d4b76f5-7e86-4907-b994-21f5f5fa1d15.png';
  await tile(extra,'ebony-master',0,0,2,1);
  await tile(extra,'wood-spacer',1,0,2,1);
  await tile('exec-ef60870b-15b7-4444-8f75-e4a29a5c948c.png','square-keycap',0,0,1,1);
})();
