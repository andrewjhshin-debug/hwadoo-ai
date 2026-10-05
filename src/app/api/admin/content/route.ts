// ─────────────────────────────────────────────────────────────
// 글 손보기 — 뒷방에서만.
//
// 신고함에는 쪽지·댓글·인연·법당 사연이 다 모이는데, **손쓸 단추는
// 인연에만** 있었다. 나머지는 「처리함」뿐 — 그건 신고서에 도장을
// 찍는 것이지 그 글에는 아무 일도 안 일어난다. 신고가 들어와도
// 읽는 사람 눈에는 그대로 있었다는 뜻이다.
//
// 여기서 하는 일은 셋뿐이다 —
//   hide : 가린다 (지우지 않는다 — 오신고를 되돌릴 수 있어야 한다)
//   show : 도로 보인다
//   drop : 지운다 (되돌릴 수 없다. 법으로 지워야 하는 것만)
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰> (뒷방 계정만)
// POST { kind, act, candleId?, commentId?, postId? }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, isAdminAccount } from "@/lib/config";
import { adminAudit } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idOk = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{6,180}$/.test(v);

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me: { uid: string; email?: string; verified: boolean };
  try {
    const t = await getAuth(app).verifyIdToken(token);
    me = { uid: t.uid, email: t.email, verified: !!t.email_verified };
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }
  // yeon/moderate 와 **같은 잣대**. 한쪽만 느슨하면 그쪽이 문이 된다
  const 뒷방 =
    me.uid === ADMIN_UID ||
    (me.verified && isAdminAccount({ uid: me.uid, email: me.email, emailVerified: me.verified }));
  if (!뒷방) return Response.json({ error: "not-admin" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = body?.kind;
  const act = body?.act;
  const candleId = body?.candleId;
  const commentId = body?.commentId;
  const postId = body?.postId;
  if (act !== "hide" && act !== "show" && act !== "drop")
    return Response.json({ error: "bad-act" }, { status: 400 });

  const db = getFirestore(app);
  let 칸;
  if (kind === "candle") {
    if (!idOk(candleId)) return Response.json({ error: "bad-target" }, { status: 400 });
    칸 = db.doc(`candles/${candleId}`);
  } else if (kind === "candle-comment") {
    if (!idOk(candleId) || !idOk(commentId))
      return Response.json({ error: "bad-target" }, { status: 400 });
    칸 = db.doc(`candles/${candleId}/comments/${commentId}`);
  } else if (kind === "comment") {
    if (!idOk(postId) || !idOk(commentId))
      return Response.json({ error: "bad-target" }, { status: 400 });
    칸 = db.doc(`posts/${postId}/comments/${commentId}`);
  } else {
    return Response.json({ error: "bad-kind" }, { status: 400 });
  }

  const s = await 칸.get();
  if (!s.exists) return Response.json({ error: "no-doc" }, { status: 404 });

  if (act === "drop") {
    await 칸.delete();
  } else {
    const 가린다 = act === "hide";
    // 댓글은 본문 자리를 비워 둔다 — 가렸다고 빈 칸만 남으면
    // 답글의 줄이 끊겨 대화가 안 읽힌다
    const 글인가 = kind !== "candle";
    await 칸.set(
      {
        held: 가린다,
        heldAt: 가린다 ? Date.now() : null,
        ...(글인가 && 가린다 ? { body: "가려진 댓글입니다." } : {}),
      },
      { merge: true }
    );
  }

  await adminAudit(db, {
    by: me.uid,
    action: `content:${act}`,
    target: String(candleId ?? postId ?? ""),
    detail: { kind, commentId: commentId ?? null },
  }).catch(() => {});
  return Response.json({ ok: true });
}
