// ─────────────────────────────────────────────────────────────
// 인연판 알림 울리기 — 브라우저가 무언가를 한 **뒤에** 부른다.
// 브라우저 말은 믿지 않는다: 문서를 다시 읽어 정말 그 사람이 한 일인지 본다.
//
//   { kind: "comment", postId, commentId } → 글쓴이(활동), 답글이면 윗댓글 쓴이도
//   { kind: "like", postId }               → 글쓴이(호감)
//   { kind: "post", postId }               → 키워드 건 사람들(키워드)
//   { kind: "dm-accept", threadId }        → 청한 사람(쪽지)
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 걸린말, 알림쓰기 } from "@/lib/alertsServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_-]{6,64}$/;
const 줄임 = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = b?.kind;
  const postId = typeof b?.postId === "string" && ID.test(b.postId) ? b.postId : "";
  const db = getFirestore(app);

  if (kind === "dm-accept") {
    const threadId = typeof b?.threadId === "string" && ID.test(b.threadId) ? b.threadId : "";
    const t = threadId ? (await db.doc(`dm-threads/${threadId}`).get()).data() : undefined;
    if (!t || t.ownerUid !== uid || t.status !== "accepted") return Response.json({ error: "no" }, { status: 400 });
    await 알림쓰기(db, t.requesterUid, `dma_${threadId}`, { kind: "dm", text: `${t.ownerName ?? "상대"}님이 쪽지를 받았어요`, threadId, by: t.ownerName });
    return Response.json({ ok: true });
  }

  if (!postId) return Response.json({ error: "bad-post" }, { status: 400 });
  const 글 = (await db.doc(`posts/${postId}`).get()).data();
  // 인연판 글만 — 내려진 글은 울리지 않는다
  if (!글 || 글.board !== "gathering" || 글.deleted) return Response.json({ error: "no-post" }, { status: 404 });
  const 제목 = 줄임(글.title, 30);

  if (kind === "comment") {
    const commentId = typeof b?.commentId === "string" && ID.test(b.commentId) ? b.commentId : "";
    const c = commentId ? (await db.doc(`posts/${postId}/comments/${commentId}`).get()).data() : undefined;
    if (!c || c.authorUid !== uid) return Response.json({ error: "no-comment" }, { status: 400 });
    const 누구 = 줄임(c.authorName, 12) || "누군가";
    if (글.authorUid !== uid)
      await 알림쓰기(db, 글.authorUid, `c_${commentId}`, { kind: "activity", text: `${누구}님이 내 글에 댓글: ${줄임(c.body, 30)}`, postId, by: 누구 });
    if (typeof c.parentId === "string" && ID.test(c.parentId)) {
      const 윗 = (await db.doc(`posts/${postId}/comments/${c.parentId}`).get()).data();
      if (윗 && 윗.authorUid !== uid && 윗.authorUid !== 글.authorUid)
        await 알림쓰기(db, 윗.authorUid, `r_${commentId}`, { kind: "activity", text: `${누구}님이 내 댓글에 답글: ${줄임(c.body, 30)}`, postId, by: 누구 });
    }
    return Response.json({ ok: true });
  }

  if (kind === "like") {
    if (글.authorUid === uid) return Response.json({ ok: true });
    if (!(await db.doc(`posts/${postId}/likes/${uid}`).get()).exists) return Response.json({ error: "no-like" }, { status: 400 });
    // 한 사람이 한 글에 한 번 — 거뒀다 다시 눌러도 열쇠가 같다
    await 알림쓰기(db, 글.authorUid, `like_${postId}_${uid}`, { kind: "like", text: `누군가 내 글에 합장했어요: ${제목}`, postId });
    return Response.json({ ok: true });
  }

  if (kind === "post") {
    if (글.authorUid !== uid) return Response.json({ error: "not-author" }, { status: 403 });
    // ponytail: 키워드 문서를 통째로 훑는다 — 수천 명까지는 한 번 읽기로 충분.
    //           넘치면 낱말별 색인(alert-words/{낱말}.uids)으로 바꾼다.
    // 글 하나에 한 번만 훑는다 — 같은 글로 몇 번을 불러도 두 번째부턴 바로 끝(읽기 값 폭주 막기)
    try { await db.doc(`alert-fanout/${postId}`).create({ at: Date.now() }); } catch { return Response.json({ ok: true, again: true }); }
    const 판 = `${글.title ?? ""} ${글.body ?? ""}`;
    const 모두 = await db.collection("alert-keywords").get();
    await Promise.all(
      모두.docs.map((d) => {
        if (d.id === uid) return null;
        const k = 걸린말(d.data().words, 판);
        return k ? 알림쓰기(db, d.id, `kw_${postId}`, { kind: "keyword", text: `'${k}' 새 글: ${제목}`, postId }) : null;
      })
    );
    return Response.json({ ok: true });
  }

  return Response.json({ error: "bad-kind" }, { status: 400 });
}
