// 쪽지 보내기 · 이용권 사기 — 서버가 센다.
//
// 형: 「쪽지하고 받고 그러다가 번호 공개, 거기서 내가 돈 벌 궁리가 적잖아」
// 한 방에서 둘이 합쳐 열 마디(DM_FREE_MSGS)까지는 그냥 오간다. 그다음은
// 이용권(하루·7일·둘 다 7일·다시 열기)이 있어야 보낸다. 브라우저는 쪽지 낱장을
// 직접 못 쓴다(규칙에서 잠갔다) — 여기를 지나야만 쌓인다.
//
// POST { thread, body }  → 보낸다. 막히면 402 need-pass
// POST { thread, buy }   → 이용권을 산다(buy = day | week | both | reopen)
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { DM_PASSES, type DmPass, 보낼수있나, 끝난이용권 } from "@/lib/dmLadder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{6,64}$/;
const DAY = 86_400_000;
type 방 = { members?: string[]; status?: string; msgCount?: number; passUntil?: Record<string, number> };

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

  // ── 이용권 사기 ──
  if (typeof b?.buy === "string") {
    // 제 칸만 — "constructor" 같은 원형 이름으로 값표를 빠져나가지 못하게
    if (typeof b.buy !== "string" || !Object.hasOwn(DM_PASSES, b.buy)) return Response.json({ error: "bad-pass" }, { status: 400 });
    const kind = b.buy as DmPass;
    const p = DM_PASSES[kind];
    if (!p) return Response.json({ error: "bad-pass" }, { status: 400 });
    const out = await db.runTransaction(async (tx) => {
      const t = (await tx.get(ref)).data() as 방 | undefined;
      if (!t?.members?.includes(uid) || t.status !== "accepted") return { error: "not-member", status: 403 };
      // 「다시 열기」는 이용권이 있었다가 끝난 사람에게만 — 싼 7일이라 아무나 못 산다
      if (kind === "reopen" && !끝난이용권(t, uid)) return { error: "not-expired", status: 409 };
      if (!주인 && !(await 연꽃쓰기(tx, db, uid, p.n, `dm-pass-${kind}`))) return { error: "need-lotus", status: 402 };
      const now = Date.now();
      const 누구 = p.both ? t.members : [uid];
      const passUntil = { ...(t.passUntil ?? {}) };
      // 남은 날 위에 얹는다 — 아직 남았는데 사서 손해 보는 일이 없게
      for (const m of 누구) passUntil[m] = Math.max(now, passUntil[m] ?? 0) + p.days * DAY;
      tx.update(ref, { passUntil });
      return { passUntil };
    });
    if ("error" in out) return Response.json({ error: out.error }, { status: out.status });
    return Response.json({ ok: true, passUntil: out.passUntil });
  }

  // ── 보내기 ──
  const text = typeof b?.body === "string" ? b.body.trim().slice(0, 500) : "";
  if (!text) return Response.json({ error: "empty" }, { status: 400 });
  const out = await db.runTransaction(async (tx) => {
    const t = (await tx.get(ref)).data() as 방 | undefined;
    if (!t?.members?.includes(uid) || t.status !== "accepted") return { error: "not-member", status: 403 };
    if (!주인 && !보낼수있나(t, uid)) return { error: "need-pass", status: 402 };
    tx.set(ref.collection("messages").doc(), { body: text, uid, createdAt: FieldValue.serverTimestamp() });
    tx.update(ref, { lastText: text.slice(0, 30), lastBy: uid, lastAt: FieldValue.serverTimestamp(), msgCount: FieldValue.increment(1) });
    return { msgCount: (t.msgCount ?? 0) + 1 };
  });
  if ("error" in out) return Response.json({ error: out.error }, { status: out.status });
  return Response.json({ ok: true, msgCount: out.msgCount });
}
