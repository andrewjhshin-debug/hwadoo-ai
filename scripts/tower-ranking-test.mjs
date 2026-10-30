import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache = new Map();
function load(file, deps = {}) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)(name => {
    if (name in deps) return deps[name];
    if (name.endsWith('.json')) return { default: JSON.parse(fs.readFileSync(path.join(path.dirname(file), name), 'utf8')) };
    const resolved = name.startsWith('@/') ? `src/${name.slice(2)}.ts` : path.join(path.dirname(file), `${name}.ts`).replaceAll('\\', '/');
    return load(resolved);
  }, exports);
  return exports;
}
const model = load('src/lib/tower-ranking.ts'), game = load('src/lib/tower-game.ts');
assert.equal(model.towerWeek(Date.parse('2026-10-25T14:59:59Z')), '2026-10-19');
assert.equal(model.towerWeek(Date.parse('2026-10-25T15:00:00Z')), '2026-10-26');
const stones = [];
for (let i = 0; i < 12; i++) {
  let best;
  for (let x = -100; x <= 100; x += 2) {
    const stone = game.dropStone(stones, x, game.seedOf('test')), balance = game.stability([...stones, stone]);
    if (balance.stable && balance.risk <= .97 && (!best || balance.risk < best.risk)) best = { stone, risk: balance.risk };
  }
  if (!best) break;
  stones.push(best.stone);
}
const proof = { seed: 'test', positions: stones.map(s => s.x), week: model.towerWeek() };
const score = model.verifiedTowerScore(proof);
assert(score > 100); assert.equal(score, Math.round(game.towerHeight(stones) * 10));
for (const bad of [null, {}, {seed:'!',positions:[0]}, {seed:'x',positions:[NaN]}, {seed:'x',positions:[999]}, {seed:'x',positions:Array(513).fill(0)}, {seed:'test',positions:[0,-89,89]}]) assert.equal(model.verifiedTowerScore(bad), null);
const docs = new Map(), deleted = Symbol('delete');
function snapshot(id) { return { id, exists: docs.has(id), data: () => docs.get(id), get: key => docs.get(id)?.[key] }; }
const col = {
  doc: id => ({id, get: async () => snapshot(id)}),
  orderBy: field => ({limit: n => ({ get: async () => ({docs:[...docs.keys()].filter(id => docs.get(id)[field] !== undefined).sort((a,b)=>docs.get(b)[field]-docs.get(a)[field] || a.localeCompare(b)).slice(0,n).map(snapshot)})})}),
  where: (field,op,value) => ({count: () => ({get: async()=>({data:()=>({count:[...docs.values()].filter(d=>d[field]>value).length})})})}),
};
const api = load('src/app/api/tower/rank/route.ts', {
  'firebase-admin/auth': {getAuth:()=>({verifyIdToken:async token=>{if(token==='bad')throw Error();return {uid:token};}})},
  'firebase-admin/firestore': {FieldValue:{serverTimestamp:()=>123,delete:()=>deleted},getFirestore:()=>({collection:()=>col,doc:p=>({id:p.split('/').at(-1)}),runTransaction:async fn=>fn({get:async ref=>snapshot(ref.id),set:(ref,data)=>{const next={...docs.get(ref.id),...data};for(const k of Object.keys(next))if(next[k]===deleted)delete next[k];docs.set(ref.id,next);}})})},
  '@/lib/firebaseAdmin': {adminApp:()=>({})},
  '@/lib/anonName': {ANON_NAMES:['지혜','보리','자비']},
  '@/lib/tower-ranking': model,
});
const post=(body,token='u1')=>api.POST(new Request('https://test/api/tower/rank',{method:'POST',headers:token?{authorization:`Bearer ${token}`}:{},body:JSON.stringify(body)}));
assert.equal((await post(proof,'')).status,401);
assert.equal((await post(proof,'bad')).status,401);
assert.equal((await post({height:999999,name:'fake'})).status,400);
assert.equal((await post({...proof,seed:'x'.repeat(25000)})).status,413);
assert.equal((await post({...proof,week:'9999-01-01'})).status,400);
assert.equal((await post({...proof,height:999999,name:'fake'})).status,200);
assert.equal(docs.get('u1').all,score); assert.notEqual(docs.get('u1').name,'fake');
const first = {...docs.get('u1')}; await post({seed:'test',positions:[0],week:proof.week}); assert.deepEqual(docs.get('u1'),first,'lower records cannot overwrite best');
await post({...proof,week:'2026-01-05'},'old'); assert.equal(docs.get('old')[`week_${proof.week}`],undefined,'offline prior-week record must not enter this week');
const field=`week_${proof.week}`;
for(let i=0;i<15;i++)docs.set(`person${i}`,{all:score+i+1,[field]:score+i+1});
const get=await api.GET(new Request('https://test/api/tower/rank?period=all',{headers:{authorization:'Bearer u1'}}));
const board=await get.json();assert.equal(board.rows.length,10);assert.equal(board.mine.rank,16);assert.equal(board.mine.me,true);
assert(!JSON.stringify(board).includes('uid'));assert(!JSON.stringify(board).includes('person14'));
docs.set('tie',{all:score+15,[field]:score+15});
const tied=await(await api.GET(new Request('https://test/api/tower/rank'))).json();assert.equal(tied.rows[0].rank,1);assert.equal(tied.rows[1].rank,1);assert.equal(tied.rows[2].rank,3);
const component=fs.readFileSync('src/components/TowerRanking.tsx','utf8');
assert(component.includes('>랭킹<'));assert(!component.includes('개인 최고 높이 기준'));assert(!component.includes('가장 높이 쌓은 마음'));assert(!component.includes('weekly='));
assert(fs.readFileSync('src/app/api/account/erase/route.ts','utf8').includes('tower-ranks/${uid}'));
console.log('PASS: KST week boundaries, replay-derived scores, invalid/oversized/unstable rejection, auth, monotonic records, prior-week retry, top ten, own rank outside top ten, ties, private identities, account cleanup, requested copy');
