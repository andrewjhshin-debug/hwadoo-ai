import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const cache=new Map(),overrides={};
function load(file){if(cache.has(file))return cache.get(file);const out={};cache.set(file,out);new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(name=>name in overrides?overrides[name]:load('src/'+name.slice(2)+'.ts'),out);return out;}
const colors=load('src/lib/lanternSpec.ts'),spec=load('src/lib/candleSpec.ts');
assert.equal(colors.lanternFor(undefined,7).id,colors.lanternFor(undefined,7).id);
for(const bad of [null,{},'blue',0,'__proto__'])assert(!colors.isLanternColor(bad));
for(const item of colors.LANTERN_COLORS){assert.equal(colors.lanternFor(item.id,99).src,item.src);const {data,info}=await sharp('public'+item.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,320);assert.equal(info.height,352);assert.equal(data[3],0);assert(data.some((v,i)=>i%4===3&&v===255));}
const docs=new Map();let commits=0;
const db={doc:path=>({path,id:path.split('/').at(-1)}),runTransaction:async action=>{const writes=[];const result=await action({get:async ref=>({exists:docs.has(ref.path),data:()=>docs.get(ref.path)}),set:(ref,data)=>writes.push(()=>docs.set(ref.path,data)),update:(ref,data)=>writes.push(()=>docs.set(ref.path,{...docs.get(ref.path),lotus:docs.get(ref.path).lotus+data.lotus.delta}))});for(const write of writes)write();commits+=writes.length;return result;}};
overrides['firebase-admin/auth']={getAuth:()=>({verifyIdToken:async token=>{if(token==='bad')throw Error();return {uid:token,email_verified:false};}})};
overrides['firebase-admin/firestore']={getFirestore:()=>db,FieldValue:{increment:delta=>({delta}),serverTimestamp:()=>123}};
overrides['@/lib/firebaseAdmin']={adminApp:()=>({})};
overrides['@/lib/config']={FIRST_GRANT:3,isAdminAccount:()=>false};
const route=load('src/app/api/candle/light/route.ts');
const call=(body,uid='u')=>route.POST(new Request('https://test/api/candle/light',{method:'POST',headers:{authorization:`Bearer ${uid}`},body:JSON.stringify({forName:'기원',wish:'평안하길',gift:'deung',visibility:'public',kind:'peace',key:'test-key-123',...body})}));
for(const color of colors.LANTERN_COLORS){const uid='u-'+color.id;docs.set('wallets/'+uid,{lotus:10});const response=await call({lanternColor:color.id},uid);assert.equal(response.status,200);assert.equal((await response.json()).lanternColor,color.id);assert.equal(docs.get(`candles/${uid}_test-key-123`).lanternColor,color.id);assert.equal(docs.get('wallets/'+uid).lotus,10-spec.PUBLIC_CANDLE_PRICE);}
const before=commits;assert.equal((await call({lanternColor:'blue'})).status,400);assert.equal(commits,before,'invalid colors cannot debit or create');
docs.set('wallets/retry',{lotus:10});await call({lanternColor:'mint'},'retry');const retry=await(await call({lanternColor:'pink'},'retry')).json();assert.equal(retry.lanternColor,'mint');assert.equal(docs.get('wallets/retry').lotus,8,'same request cannot spend twice or recolor the saved lantern');
await call({},'legacy');assert.equal(docs.get('candles/legacy_test-key-123').lanternColor,'pink');
await call({gift:'cho',lanternColor:'mint'},'candle');assert.equal(docs.get('candles/candle_test-key-123').lanternColor,undefined,'other offerings do not store lantern color');
docs.set('wallets/empty',{lotus:0});assert.equal((await call({lanternColor:'gold'},'empty')).status,402);assert(!docs.has('candles/empty_test-key-123'));
assert.equal((await call({lanternColor:'pink'},'bad')).status,401);
console.log('PASS: three registered transparent colors; persisted selection; legacy fallback; invalid-color rejection; atomic cost; idempotent retry; no-lotus and auth protection');
