import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const mod={};
new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/mala-elastic.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod);
const {createMalaElastic,pulseMalaElastic,stepMalaElastic}=mod;
const slow=createMalaElastic();for(const t of [0,500,1000,1800])assert.equal(pulseMalaElastic(slow,t),false);
assert.equal(stepMalaElastic(slow,16).scale,1,'slow turns keep the original size');
for(const fps of [30,60,120]){
 const s=createMalaElastic();let min=1,max=1,last=-1000,done=false;
 for(let t=0;t<3200;t+=1000/fps){if(t<900&&t-last>=70){pulseMalaElastic(s,t);last=t;}const frame=stepMalaElastic(s,1000/fps);min=Math.min(min,frame.scale);max=Math.max(max,frame.scale);done=frame.done;assert(frame.scale>=.945&&frame.scale<=1.018,'spring stays within subtle visual bounds');}
 assert(min<.98,'fast turns visibly compress the ring');assert(max>1.0001,'releasing gives a small elastic rebound');assert(done,'spring settles and stops requesting frames');assert.equal(s.displacement,0);
}
const burst=createMalaElastic();for(let i=0;i<100;i++)pulseMalaElastic(burst,10);for(let i=0;i<300;i++)assert(Number.isFinite(stepMalaElastic(burst,1000).scale),'coalesced input and suspended frames remain stable');
const page=fs.readFileSync('src/app/moktak/page.tsx','utf8');assert(page.includes('ref={malaElastic.normalRef}')&&page.includes('ref={malaElastic.expandedRef}'));assert(page.includes('useMalaElastic(tab === "yeomju" && beadWide)'));
console.log('PASS: slow input stays still; fast input compresses and rebounds subtly at 30/60/120 Hz; bounded burst; settles to exact original size; both horizontal renderers wired.');
