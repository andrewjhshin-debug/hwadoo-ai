// 즉석 인증 사진 등록. 동작 표시는 서버가 먼저 고르고, 사진은 관리자만 본다.
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebaseAdmin";
import { validPhotoMetadata } from "@/lib/yeonPhotoPolicy";
import { isYeonProofPath } from "@/lib/yeonPhotoServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const gestures = ["오른손으로 브이", "왼손을 볼에", "두 손 모으기"];

async function caller(req: Request) {
  const app = adminApp();
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!app || !token) return null;
  try { return { app, uid: (await getAuth(app).verifyIdToken(token)).uid }; } catch { return null; }
}

export async function GET(req: Request) {
  const who = await caller(req);
  if (!who) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = getFirestore(who.app);
  const now = Date.now();
  const gesture = gestures[Math.floor(Math.random() * gestures.length)];
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  const until = now + 10 * 60_000;
  const wait = await db.runTransaction(async tx => {
    const ref = db.doc(`yeon-proof-challenges/${who.uid}`);
    const prior = (await tx.get(ref)).data();
    if (typeof prior?.issuedAt === "number" && now - prior.issuedAt < 60_000)
      return Math.ceil((60_000 - (now - prior.issuedAt)) / 1000);
    tx.set(ref, { gesture, code, until, issuedAt: now });
    return 0;
  });
  if (wait) return Response.json({ error: "proof-wait", wait }, { status: 429, headers: { "Retry-After": String(wait) } });
  return Response.json({ gesture, code, until });
}

export async function POST(req: Request) {
  const who = await caller(req);
  if (!who) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { path?: unknown; code?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  const code = typeof body?.code === "string" ? body.code : "";
  if (!isYeonProofPath(who.uid, path))
    return Response.json({ error: "bad-proof" }, { status: 400 });
  const db = getFirestore(who.app);
  try {
    const [meta] = await getStorage(who.app).bucket().file(path).getMetadata();
    if (!validPhotoMetadata(meta.size, meta.contentType)) return Response.json({ error: "invalid-file" }, { status: 400 });
    const result = await db.runTransaction(async tx => {
      const profileRef = db.doc(`yeon-profiles/${who.uid}`);
      const challengeRef = db.doc(`yeon-proof-challenges/${who.uid}`);
      const [profile, challengeDoc] = await Promise.all([tx.get(profileRef), tx.get(challengeRef)]);
      const existing = profile.data()?.photoProof;
      if (existing?.path === path) return "ok";
      if (existing?.state === "pending") return "proof-pending";
      const challenge = challengeDoc.data();
      if (!challenge || challenge.code !== code || Date.now() > challenge.until) return "expired-challenge";
      const now = Date.now();
      tx.set(profileRef, { photoProof: { path, gesture: challenge.gesture, state: "pending", at: now, expiresAt: now + 30 * 86_400_000 } }, { merge: true });
      tx.delete(challengeRef);
      return "ok";
    });
    return result === "ok" ? Response.json({ ok: true }) : Response.json({ error: result }, { status: 409 });
  } catch (error) {
    const missing = (error as { code?: number }).code === 404;
    console.error("yeon-proof-register", { code: (error as { code?: unknown }).code });
    return Response.json({ error: missing ? "missing-file" : "temporarily-unavailable" }, { status: missing ? 404 : 503 });
  }
}
