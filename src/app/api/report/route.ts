// 신고 접수 — 브라우저가 reports에 바로 쓰게 두면 같은 계정이 무한히
// 신고를 밀어 넣을 수 있다. 서버가 대상·횟수·자동 보호 조치를 함께 본다.

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW = 7 * 86_400_000;
const HOLD_AT = 3;
const uidOk = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(value);
const idOk = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{6,180}$/.test(value);

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind;
  const targetUid = body?.targetUid;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  // 법당 사연(공개 초)과 그 댓글에도 신고 길을 낸다.
  // 여태 쪽지·사연판 댓글·인연 셋뿐이라, **사람이 제일 많이 읽는 글**인
  // 법당 사연에는 신고할 데가 없었다.
  const 갈래들 = ["dm", "comment", "yeon", "candle", "candle-comment"] as const;
  if (
    typeof kind !== "string" ||
    !(갈래들 as readonly string[]).includes(kind) ||
    !uidOk(targetUid) ||
    targetUid === uid ||
    !reason
  )
    return Response.json({ error: "bad-report" }, { status: 400 });

  const db = getFirestore(app);
  const threadId = body?.threadId;
  const postId = body?.postId;
  const commentId = body?.commentId;
  const candleId = body?.candleId;

  // 신고자가 실제로 이 대상을 만난 적 있는지를 먼저 본다. 아무 uid를
  // 찍어 신고함을 오염시키는 길은 이 단계에서 막힌다.
  if (kind === "dm") {
    if (!idOk(threadId)) return Response.json({ error: "bad-thread" }, { status: 400 });
    const thread = await db.doc(`dm-threads/${threadId}`).get();
    const members = thread.data()?.members;
    if (!thread.exists || !Array.isArray(members) || !members.includes(uid) || !members.includes(targetUid))
      return Response.json({ error: "not-member" }, { status: 403 });
  } else if (kind === "comment") {
    if (!idOk(postId) || !idOk(commentId)) return Response.json({ error: "bad-comment" }, { status: 400 });
    const comment = await db.doc(`posts/${postId}/comments/${commentId}`).get();
    if (!comment.exists || comment.data()?.authorUid !== targetUid)
      return Response.json({ error: "not-comment" }, { status: 404 });
  } else if (kind === "candle") {
    // 공개 초만 신고할 수 있다 — 남의 비공개 초는 애초에 안 보인다
    if (!idOk(candleId)) return Response.json({ error: "bad-candle" }, { status: 400 });
    const c = await db.doc(`candles/${candleId}`).get();
    const d = c.data();
    if (!c.exists || d?.uid !== targetUid || d?.visibility !== "public")
      return Response.json({ error: "not-candle" }, { status: 404 });
  } else if (kind === "candle-comment") {
    if (!idOk(candleId) || !idOk(commentId))
      return Response.json({ error: "bad-candle-comment" }, { status: 400 });
    const c = await db.doc(`candles/${candleId}/comments/${commentId}`).get();
    if (!c.exists || c.data()?.uid !== targetUid)
      return Response.json({ error: "not-candle-comment" }, { status: 404 });
  } else if (kind === "candle") {
    // 공개 초만 신고할 수 있다 — 남의 비공개 초는 애초에 안 보인다
    if (!idOk(candleId)) return Response.json({ error: "bad-candle" }, { status: 400 });
    const c = await db.doc(`candles/${candleId}`).get();
    const d = c.data();
    if (!c.exists || d?.uid !== targetUid || d?.pub !== true)
      return Response.json({ error: "not-candle" }, { status: 404 });
  } else if (kind === "candle-comment") {
    if (!idOk(candleId) || !idOk(commentId))
      return Response.json({ error: "bad-candle-comment" }, { status: 400 });
    const c = await db.doc(`candles/${candleId}/comments/${commentId}`).get();
    if (!c.exists || c.data()?.uid !== targetUid)
      return Response.json({ error: "not-candle-comment" }, { status: 404 });
  } else {
    const day = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
    const picks = await db.doc(`yeon-daily/${uid}_${day}`).get();
    const listed = [...(picks.data()?.picks ?? []), ...(picks.data()?.pin ?? [])];
    if (!listed.includes(targetUid)) return Response.json({ error: "not-today" }, { status: 403 });
  }

  const now = Date.now();
  // 같은 사람은 같은 대상에 7일에 한 번만. guard는 kind까지 나눠야
  // 댓글 하나의 신고가 인연 카드에 영향을 주지 않는다.
  const subject =
    kind === "comment"
      ? `${postId}_${commentId}`
      : kind === "candle"
        ? String(candleId)
        : kind === "candle-comment"
          ? `${candleId}_${commentId}`
          : kind === "dm"
            ? String(threadId)
            : String(targetUid);
  const guard = db.doc(`report-guards/${kind}_${subject}`);
  const report = db.collection("reports").doc();
  const outcome = await db.runTransaction(async (tx) => {
    const prior = await tx.get(guard);
    const old = prior.data() ?? {};
    const fresh = typeof old.from === "number" && now - old.from < WINDOW;
    const reporters = fresh && Array.isArray(old.reporters)
      ? old.reporters.filter((x): x is string => typeof x === "string").slice(0, 20)
      : [];
    if (reporters.includes(uid)) return { again: true, count: reporters.length };
    const next = [...reporters, uid];
    tx.set(guard, { from: fresh ? old.from : now, reporters: next, count: next.length, updatedAt: now }, { merge: true });
    tx.set(report, {
      kind, targetUid, byUid: uid, reason, status: "open", createdAt: FieldValue.serverTimestamp(),
      ...(kind === "dm" ? { threadId } : {}),
      ...(kind === "comment" ? { postId, commentId } : {}),
      ...(kind === "candle" ? { candleId } : {}),
      ...(kind === "candle-comment" ? { candleId, commentId } : {}),
    });
    if (next.length >= HOLD_AT && kind === "yeon") {
      tx.set(db.doc(`yeon-profiles/${targetUid}`), {
        reportHold: true,
        state: "심사중",
        reportHoldAt: now,
      }, { merge: true });
    }
    // 셋이 신고하면 먼저 가린다 — 사람이 보기 전에 글이 내려간다.
    // 지우지는 않는다. 뒷방이 풀 수 있어야 오신고가 되돌려진다.
    if (next.length >= HOLD_AT && kind === "candle") {
      tx.set(db.doc(`candles/${candleId}`), { held: true, heldAt: now }, { merge: true });
    }
    if (next.length >= HOLD_AT && kind === "candle-comment") {
      tx.set(db.doc(`candles/${candleId}/comments/${commentId}`), {
        held: true,
        body: "검토 중인 댓글입니다.",
      }, { merge: true });
    }
    // 셋이 신고하면 먼저 가린다 — 사람이 더 보기 전에 글이 내려간다.
    // **지우지는 않는다.** 뒷방이 풀 수 있어야 오신고가 되돌려진다.
    if (next.length >= HOLD_AT && kind === "candle") {
      tx.set(db.doc(`candles/${candleId}`), { held: true, heldAt: now }, { merge: true });
    }
    if (next.length >= HOLD_AT && kind === "candle-comment") {
      tx.set(db.doc(`candles/${candleId}/comments/${commentId}`), {
        held: true,
        body: "검토 중인 댓글입니다.",
      }, { merge: true });
    }
    if (next.length >= HOLD_AT && kind === "comment") {
      tx.set(db.doc(`posts/${postId}/comments/${commentId}`), {
        deleted: true,
        body: "검토 중인 댓글입니다.",
      }, { merge: true });
    }
    return { again: false, count: next.length, held: next.length >= HOLD_AT };
  });
  return Response.json({ ok: true, ...outcome });
}
