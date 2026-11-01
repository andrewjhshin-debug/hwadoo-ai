// 쪽지 보내기 — 서버가 적는다.
//
// 형: 「쪽지방 파는 거만 연꽃 받고, 쪽지 보낼 때마다는 과금 안 한다」
// 방이 열려 있으면(쪽지방 열기 🪷3 를 누가 냈으면) 무제한 무료. 브라우저는 쪽지 낱장을
// 직접 못 쓴다(규칙에서 잠갔다) — 여기를 지나야만 쌓인다.
//
// POST { thread, body }    → 보낸다
// POST { thread, seen }    → 읽었다(값 없음)
// POST { thread, buyRead } → 읽음 확인 🪷2, 이레
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { DM_READ_PASS } from "@/lib/dmLadder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{6,64}$/;
const DAY = 86_400_000;
type 방 = { members?: string[]; status?: string; msgCount?: number };

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "", email: string | undefined;
  try {
    const d = await getAuth(app).verifyIdToken(token);
    uid = d.uid;
    email = d.email_verified ? d.email : undefined;
  } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const threadId = typeof b?.thread === "string" && ID.test(b.thread) ? b.thread : "";
  if (!threadId) return Response.json({ error: "bad-thread" }, { status: 400 });
  const 주인 = isAdminAccount({ uid, email, emailVerified: !!email });
  const db = getFirestore(app);
  const ref = db.doc(`dm-threads/${threadId}`);

  // ── 읽었다 — 방을 열면 적는다(값 없음). 읽음 확인을 산 상대만 이걸 본다 ──
  if (b?.seen === true) {
    const t = (await ref.get()).data() as 방 | undefined;
    if (!t?.members?.includes(uid)) return Response.json({ error: "not-member" }, { status: 403 });
    // 방 문서가 아니라 dm-read/{방} 에 — 방 문서는 멤버가 읽을 수 있어 값 없이 새어 나간다.
    // 이 문서엔 규칙 칸이 없다(손님은 못 읽는다). 읽음 확인을 산 사람에게만 /api/dm/threads 가 준다
    await db.doc(`dm-read/${threadId}`).set({ [uid]: Date.now() }, { merge: true });
    return Response.json({ ok: true });
  }

  // ── 읽음 확인 사기 — 🪷2, 이레. 내 쪽지를 상대가 읽었나 보인다 ──
  if (b?.buyRead === true) {
    const out = await db.runTransaction(async (tx) => {
      const t = (await tx.get(ref)).data() as (방 & { readPassUntil?: Record<string, number> }) | undefined;
      if (!t?.members?.includes(uid) || t.status !== "accepted") return { error: "not-member", status: 403 };
      if (!주인 && !(await 연꽃쓰기(tx, db, uid, DM_READ_PASS.n, "dm-read-pass"))) return { error: "need-lotus", status: 402 };
      const readPassUntil = { ...(t.readPassUntil ?? {}) };
      readPassUntil[uid] = Math.max(Date.now(), readPassUntil[uid] ?? 0) + DM_READ_PASS.days * DAY;
      tx.update(ref, { readPassUntil });
      return { readPassUntil };
    });
    if ("error" in out) return Response.json({ error: out.error }, { status: out.status });
    return Response.json({ ok: true, readPassUntil: out.readPassUntil });
  }

  // ── 보내기 ──
  const text = typeof b?.body === "string" ? b.body.trim().slice(0, 500) : "";
  if (!text) return Response.json({ error: "empty" }, { status: 400 });
  const out = await db.runTransaction(async (tx) => {
    const t = (await tx.get(ref)).data() as 방 | undefined;
    if (!t?.members?.includes(uid) || t.status !== "accepted") return { error: "not-member", status: 403 };
    tx.set(ref.collection("messages").doc(), { body: text, uid, createdAt: FieldValue.serverTimestamp() });
    tx.update(ref, { lastText: text.slice(0, 30), lastBy: uid, lastAt: FieldValue.serverTimestamp(), msgCount: FieldValue.increment(1) });
    return { msgCount: (t.msgCount ?? 0) + 1 };
  });
  if ("error" in out) return Response.json({ error: out.error }, { status: out.status });
  return Response.json({ ok: true, msgCount: out.msgCount });
}
