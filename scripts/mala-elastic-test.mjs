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
 for(let t=0;t<3200;t+=1000/fps){if(t<900&&t-last>=70){pulseMalaElastic(s,t);last=t;}const frame=stepMalaElastic(s,1000/fps);min=Math.min(min,frame.scale);max=Math.max(max,frame.scale);done=frame.done;assert(frame.scale>=.905&&frame.scale<=1.028,'spring stays bounded without a large zoom');}
 assert(min<.96,'fast turns now compress by more than four percent, rather than the old barely-visible three');assert(max>1.008,'releasing now gives a visible elastic rebound');assert(done,'spring settles and stops requesting frames');assert.equal(s.displacement,0);
}
function compression(gap){const state=createMalaElastic();let min=1,last=-1000;for(let now=0;now<1200;now+=1000/60){if(now-last>=gap){pulseMalaElastic(state,now);last=now;}min=Math.min(min,stepMalaElastic(state,1000/60).scale);}return min;}
assert(compression(70)<compression(180)-.015,'rapid turns have a stronger speed cue than moderate turns');
const burst=createMalaElastic();for(let i=0;i<100;i++)pulseMalaElastic(burst,10);for(let i=0;i<300;i++)assert(Number.isFinite(stepMalaElastic(burst,1000).scale),'coalesced input and suspended frames remain stable');
const page=fs.readFileSync('src/app/moktak/page.tsx','utf8');assert(page.includes('ref={malaElastic.normalRef}')&&page.includes('ref={malaElastic.expandedRef}'));assert(page.includes('useMalaElastic(tab === "yeomju" && beadWide)'));
console.log('PASS: slow input stays still; visibly stronger compression and rebound at 30/60/120 Hz; faster turns feel stronger; bounded burst; exact settle; both horizontal renderers wired.');
