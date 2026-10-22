import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("require", "exports", code)(name => { if (!(name in deps)) throw new Error(`unexpected dependency: ${name}`); return deps[name]; }, module.exports);
  return module.exports;
}
const config = load("src/lib/storageConfig.ts");
const noBucket = initializeApp({ projectId: "demo-yeon-test" }, "yeon-no-bucket");
assert.throws(() => getStorage(noBucket).bucket(), /bucket/i, "reproduce old missing default bucket");
await deleteApp(noBucket);
const configured = initializeApp({ projectId: "demo-yeon-test", storageBucket: config.PHOTO_BUCKET }, "yeon-with-bucket");
assert.equal(getStorage(configured).bucket().name, config.PHOTO_BUCKET);
await deleteApp(configured);

const policy = load("src/lib/yeonPhotoPolicy.ts");
assert(policy.validPhotoMetadata(1024, "image/jpeg"));
for (const [size, type] of [[0, "image/jpeg"], [8 * 1024 * 1024, "image/png"], [20, "image/svg+xml"], [NaN, "image/jpeg"]]) assert(!policy.validPhotoMetadata(size, type));
const signing = load("src/lib/yeonPhotoServer.ts", { "firebase-admin/storage": { getStorage: () => ({}) } });
assert(signing.isYeonPhotoPath("alice", "yeon/alice/test-uuid.jpg"));
for (const path of ["yeon/bob/test.jpg", "yeon/alice/../bob/test.jpg", "yeon/alice/a/b.jpg", "yeon/alice/file.svg"]) assert(!signing.isYeonPhotoPath("alice", path));

const docs = new Map();
let queue = Promise.resolve();
let storageFailed = false;
const db = {
  doc: path => ({ path, get: async () => snapshot(path) }),
  runTransaction: fn => {
    const result = queue.then(() => fn({ get: async ref => snapshot(ref.path), set: (ref, patch) => docs.set(ref.path, { ...docs.get(ref.path), ...patch }), delete: ref => docs.delete(ref.path) }));
    queue = result.catch(() => {});
    return result;
  },
};
const snapshot = path => ({ exists: docs.has(path), data: () => docs.get(path) });
const storage = { bucket: () => ({ file: path => ({
  getMetadata: async () => {
    if (storageFailed) throw { code: 503 };
    if (path.endsWith("missing.jpg")) throw { code: 404 };
    return [{ size: path.endsWith("oversize.jpg") ? 9 * 1024 * 1024 : 1200, contentType: "image/jpeg" }];
  },
  delete: async () => {},
}) }) };
const deps = {
  "firebase-admin/auth": { getAuth: () => ({ verifyIdToken: async uid => { if (uid === "invalid") throw new Error(); return { uid }; } }) },
  "firebase-admin/firestore": { getFirestore: () => db },
  "firebase-admin/storage": { getStorage: () => storage },
  "@/lib/firebaseAdmin": { adminApp: () => ({}) },
  "@/lib/yeonPhotoPolicy": policy,
  "@/lib/yeonPhotoServer": { ...signing, shortPhotoUrl: async (_, path) => `https://example.invalid/${path}` },
};
const route = load("src/app/api/yeon/photo/route.ts", deps);
const request = (uid, path, method = "POST") => new Request("https://test.invalid/api/yeon/photo", {
  method, headers: uid ? { authorization: `Bearer ${uid}`, "content-type": "application/json" } : {},
  body: method === "GET" ? undefined : JSON.stringify({ path }),
});
assert.equal((await route.POST(request("", "yeon/a/a.jpg"))).status, 401);
assert.equal((await route.POST(request("invalid", "yeon/a/a.jpg"))).status, 401);
assert.equal((await route.POST(request("alice", "yeon/bob/a.jpg"))).status, 400);
assert.equal((await route.POST(request("alice", "yeon/alice/oversize.jpg"))).status, 400);
assert.equal((await route.POST(request("alice", "yeon/alice/missing.jpg"))).status, 404);
storageFailed = true;
assert.equal((await route.POST(request("alice", "yeon/alice/a.jpg"))).status, 503, "storage failure is not disguised as a missing file");
storageFailed = false;

