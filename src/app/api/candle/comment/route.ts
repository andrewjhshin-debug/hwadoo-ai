// ─────────────────────────────────────────────────────────────
// 사연 댓글 — 쓰기 · 좋아요 · 답글.
//
// 형: 「연등마다 유튜브 슬픈 노래처럼 사연이랑 댓글 달도록 하자」
//     「좋아요·답글」
//
// 댓글은 `candles/{초}/comments` 에 산다. 규칙으로는 아예 안 열고
// **여기(Admin SDK)로만** 드나든다 — 공개된 등인지, 아직 타고 있는지,
// 한 사람이 한 번만 눌렀는지를 문 앞에서 다 보고 들인다.
//
// 좋아요는 세는 수(`likes`)와 누가 눌렀나(`comment-likes/{댓글}_{uid}`)를
// 따로 둔다. 읽을 때 세면 백 명이면 백 번 읽는다.
//
// 답글은 새 갈래를 안 판다 — 같은 칸에 `to`(어미 댓글 id) 한 줄만
// 붙인다. 한 겹까지만 접힌다(답글의 답글은 같은 겹에 붙는다) —
// 겹이 깊어지면 폰에서 글이 벽에 붙는다.
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX = 240;

/** 토큰이 있으면 누구인지 알려 준다 — 없으면 손님 */
async function 누구(app: ReturnType<typeof adminApp>, req: Request) {
  const t = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!t || !app) return null;
  try { return (await getAuth(app).verifyIdToken(t)).uid; } catch { return null; }
}

export async function GET(req: Request) {
  const app = adminApp();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!app || !id) return Response.json({ comments: [], liked: [] });
  const db = getFirestore(app);
  const uid = await 누구(app, req);

  const snap = await db
    .collection(`candles/${id}/comments`)
    .orderBy("createdAt", "asc")
    .limit(200)
    .get()
    .catch(() => null);
  const comments =
    snap?.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        by: x.by ?? "이름 없는 이",
        body: x.body ?? "",
        to: typeof x.to === "string" ? x.to : null,
        likes: typeof x.likes === "number" ? x.likes : 0,
      };
    }) ?? [];

  // 내가 누른 것 — 로그인했을 때만 묻는다
  let liked: string[] = [];
  if (uid && comments.length) {
    const ls = await db
      .collection(`candles/${id}/comment-likes`)
      .where("uid", "==", uid)
      .limit(200)
      .get()
      .catch(() => null);
    liked = ls?.docs.map((d) => String(d.data().cid)) ?? [];
  }
  return Response.json({ comments, liked });
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const uid = await 누구(app, req);
  if (!uid) return Response.json({ error: "no-token" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { id?: unknown; body?: unknown; by?: unknown; to?: unknown; act?: unknown; cid?: unknown }
    | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "bad-body" }, { status: 400 });

  const db = getFirestore(app);
  const candle = await db.doc(`candles/${id}`).get();
  const c = candle.data();
  if (!candle.exists || c?.visibility !== "public" || Number(c?.until) <= Date.now()) {
    return Response.json({ error: "not-public" }, { status: 404 });
  }

  // ── 좋아요 — 한 사람이 한 번. 두 번 누르면 거둔다 ──────────
  if (body?.act === "like") {
    const cid = typeof body.cid === "string" ? body.cid : "";
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(cid)) return Response.json({ error: "bad-id" }, { status: 400 });
    const 댓글 = db.doc(`candles/${id}/comments/${cid}`);
    const 표 = db.doc(`candles/${id}/comment-likes/${cid}_${uid}`);
    const on = await db.runTransaction(async (tx) => {
      // 읽기를 다 하고 쓴다
      const [pS, tS] = await Promise.all([tx.get(댓글), tx.get(표)]);
      if (!pS.exists) return null;
      if (tS.exists) {
        tx.delete(표);
        tx.set(댓글, { likes: FieldValue.increment(-1) }, { merge: true });
        return false;
      }
      tx.set(표, { cid, uid, at: FieldValue.serverTimestamp() });
      tx.set(댓글, { likes: FieldValue.increment(1) }, { merge: true });
      return true;
    });
    if (on === null) return Response.json({ error: "no-comment" }, { status: 404 });
    return Response.json({ ok: true, on });
  }

  // ── 쓰기 · 답글 ─────────────────────────────────────────
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, MAX) : "";
  const by = typeof body?.by === "string" ? body.by.trim().slice(0, 24) : "이름 없는 이";
  if (!text) return Response.json({ error: "bad-body" }, { status: 400 });

  // 어미가 있으면 답글. **한 겹까지만** — 답글에 단 답글은 그 어미에 붙는다
  let to: string | null = null;
  if (typeof body?.to === "string" && /^[A-Za-z0-9_-]{4,80}$/.test(body.to)) {
    const p = await db.doc(`candles/${id}/comments/${body.to}`).get();
    if (p.exists) to = typeof p.data()?.to === "string" ? String(p.data()!.to) : body.to;
  }

  const ref = await db.collection(`candles/${id}/comments`).add({
    uid, by, body: text, to, likes: 0, createdAt: FieldValue.serverTimestamp(),
  });
  return Response.json({ ok: true, id: ref.id });
}
