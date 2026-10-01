// 즉석 인증 사진 등록. 동작 표시는 서버가 먼저 고르고, 사진은 관리자만 본다.
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebaseAdmin";

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
  const prior = (await db.doc(`yeon-proof-challenges/${who.uid}`).get()).data();
  // 카메라 인증은 다시 찍을 수 있지만, 자동 호출로 심사 대기열을 쌓지는 못한다.
  if (typeof prior?.issuedAt === "number" && now - prior.issuedAt < 60_000)
    return Response.json({ error: "proof-wait", wait: Math.ceil((60_000 - (now - prior.issuedAt)) / 1000) }, { status: 429 });
  const gesture = gestures[Math.floor(Math.random() * gestures.length)];
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  const until = now + 10 * 60_000;
  await db.doc(`yeon-proof-challenges/${who.uid}`).set({ gesture, code, until, issuedAt: now });
  return Response.json({ gesture, code, until });
}

export async function POST(req: Request) {
  const who = await caller(req);
  if (!who) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { path?: unknown; code?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";
  const code = typeof body?.code === "string" ? body.code : "";
  if (!path.startsWith(`yeon-proof/${who.uid}/`) || !/^[A-Za-z0-9._/-]{1,220}$/.test(path))
    return Response.json({ error: "bad-proof" }, { status: 400 });
  const db = getFirestore(who.app);
  const existing = (await db.doc(`yeon-profiles/${who.uid}`).get()).data()?.photoProof;
  if (existing?.state === "pending") return Response.json({ error: "proof-pending" }, { status: 409 });
  const challenge = (await db.doc(`yeon-proof-challenges/${who.uid}`).get()).data();
  if (!challenge || challenge.code !== code || Date.now() > challenge.until)
    return Response.json({ error: "expired-challenge" }, { status: 409 });
  const [exists] = await getStorage(who.app).bucket().file(path).exists();
  if (!exists) return Response.json({ error: "missing-file" }, { status: 404 });
  const now = Date.now();
  await db.doc(`yeon-profiles/${who.uid}`).set({
    photoProof: { path, gesture: challenge.gesture, state: "pending", at: now, expiresAt: now + 30 * 86_400_000 },
  }, { merge: true });
  await db.doc(`yeon-proof-challenges/${who.uid}`).delete();
  return Response.json({ ok: true });
}
