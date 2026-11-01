import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url), mod={};
new Function('require','exports',ts.transpileModule(fs.readFileSync('src/components/StoneMalaBead.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(require,mod);
assert.equal(mod.STONE_MALA_SYMBOLS.length,9);assert.equal(mod.ZODIAC_MALA_SYMBOLS.length,12);
assert.equal(new Set(mod.STONE_MALA_SYMBOLS.map(s=>s.name)).size,9);
for(const name of ['연꽃','코끼리','초','연등','보리잎','범종','좌불','합장','법륜'])assert(mod.STONE_MALA_SYMBOLS.some(s=>s.name===name));
for(const name of ['매듭','탑','승리의 깃발','지혜의 검','여의주','불족적','보병'])assert(!mod.STONE_MALA_SYMBOLS.some(s=>s.name===name));
assert.equal(new Set(mod.ZODIAC_MALA_SYMBOLS.map(s=>s.name)).size,12);
assert.equal(mod.ZODIAC_MALA_SYMBOLS[8].name,'원숭이');
for(const zodiac of [false,true])for(let i=0;i<27;i++)for(const fill of [0,.5,1]){
const html=renderToStaticMarkup(React.createElement(mod.default,{base:'/base.png',gold:'/gold.png',fill,index:i,zodiac}));
assert.equal((html.match(/<img /g)||[]).length,2);assert(!html.includes('<svg'));assert(html.includes(`opacity:${fill}`));
const list=zodiac?mod.ZODIAC_MALA_SYMBOLS:mod.STONE_MALA_SYMBOLS;assert.equal((html.match(/<img[^>]+src="([^"]+)"/g)||[]).filter(s=>s.includes(list[i%list.length].src)).length,2,'gold and base must register identical engraved artwork');
}
async function alpha(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return{data,info,box:[x0,y0,x1,y1]};}
const cat=await alpha('public/obj/bead-paw-one.png');
for(const s of [...mod.STONE_MALA_SYMBOLS,...mod.ZODIAC_MALA_SYMBOLS,{src:'/obj/bead-wood-one-v2.png'},{src:'/obj/bead-wood-one-gold-v3.png'}]){const a=await alpha(`public${s.src}`);assert.equal(a.info.width,920);assert.equal(a.info.height,920);a.box.forEach((n,i)=>assert(Math.abs(n-cat.box[i])<=3,`sprite outline differs: ${a.box}/${cat.box}`));for(let i=3;i<a.data.length;i+=4)assert(a.data[i]<=cat.data[i],'cannot draw outside original cat silhouette');}
const page=fs.readFileSync('src/app/moktak/page.tsx','utf8'),before=execFileSync('git',['show','HEAD:src/app/moktak/page.tsx'],{encoding:'utf8'});
const beadSkins=page.split('  bead: [')[1].split('  bowl: [')[0];assert.equal((beadSkins.match(/\{ id:/g)||[]).length,6);assert(!beadSkins.includes('id: "neon"'));assert(beadSkins.includes('id: "stone"')&&beadSkins.includes('id: "zodiac"'));
const sixth=beadSkins.match(/\{ id: "sandalwood"[^\n]+/)[0];assert(sixth.includes('wide: true')&&sixth.includes('lit: "/obj/bead-wood-one-gold-v3.png"'),'sixth plain wood uses shared horizontal ring with gold fill');
assert(page.includes('if (got.bead === "neon") got.bead = "stone"'));
for(const key of ['const RING_BEADS = 27;','const BEADS = 108;','const 고리폭 = 39;','const 물결 = (pos / (BEADS - 1)) * 360;','const 폭 = (사이(i) / 0.872) * 1.12;']){assert(page.includes(key));assert(before.includes(key));}
const geometry=s=>s.slice(s.indexOf('const 자리 = Array.from'),s.indexOf('const 분홍결 =')).replaceAll('\r\n','\n');
assert.equal(geometry(page),geometry(before),'shared paw geometry and fill calculation must not change');
assert.equal((page.match(/<StoneMalaBead/g)||[]).length,2,'main and full-screen renderers must both show motifs');
assert(beadSkins.includes('name: "열두 띠 나무"')&&beadSkins.includes('/obj/bead-wood-one-v1.png'));
console.log('PASS: nine approved Buddhist engravings, twelve illustrated zodiac engravings; gold registration, all 27 positions, alpha bounds, shared geometry and 108 count unchanged');
