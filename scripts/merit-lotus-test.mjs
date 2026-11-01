import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const out={};cache.set(file,out);new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name.endsWith('.css')?{}:name==='@/lib/merit-lotus'?load('src/lib/merit-lotus.ts'):require(name),out);return out;}
const {meritLotusPose}=load('src/lib/merit-lotus.ts'),Lotus=load('src/components/MeritLotus.tsx').default;
assert.equal(meritLotusPose(-1).progress,0);assert.equal(meritLotusPose(2).progress,1);assert.equal(meritLotusPose(NaN).progress,0);
let previous=meritLotusPose(0);
for(let step=1;step<=100;step++){const current=meritLotusPose(step/100);assert(current.outer>previous.outer);assert(current.inner>previous.inner);assert(current.outer-previous.outer<1,'opening must be continuous rather than a sudden full-flower swap');previous=current;}
const render=value=>renderToStaticMarkup(React.createElement(Lotus,{progress:value}));
assert.notEqual(render(0),render(1));
for(const value of [0,.25,.5,.75,1]){const html=render(value);assert(html.includes(`data-open="${value}"`));assert(html.includes('aria-hidden="true"'));assert.equal((html.match(/class="merit-lotus-petal"/g)||[]).length,7);}
if(process.argv.includes('--preview')){
 const beads=load('src/components/StoneMalaBead.tsx').default;
 const stages=[0,.25,.5,.75,1].map(v=>`<figure><div class="hip-daybar"><button class="hip-daybar-lotus">${render(v)}</button></div><figcaption>${v*100}%</figcaption></figure>`).join('');
 const samples=[0,.5,1].map(fill=>`<figure><div class="bead">${renderToStaticMarkup(React.createElement(beads,{index:0,fill}))}</div><figcaption>${fill*100}%</figcaption></figure>`).join('');
 fs.writeFileSync('public/merit-lotus-qa.html',`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#faf8f6;font-family:system-ui;color:#6c6364;margin:28px}main{max-width:700px;margin:auto}section{display:flex;justify-content:space-between;gap:8px}figure{margin:20px 0;text-align:center}figcaption{font-size:12px;margin:16px 0}button{background:none;border:0}.hip-daybar .hip-daybar-lotus .merit-lotus{width:64px!important;height:64px!important} .bead{position:relative;width:120px}img{display:block;width:100%;height:auto}.absolute{position:absolute}.inset-0{inset:0}${fs.readFileSync('src/components/merit-lotus.css','utf8')}</style><main><h3>공덕에 따른 개화</h3><section>${stages}</section><h3>청옥 → 차분한 금빛</h3><section>${samples}</section></main>`);
}
console.log('PASS: clamped real progress, continuous petal opening, full blossom at100%, seven petals across five visible stages');
