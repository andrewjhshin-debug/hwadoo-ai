import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const now=Date.parse('2026-10-31T15:30:00Z'),day='2026-11-01';
class ClockDate extends Date { constructor(...args){super(...(args.length?args:[now]));}static now(){return now;} }
function loader(overrides,globals={}){const cache=new Map();return function load(file){if(cache.has(file))return cache.get(file);const mod={};cache.set(file,mod);new Function('require','exports',...Object.keys(globals),ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(name=>{if(name in overrides)return overrides[name];if(name.endsWith('.css'))return {};if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.join(path.dirname(file),name+'.ts').replaceAll('\\','/'));return require(name);},mod,...Object.values(globals));return mod;};}
const docs=new Map();let chain=Promise.resolve(),fail=false;
const snap=p=>({exists:docs.has(p),data:()=>docs.get(p)});
const db={doc:p=>({path:p}),runTransaction:fn=>{const run=chain.then(async()=>{if(fail)throw Error('offline');let wrote=false;const changes=[];const value=await fn({get:async r=>{assert(!wrote,'Firestore forbids reads after writes');return snap(r.path);},set:(r,v,opts)=>{wrote=true;changes.push([r.path,v,opts]);}});for(const [p,v,opts]of changes)docs.set(p,opts?.merge?{...docs.get(p),...v}:v);return value;});chain=run.catch(()=>{});return run;}};
const load=loader({'firebase-admin/auth':{getAuth:()=>({verifyIdToken:async token=>({uid:token})})},'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>now}},'@/lib/firebaseAdmin':{adminApp:()=>({})},'./config':{FIRST_GRANT:3}},{Date:ClockDate});
const api=load('src/app/api/lotus/exchange/route.ts');
const call=(uid,body={lotus:1,day})=>api.POST(new Request('https://test/api/lotus/exchange',{method:'POST',headers:uid?{authorization:'Bearer '+uid}:{},body:JSON.stringify(body)}));
assert.equal((await call('')).status,401);
assert.equal((await call('user',{lotus:2})).status,400);
assert.equal((await call('user',{lotus:1,day:'2026-10-31'})).status,409);
const first=await(await call('user')).json();assert.equal(first.granted,1);assert.equal(first.received,1);assert.equal(first.day,day);assert.equal(docs.get('wallets/user').lotus,4,'first gift plus one reward');
const repeated=await(await call('user')).json();assert.equal(repeated.granted,0);assert.equal(repeated.received,1);assert.equal(repeated.rewardId,first.rewardId);assert.equal(docs.get('wallets/user').lotus,4);
const concurrent=await Promise.all(Array.from({length:8},()=>call('race').then(r=>r.json())));assert.equal(concurrent.reduce((sum,r)=>sum+r.granted,0),1);assert.equal(docs.get('wallets/race').lotus,4);
docs.set('wallets/expired',{lotus:6,paid:2,free:4,freeUntil:now-1});await call('expired');assert.equal(docs.get('wallets/expired').lotus,3);assert.equal(docs.get('wallets/expired').paid,2);assert.equal(docs.get('wallets/expired').free,1,'expired free lotus never revives');
fail=true;assert.equal((await call('failed')).status,500);assert(!docs.has('merit-exchange/failed_'+day));fail=false;assert.equal((await(await call('failed')).json()).granted,1);

// Exercise the real component's hooks/events without a browser or a real account.
function ui(uid,{storageBroken=false,component='src/components/DailyLotusReward.tsx'}={}){
  let cursor=0,earned=21599,requests=0,networkFail=false,authListener;const slots=[],effects=[],events=new Map(),timers=new Map(),storage=new Map();
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const hooks={useState:init=>{const i=cursor++;slots[i]??={value:typeof init==='function'?init():init};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},useRef:value=>{const i=cursor++;return slots[i]??=( {current:value});},useCallback:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn;},useEffect:(fn,deps)=>{const i=cursor++;if(!same(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps,cleanup:old?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn();});}}};
  const bus={addEventListener:(n,fn)=>{if(!events.has(n))events.set(n,new Set());events.get(n).add(fn);},removeEventListener:(n,fn)=>events.get(n)?.delete(fn)};
  const auth={currentUser:uid?{uid,getIdToken:async()=>uid}:null};
  const window={...bus,clearTimeout:()=>{},setTimeout:fn=>{queueMicrotask(fn);return 1;},setInterval:fn=>{timers.set(1,fn);return 1;}};
  const document={...bus,hidden:false,activeElement:null};
  const loadUI=loader({react:hooks,'next/link':p=>React.createElement('a',p,p.children),'@/lib/firebase':{auth},'@/lib/sync':{watchAuth:fn=>{authListener=fn;queueMicrotask(fn);return()=>{};}},'@/lib/merit':{DAILY_TOTAL_CAP:21600,MERIT_EVENT:'merit',todayRoom:()=>({earned,cap:21600})},'@/lib/daily':{DAILY_EVENT:'daily'},'@/components/LotusCount':{pingLotus:()=>{}},'@/components/icons':{Yeonkkot:()=>React.createElement('svg')}},{Date:ClockDate,window,document,localStorage:{getItem:k=>{if(storageBroken)throw Error('blocked');return storage.get(k);},setItem:(k,v)=>{if(storageBroken)throw Error('blocked');storage.set(k,v);}},fetch:async(_url,opts)=>{requests++;if(networkFail)throw Error('offline');return call(uid,JSON.parse(opts.body));},clearTimeout:()=>{},clearInterval:()=>{}});
  const Component=loadUI(component).default;
  const render=()=>{cursor=0;const tree=Component();while(effects.length)effects.shift()();return renderToStaticMarkup(tree);};
  const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
  return {render,flush,emit:n=>{for(const fn of events.get(n)??[])fn();},full:()=>{earned=21600;},get requests(){return requests;},offline:v=>{networkFail=v;},retry:()=>{for(const fn of timers.values())fn();},authChange:()=>authListener?.()};
}
const live=ui('ui');live.render();await live.flush();assert.equal(live.requests,0);live.emit('merit');live.full();live.emit('daily');live.emit('daily');await live.flush();assert.equal(live.requests,1,'last daily increment triggers one request despite duplicate events');assert(live.render().includes('연꽃 1송이를 받았어요'));live.emit('daily');await live.flush();assert.equal(live.requests,1);
const guest=ui('');guest.render();guest.full();guest.emit('daily');await guest.flush();assert(guest.render().includes('로그인하고 연꽃 받기'));assert.equal(guest.requests,0);
const broken=ui('storage',{storageBroken:true});broken.render();broken.full();broken.emit('daily');await broken.flush();assert(broken.render().includes('연꽃 1송이를 받았어요'));broken.emit('daily');await broken.flush();assert.equal(broken.requests,1,'blocked localStorage still deduplicates in memory');
const lost=ui('user');lost.render();lost.full();lost.emit('daily');await lost.flush();assert(lost.render().includes('연꽃 1송이를 받았어요'),'server receipt restores confirmation after a previously committed response was lost');assert.equal(docs.get('wallets/user').lotus,4);
const offline=ui('offline');offline.render();offline.full();offline.offline(true);offline.emit('daily');await offline.flush();assert(offline.render().includes('다시 받기'));assert(!offline.render().includes('연꽃 1송이를 받았어요'));offline.offline(false);offline.emit('online');await offline.flush();assert(offline.render().includes('연꽃 1송이를 받았어요'));
const bar=ui('bar',{component:'src/components/MeritBar.tsx'});bar.render();await bar.flush();assert(!bar.render().includes('width:100%'));bar.full();bar.emit('daily');assert(bar.render().includes('width:100%'),'bar fills on final daily event without an extra tap');
const visibleBar=ui('visible-bar',{component:'src/components/HipDayBar.tsx'});visibleBar.render();await visibleBar.flush();assert(!visibleBar.render().includes('scaleX(1)'));visibleBar.full();visibleBar.emit('daily');assert(visibleBar.render().includes('scaleX(1)'),'the global visible pink bar fills on the last increment');
console.log('PASS: read-before-write transactions; KST day; first gift + daily reward; concurrent idempotency; expired free balance; failed writes retry; last daily event; no false success; guest prompt; blocked storage; lost response recovery; online retry. No real account or wallet modified.');
