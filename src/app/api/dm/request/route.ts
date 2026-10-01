// 쪽지 청하기 — 연꽃 차감과 대화 생성을 서버 거래 하나로 묶는다.
// 같은 요청을 두 번 눌러도 같은 방 하나만 돌려준다.

import { createHash } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 지갑열기 } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "", email: string | undefined;
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email_verified ? decoded.email : undefined;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const postId = typeof body?.postId === "string" ? body.postId.slice(0, 120) : "";
  const targetUid = typeof body?.targetUid === "string" ? body.targetUid : "";
  const targetName = typeof body?.targetName === "string" ? body.targetName.trim().slice(0, 40) : "";
  const requesterName = typeof body?.requesterName === "string" ? body.requesterName.trim().slice(0, 40) : "수행자";
  const postTitle = typeof body?.postTitle === "string" ? body.postTitle.trim().slice(0, 120) : "";
  const meetDate = typeof body?.meetDate === "string" ? body.meetDate.slice(0, 30) : null;
  const intro = typeof body?.intro === "string" ? body.intro.trim().slice(0, 200) : "";
  if (!postId || !/^[A-Za-z0-9]{6,64}$/.test(targetUid) || !targetName || targetUid === uid)
    return Response.json({ error: "bad-request" }, { status: 400 });

  const db = getFirestore(app);
  const id = createHash("sha256").update(`${uid}|${targetUid}|${postId}`).digest("hex").slice(0, 40);
  const thread = db.doc(`dm-threads/${id}`);
  const wallet = db.doc(`wallets/${uid}`);
  const day = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const limit = db.doc(`dm-request-limits/${uid}_${day}`);
  const free = isAdminAccount({ uid, email, emailVerified: !!email });
  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(thread);
    if (existing.exists) return { exists: true, thread: { id, ...existing.data() } };
    const used = (await tx.get(limit)).data()?.count;
    if (typeof used === "number" && used >= 5) return { limited: true };
    if (!free) {
      const { 지갑 } = await 지갑열기(tx, wallet);
      if (지갑.lotus < 1) return { needLotus: true };
      const freeUse = Math.min(지갑.free, 1);
      tx.set(wallet, { lotus: 지갑.lotus - 1, free: 지갑.free - freeUse, paid: 지갑.paid - (1 - freeUse) }, { merge: true });
      tx.set(db.collection(`wallet-log/${uid}/list`).doc(), {
        n: -1, free: -freeUse, paid: -(1 - freeUse), why: "dm-request", at: FieldValue.serverTimestamp(),
      });
    }
    const data = {
      postId, postTitle, meetDate, requesterUid: uid, requesterName,
      ownerUid: targetUid, ownerName: targetName, members: [uid, targetUid], intro,
      status: "pending" as const, createdAt: FieldValue.serverTimestamp(), lastAt: FieldValue.serverTimestamp(),
    };
    tx.create(thread, data);
    tx.set(limit, { uid, day, count: (typeof used === "number" ? used : 0) + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { exists: false, thread: { id, ...data } };
  });
  if ("needLotus" in result) return Response.json({ error: "need-lotus" }, { status: 402 });
  if ("limited" in result) return Response.json({ error: "daily-limit" }, { status: 429 });
  return Response.json({ ok: true, already: result.exists, thread: result.thread });
}
