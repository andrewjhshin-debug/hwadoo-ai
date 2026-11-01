import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), cache=new Map(), memory=new Map();
let broken=false, cursor=0;const states=[];
const hooks={useSyncExternalStore:(_subscribe,get)=>get(),useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>states[i]=v];}};
const win={localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>{if(broken)throw Error('blocked');memory.set(k,v);}},setTimeout:()=>0,dispatchEvent:()=>{}};
function load(file){if(cache.has(file))return cache.get(file);const mod={};cache.set(file,mod);new Function('require','exports','window',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(name=>{if(name==='react')return {...React,...hooks};if(name==='next/link')return props=>React.createElement('a',props,props.children);if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.join(path.dirname(file),name+'.ts'));return require(name);},mod,win);return mod;}
const lib=load('src/lib/savedSentences.ts'),store=load('src/lib/store.ts'),ui=load('src/components/SavedSentences.tsx');
const first=lib.changeSavedSentence([], '마음에\n남은 문장','출처',100);
assert.equal(first.length,1);assert.equal(lib.sentenceKey('마음에 남은 문장'),first[0].key);
const removed=lib.changeSavedSentence(first,'마음에 남은 문장',null,200);
assert.equal(removed[0].removed,true);
assert.equal(lib.mergeSavedSentences(first,removed)[0].removed,true);
assert.equal(lib.mergeSavedSentences(removed,first)[0].removed,true,'old offline device cannot revive deletion');
assert(!lib.changeSavedSentence(removed,'마음에 남은 문장',null,300)[0].removed);
assert.equal(lib.normalizeSavedSentences([{text:'bad',savedAt:Infinity,updatedAt:1}]).length,0);
assert.equal(lib.normalizeSavedSentences([{text:'bad',savedAt:9e16,updatedAt:1}]).length,0);
store.applyRemoteStore({...store.emptyStore(),ownerUid:'first',current:{hwaduId:'x',receivedAt:1,durationDays:3},received:9});
const render=()=>{cursor=0;return ui.KeepSentence({text:'지금 이 문장',source:'원문'});};
const button=tree=>React.Children.toArray(tree.props.children).find(child=>child?.type==='button');
assert(renderToStaticMarkup(render()).includes('이 문장 간직하기'));button(render()).props.onClick();
assert(renderToStaticMarkup(render()).includes('간직한 문장'));assert.equal(store.loadStore().current.hwaduId,'x');assert.equal(store.loadStore().received,9);assert.equal(store.loadStore().ownerUid,'first');
assert.equal(store.loadStore().savedSentences.filter(s=>!s.removed).length,1);
button(render()).props.onClick();assert.equal(store.loadStore().savedSentences.filter(s=>!s.removed).length,0);
broken=true;button(render()).props.onClick();assert(renderToStaticMarkup(render()).includes('저장하지 못했어요'));assert.equal(store.loadStore().savedSentences.filter(s=>!s.removed).length,0);broken=false;
store.applyRemoteStore({...store.emptyStore(),ownerUid:'second'});assert(renderToStaticMarkup(render()).includes('이 문장 간직하기'),'another account never sees previous bookmarks');
button(render()).props.onClick();cursor=0;assert(renderToStaticMarkup(ui.SavedSentenceList()).includes('지금 이 문장'));
// Exercise actual login/snapshot merge functions with the pure dependencies above.
const sync=fs.readFileSync('src/lib/sync.ts','utf8');
for(const name of ['mergeStores','adoptRemote']){
 const match=sync.match(new RegExp(`function ${name}\\([^]*?\\n}`));assert(match);
 // TypeScript signatures are removed via transpilation, preserving the real function body.
 const exported=ts.transpileModule(match[0]+'\nexports.fn='+name+';',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const out={};new Function('exports','mergeSavedSentences','cleanupHistory','mergeHistory','sessionKey',exported)(out,lib.mergeSavedSentences,store.cleanupHistory,(a,b)=>[...a,...b],store.sessionKey);
 const a={...store.emptyStore(),savedSentences:first},b={...store.emptyStore(),savedSentences:removed};
 assert(out.fn(a,b).savedSentences[0].removed);assert(out.fn(b,a).savedSentences[0].removed);
}
console.log('PASS: save/remove/re-save, duplicates, persistent current session, account isolation, blocked storage feedback, saved list, actual login/snapshot tombstone merge');