// Many simultaneous distinct uploads cannot exceed five or overwrite each other.
const results = await Promise.all(Array.from({ length: 30 }, (_, i) => route.POST(request("alice", `yeon/alice/p${i}.jpg`))));
assert.equal(results.filter(r => r.status === 200).length, 5);
assert.equal(results.filter(r => r.status === 409).length, 25);
assert.equal(docs.get("yeon-profiles/alice").photos.length, 5);
assert(docs.get("yeon-profiles/alice").photos.every(p => p.state === "pending"));
const duplicate = await route.POST(request("alice", "yeon/alice/p0.jpg"));
assert.equal(duplicate.status, 200);
assert.equal((await duplicate.json()).again, true, "retry is accepted even when the profile is full");

// A signup burst: isolated per-user limits, no shared global hot document.
await Promise.all(Array.from({ length: 200 }, (_, user) => Promise.all(Array.from({ length: 5 }, (_, image) => {
  const uid = `user${user}`;
  return route.POST(request(uid, `yeon/${uid}/p${image}.jpg`));
}))));
for (let user = 0; user < 200; user++) assert.equal(docs.get(`yeon-profiles/user${user}`).photos.length, 5);
await route.DELETE(request("alice", "yeon/alice/p0.jpg", "DELETE"));
assert.equal(docs.get("yeon-profiles/alice").photos.length, 4);
assert.equal((await route.POST(request("alice", "yeon/alice/replacement.jpg"))).status, 200);
assert.equal(docs.get("yeon-profiles/alice").photos.length, 5);
const proof = load("src/app/api/yeon/proof/route.ts", deps);
const proofGet = await Promise.all(Array.from({ length: 10 }, () => proof.GET(request("proofUser", "", "GET"))));
assert.equal(proofGet.filter(r => r.status === 200).length, 1, "challenge issue rate is atomic");
const challenge = docs.get("yeon-proof-challenges/proofUser");
const proofReq = path => new Request("https://test.invalid/api/yeon/proof", { method: "POST", headers: { authorization: "Bearer proofUser", "content-type": "application/json" }, body: JSON.stringify({ path, code: challenge.code }) });
const proofResponses = await Promise.all(Array.from({ length: 6 }, () => proof.POST(proofReq("yeon-proof/proofUser/one.jpg"))));
assert(proofResponses.every(r => r.status === 200), "lost proof response retries are idempotent");
assert.equal((await proof.POST(proofReq("yeon-proof/proofUser/two.jpg"))).status, 409);
const moderate = load("src/app/api/yeon/moderate/route.ts", {
  ...deps,
  "@/lib/config": { ADMIN_UID: "test-admin", isAdminAccount: () => false },
  "@/lib/adminAudit": { adminAudit: async () => {} },
  "@/lib/yeonPhotoServer": { revokeLegacyPhotoUrl: async () => {} },
});
await route.DELETE(request("user17", "yeon/user17/p0.jpg", "DELETE"));
const moderation = new Request("https://test.invalid/api/yeon/moderate", { method: "POST", headers: { authorization: "Bearer test-admin", "content-type": "application/json" }, body: JSON.stringify({ uid: "user17", path: "yeon/user17/p1.jpg", act: "photo-ok" }) });
const racing = await Promise.all([
  moderate.POST(moderation),
  route.POST(request("user17", "yeon/user17/new.jpg")),
]);
assert(racing.every(r => r.status === 200));
const afterModeration = docs.get("yeon-profiles/user17");
assert.equal(afterModeration.photos.length, 5);
assert(afterModeration.photos.some(p => p.path === "yeon/user17/new.jpg"));
assert.equal(afterModeration.photos.find(p => p.path.endsWith("p1.jpg")).state, "ok");
assert.equal(afterModeration.approvedPhotoCount, 1);
console.log("PASS: actual SDK bucket regression; metadata/path/auth validation; duplicate replay; 30 same-user submissions; 200 simulated signups/1000 registrations; delete/replacement");
console.log("PASS: atomic proof challenge rate limit and idempotent proof submission");
console.log("PASS: simultaneous admin approval and photo registration preserve both changes");
console.log("Simulation uses mocked storage/transaction scheduling, not production load or real user photos.");
