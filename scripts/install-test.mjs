import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const listeners = new Map();
const registrations = [];
const exports = {};
const context = vm.createContext({
  exports,
  window: { isSecureContext: true, addEventListener: (name, callback) => listeners.set(name, callback), matchMedia: () => ({matches: false}) },
  navigator: { userAgent: 'Android Chrome', maxTouchPoints: 1, serviceWorker: { register: (...args) => {registrations.push(args); return Promise.resolve({});} } },
});
vm.runInContext(ts.transpileModule(fs.readFileSync('src/lib/install.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, context);
assert.ok(listeners.has('beforeinstallprompt'), 'capture before React effects');
assert.equal(registrations[0][0], '/firebase-messaging-sw.js');
assert.equal(registrations[0][1].scope, '/');
assert.equal(await exports.promptInstall(), 'unavailable');
for (const outcome of ['accepted', 'dismissed']) {
  let calls = 0;
  let prevented = false;
  listeners.get('beforeinstallprompt')({ preventDefault() { prevented = true; }, prompt: async () => { calls++; }, userChoice: Promise.resolve({outcome}) });
  assert.ok(prevented);
  assert.equal(exports.canInstall(), true);
  const first = exports.promptInstall();
  assert.equal(await exports.promptInstall(), 'unavailable', 'double tap cannot reuse a prompt');
  assert.equal(await first, outcome);
  assert.equal(calls, 1);
}
listeners.get('beforeinstallprompt')({preventDefault() {}, prompt: async () => {throw new Error('blocked');}});
assert.equal(await exports.promptInstall(), 'unavailable');
assert.equal(exports.canInstall(), false);
console.log('PASS: early capture, shared worker, accepted, cancelled, failed, double tap');
