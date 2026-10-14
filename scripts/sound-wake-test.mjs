import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const listeners = new Map();
const contexts = [];
let muted = false;
class AudioContext {
  state = 'suspended';
  sampleRate = 48000;
  currentTime = 0;
  destination = {};
  resumes = 0;
  starts = 0;
  constructor() { contexts.push(this); }
  resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  createBuffer() { return {}; }
  createBufferSource() {
    return { connect() {}, disconnect() {}, start: () => this.starts++ };
  }
}
const context = vm.createContext({
  window: { AudioContext, addEventListener: (name, fn) => listeners.set(name, fn) },
  document: { visibilityState: 'visible', addEventListener: (name, fn) => listeners.set(name, fn) },
  navigator: {},
  isSoundMuted: () => muted,
  SOUND_MUTE_EVENT: 'mute',
});
const source = fs.readFileSync('src/lib/sound.ts', 'utf8').replace(/^import .*soundPreference.*;\r?\n/m, '').replace(/^export /gm, '');
vm.runInContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
assert.equal(contexts.length, 0, 'do not create audio before a gesture');
for (const name of ['touchend', 'pointerup', 'click', 'keydown']) assert.ok(listeners.has(name));
listeners.get('touchend')();
assert.equal(contexts.length, 1);
assert.equal(contexts[0].state, 'running');
assert.equal(contexts[0].starts, 1);
contexts[0].state = 'interrupted';
listeners.get('click')();
assert.equal(contexts[0].resumes, 2);
contexts[0].state = 'closed';
listeners.get('pointerup')();
assert.equal(contexts.length, 2, 'closed contexts are recreated');
muted = true;
listeners.get('touchend')();
assert.equal(muted, true, 'gestures must not change the mute preference');
console.log('PASS: first mobile gesture, interrupted recovery, closed recovery, mute preservation');
