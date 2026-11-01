// 쪽지 청하기 — 연꽃 차감과 대화 생성을 서버 거래 하나로 묶는다.
// 같은 요청을 두 번 눌러도 같은 방 하나만 돌려준다.

import { createHash } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 알림쓰기 } from "@/lib/alertsServer";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { DM_REQUEST, DM_SINCERE } from "@/lib/dmLadder";

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
  const sincere = body?.sincere === true;
  if (!postId || !/^[A-Za-z0-9]{6,64}$/.test(targetUid) || !targetName || targetUid === uid)
    return Response.json({ error: "bad-request" }, { status: 400 });
  // 샘플 글의 가짜 계정에는 쪽지가 가지 않는다 — 값을 받고 없는 사람에게 보내면 기만이다
  if (targetUid.startsWith("hwaduSample")) return Response.json({ error: "sample" }, { status: 409 });

  const db = getFirestore(app);
  const id = createHash("sha256").update(`${uid}|${targetUid}|${postId}`).digest("hex").slice(0, 40);
  const thread = db.doc(`dm-threads/${id}`);
  const day = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const limit = db.doc(`dm-request-limits/${uid}_${day}`);
  const free = isAdminAccount({ uid, email, emailVerified: !!email });
  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(thread);
    if (existing.exists) return { exists: true, thread: { id, ...existing.data() } };
    const used = (await tx.get(limit)).data()?.count;
    if (typeof used === "number" && used >= 5) return { limited: true };
    // 형: 「쪽지 연꽃 1개는 너무 싸다」 — 청하기 3, 진심 쪽지 5
    if (!free && !(await 연꽃쓰기(tx, db, uid, sincere ? DM_SINCERE : DM_REQUEST, sincere ? "dm-sincere" : "dm-request")))
      return { needLotus: true };
    const data = {
      postId, postTitle, meetDate, requesterUid: uid, requesterName,
      ownerUid: targetUid, ownerName: targetName, members: [uid, targetUid], intro,
      ...(sincere ? { sincere: true } : {}),
      status: "pending" as const, createdAt: FieldValue.serverTimestamp(), lastAt: FieldValue.serverTimestamp(),
    };
    tx.create(thread, data);
    tx.set(limit, { uid, day, count: (typeof used === "number" ? used : 0) + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { exists: false, thread: { id, ...data } };
  });
  if ("needLotus" in result) return Response.json({ error: "need-lotus" }, { status: 402 });
  if ("limited" in result) return Response.json({ error: "daily-limit" }, { status: 429 });
  // 받는 이에게 쪽지 알림(인연판 종)
  // 누가 청했나는 「다 보기」(🪷1)를 내야 보인다 — 알림에서 먼저 새면 값이 무너진다. 진심 쪽지만 이름을 싣는다
  if (!result.exists)
    await 알림쓰기(db, targetUid, `dm_${id}`, sincere
      ? { kind: "dm", text: `${requesterName || "누군가"}님이 진심 쪽지를 청했어요`, threadId: id, by: requesterName }
      : { kind: "dm", text: "누군가 쪽지를 청했어요", threadId: id });
  return Response.json({ ok: true, already: result.exists, thread: result.thread });
}
