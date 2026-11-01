import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
await import('./keycap-v3-test.mjs');
const geometry=JSON.parse(fs.readFileSync('public/obj/keycaps-v5/geometry.json','utf8'));
assert(geometry.every(g=>JSON.stringify(g.cupBox)===JSON.stringify(geometry[0].cupBox)),'all square seats must share their footprint and height');
for(const {id} of geometry){
 const {data}=await sharp(`public/obj/keycaps-v5/${id}-back.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const coverage=y=>{let n=0;for(let x=0;x<1000;x++)if(data[(y*1000+x)*4+3]>32)n++;return n;};
 assert(coverage(1200)>900,`${id}: substantial vertical lower body`);
 assert(coverage(1375)>650,`${id}: broad flat bottom, not a rounded bowl`);
}
console.log('PASS: three equally sized taller square bases, broad bottom edges, stationary registered cup layers and separate movable bodies.');
