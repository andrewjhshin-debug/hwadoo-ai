import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync('src/lib/firebase.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
for (const hostname of ['www.hwa-du.com','hwa-du.com','localhost',null]) {
  let config;
  const modules = {
    'firebase/app': {getApps:()=>[],initializeApp:c=>{config=c;return {}; }},
    'firebase/auth': {getAuth:()=>({})},
    'firebase/firestore': {getFirestore:()=>({})},
    'firebase/database': {getDatabase:()=>({})},
    'firebase/storage': {getStorage:()=>({})},
    './storageConfig': {PHOTO_BUCKET:'hwadu-9dc7b.firebasestorage.app'},
  };
  vm.runInNewContext(compiled,{exports:{},require:name=>modules[name],...(hostname?{window:{location:{hostname}}}:{})});
  assert.equal(config.authDomain,'hwadu-9dc7b.firebaseapp.com');
  assert.equal(`https://${config.authDomain}/__/auth/handler`,'https://hwadu-9dc7b.firebaseapp.com/__/auth/handler');
}
console.log('PASS: www, apex, localhost and server use the same established OAuth callback');
