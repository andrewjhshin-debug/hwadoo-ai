import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/lib/sound.ts', 'utf8').replace(/^import .*soundPreference.*;\r?\n/m, '').replace(/^export /gm, '');
const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
for (const denied of [false, true]) {
  const listeners = new Map(), speakers = [], gains = [];
  let muted = false;
  const parameter = () => ({value:0, setValueAtTime(value){this.value=value;}});
  class AudioContext {
    state = 'suspended'; currentTime = 0; sampleRate = 48000; destination = {kind:'direct'};
    resume(){this.state='running';return Promise.resolve();}
    createBuffer(){return {};}
    createBufferSource(){return {connect(){},disconnect(){},start(){}};}
    createMediaStreamDestination(){return {kind:'media',stream:{getTracks:()=>[{stop(){}}]}};}
    createDynamicsCompressor(){return {threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),connect(){}};}
    createGain(){const gain={gain:parameter(),target:null,connect(target){this.target=target;},disconnect(){this.target=null;}};gains.push(gain);return gain;}
  }
  class Audio {
    paused=true; srcObject=null;
    constructor(){speakers.push(this);}
    pause(){this.paused=true;}
    play(){if(denied)return Promise.reject(new Error('NotAllowedError'));this.paused=false;return Promise.resolve();}
  }
  const context = vm.createContext({Audio,window:{AudioContext,addEventListener:(name,fn)=>listeners.set(name,fn)},document:{visibilityState:'visible',addEventListener:(name,fn)=>listeners.set(name,fn)},navigator:{userAgent:'Android Chrome'},isSoundMuted:()=>muted,SOUND_MUTE_EVENT:'mute'});
  vm.runInContext(compiled,context);
  listeners.get('touchend')();
  vm.runInContext('master(actx)',context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(gains.at(-1).target.kind,denied?'direct':'media');
  muted=true;
  vm.runInContext('master(actx)',context);
  assert.equal(gains.at(-1).gain.value,0);
  muted=false;
  vm.runInContext('master(actx)',context);
  assert.equal(gains.at(-1).gain.value,1,'stale mute gain cannot persist');
  vm.runInContext('actx.state="closed"',context);
  listeners.get('click')();
  assert.equal(speakers.length,2);
  assert.equal(speakers[0].srcObject,null,'retired speaker is released');
}
console.log('PASS: Android media output, rejected playback fallback, mute sync, closed output recovery');
