import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const code = ts.transpileModule(fs.readFileSync("src/lib/yeonUpload.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
let responses = [], requests = [], force = [], canceled = 0, longTimer, uploadError;
const user = { uid: "test-user", getIdToken: async refresh => { force.push(refresh); return "test-only-token"; } };
const auth = { currentUser: user };
const deps = {
  "./firebase": { auth, storage: {} },
  "firebase/storage": { ref: (_, path) => path, uploadBytesResumable: () => {
    let failure;
    return { cancel: () => { canceled++; failure({ code: "storage/canceled" }); }, on: (_, progress, error, done) => {
      failure = error;
      progress({ bytesTransferred: 50, totalBytes: 100 });
      if (uploadError === "hang") return;
      if (uploadError) error({ code: uploadError }); else done();
    } };
  } },
};
const module = { exports: {} };
new Function("require", "exports", "fetch", "setTimeout", "clearTimeout", code)(name => deps[name], module.exports,
  async (url, options) => { requests.push({ url, ...options }); const r = responses.shift(); if (r === "offline") throw new TypeError("network"); return Response.json(r?.body ?? {}, { status: r?.status ?? 200 }); },
  (fn, delay) => { if (delay === 120000) longTimer = fn; else queueMicrotask(fn); return fn; }, () => {});
const { registerPhoto, uploadPhotoBytes, photoError } = module.exports;
responses = [{ status: 503 }, { status: 200 }];
await registerPhoto("/api/yeon/photo", user.uid, { path: "same.jpg" });
assert.equal(requests.length, 2); assert.equal(requests[0].body, requests[1].body);
assert.deepEqual(force, [false, true]);
requests = []; responses = [{ status: 409, body: { error: "photo-limit" } }];
await assert.rejects(registerPhoto("/api/yeon/photo", user.uid, { path: "same.jpg" }), /다섯/);
assert.equal(requests.length, 1, "permanent capacity errors are not retried");
requests = []; responses = ["offline", "offline", "offline"];
await assert.rejects(registerPhoto("/api/yeon/photo", user.uid, {}), /목록을 먼저/);
assert.equal(requests.length, 3, "network retries are bounded");
auth.currentUser = { ...user, uid: "other" };
await assert.rejects(registerPhoto("/api/yeon/photo", user.uid, {}), /계정이 바뀌/);
auth.currentUser = user;
const progress = [];
await uploadPhotoBytes("test.jpg", new Blob(["test"]), "image/jpeg", n => progress.push(n));
assert.deepEqual(progress, [50]);
uploadError = "hang";
const waiting = uploadPhotoBytes("test.jpg", new Blob(["test"]), "image/jpeg");
const rejected = assert.rejects(waiting, e => e.code === "storage/canceled");
longTimer(); await rejected; assert.equal(canceled, 1);
assert(photoError({ code: "storage/canceled" }).includes("시간이 초과"));
assert(!photoError({ code: "storage/unauthorized" }).includes("npm"));
console.log("PASS: identical-path retry, token refresh, bounded offline retry, no retry on full, account switch, progress and upload timeout cancellation");
