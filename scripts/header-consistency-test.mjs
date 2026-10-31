import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
const pages=['src/app/HipGarden.tsx','src/app/moktak/HipMoktak.tsx','src/components/HipRoom.tsx','src/components/CandleHall.tsx','src/app/gathering/page.tsx','src/app/settings/HipMe.tsx'];
for(const p of pages){const text=fs.readFileSync(p,'utf8');assert(text.includes('<HipHeader>'),p+': shared header required');assert(!/<header className="hip-screen-top/.test(text),p+': local header coordinates must not return');}
const header=fs.readFileSync('src/components/HipHeader.tsx','utf8');assert(header.includes('createPortal')&&header.includes('hip-header-layer'),'headers must escape transformed page containers');
const layout=fs.readFileSync('src/app/layout.tsx','utf8');assert.equal((layout.match(/<HipDayBar\s*\/>/g)||[]).length,1);assert(!layout.includes('<MeritBar'));assert(!fs.readFileSync('src/components/HipShell.tsx','utf8').includes('<HipDayBar'),'no duplicated bars inside per-page shells');
const css=postcss.parse(fs.readFileSync('src/app/hip.css','utf8'));
let shared=false,desktop=false,small=false;
css.walkRules(rule=>{if(rule.selector==='.hip-screen-top.hip-app-header'){const decl=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));if(decl.position==='fixed'&&decl.top==='var(--hip-header-top)'&&decl.left==='50%')shared=true;if(rule.parent.params==='(min-width: 768px)'&&decl.width==='460px')desktop=true;}if(rule.selector==='.hip-app-header .hip-top-ico'&&rule.parent.params==='(max-width: 380px)')small=true;});
assert(shared&&desktop&&small,'one garden-aligned viewport row with narrow-screen fallback');
console.log('PASS: all menu header renderers share the root viewport layer; one global merit bar; garden coordinates and narrow-screen fallback defined.');
