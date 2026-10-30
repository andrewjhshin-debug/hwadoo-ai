import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync('src/lib/poison-practice.ts','utf8');
const m = {};
new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m);
assert.deepEqual(m.THREE_POISONS.map(p=>p.remedy),['보시','자비','지혜']);
for (let seed=0;seed<150;seed++) for(const slow of [false,true]) {
  let game=m.newPoisonPractice(seed,seed%6);
  for(let stage=0;stage<3;stage++) {
    const target=m.practiceTarget(game,slow);
    assert(target.low>0 && target.high<1 && target.high>target.low);
    assert(target.duration>1500);
    const started=m.beginPractice(game);
    assert.equal(m.beginPractice(started),started,'duplicate starts ignored');
    const early=m.releasePractice(started,0,slow);assert.equal(early.feedback,'early');assert.deepEqual(early.points,game.points);
    const late=m.releasePractice(started,target.duration,slow);assert.equal(late.feedback,'late');assert.deepEqual(late.points,game.points);
    const cancelled=m.cancelPractice(started);assert.equal(cancelled.phase,'ready');assert.deepEqual(cancelled.points,game.points);
    game=m.releasePractice(started,target.center*target.duration,slow);
    assert.equal(game.points[stage],36);
    assert.equal(m.releasePractice(game,0,slow),game,'release cannot award twice');
    if(stage<2){assert.equal(game.phase,'hit');game=m.nextPoison(game);} else assert.equal(game.phase,'finished');
  }
  assert.equal(game.points.reduce((a,b)=>a+b),108);
}
const storage=new Map([['hwadu.investment.decisions.v2','old-decisions'],['hwadu.tamjinchi.v1','old-journal']]);
const mock={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
assert.equal(m.savePracticeBest(84,mock),84);assert.equal(m.savePracticeBest(72,mock),84);assert.equal(m.savePracticeBest(108,mock),108);
assert.throws(()=>m.savePracticeBest(109,mock));
const before=storage.get(m.PRACTICE_SCORE_KEY);assert.throws(()=>m.savePracticeBest(108,{...mock,setItem:()=>{throw Error('quota');}}));assert.equal(storage.get(m.PRACTICE_SCORE_KEY),before);
storage.set(m.PRACTICE_SCORE_KEY,'broken');assert.throws(()=>m.savePracticeBest(100,mock));assert.equal(storage.get(m.PRACTICE_SCORE_KEY),'broken');
assert.equal(storage.get('hwadu.investment.decisions.v2'),'old-decisions');assert.equal(storage.get('hwadu.tamjinchi.v1'),'old-journal');
const page=fs.readFileSync('src/app/tamjinchi/page.tsx','utf8');
assert(!page.includes('textarea')&&!page.includes('marketPrice')&&!page.includes('addMerit')&&!page.includes('spendLotus'));
assert(page.includes('setPointerCapture')&&page.includes('visibilitychange')&&page.includes('e.repeat')&&page.includes('e.detail === 0'));
assert(page.includes('/tamjinchi/records'));
assert(fs.readFileSync('src/app/tamjinchi/records/page.tsx','utf8').includes('DECISION_DRAFT_KEY'));
console.log('PASS: three poisons/remedies, 300 three-stage runs, perfect 108, early/late/cancel retain prior progress, duplicate-input guard, bounded difficulty, best score monotonicity, storage failures, old records preserved, pointer/keyboard/hidden cleanup, no trading or currency writes');
