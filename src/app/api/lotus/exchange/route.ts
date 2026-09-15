// ─────────────────────────────────────────────────────────────
// 공덕을 연꽃으로 — 서버가 지갑을 채운다.
//
// 연꽃은 천 원에 파는 재화다. 브라우저가 스스로 지갑을 채우게 두면
// 콘솔 한 줄로 무한정 늘어난다. 그래서 지갑은 서버만 만진다.
//
// 공덕이 진짜 쌓였는지는 서버가 알 수 없다 — 그건 받아들인다.
// 대신 **하루에 바꿀 수 있는 송이 수**를 묶는다 — 하루 한 송이.
// 브라우저 쪽 천장(하루 공덕 2,160, 한 송이 6,480)과 맞물려,
// 아무리 속여도 하루 한 송이가 끝이다 — 실은 정직하게 하면 사흘에 한 송이다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// 몸통: { lotus: 1 }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 하루에 바꿀 수 있는 송이 수 — 하루 공덕 천장이 2,160 이라 한 송이면 넉넉하다 */
const DAILY_CAP = 1;

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  let want: unknown;
  try {
    want = ((await req.json()) as { lotus?: unknown }).lotus;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }
  const n = typeof want === "number" ? Math.floor(want) : 0;
  if (n < 1 || n > DAILY_CAP) {
    return Response.json({ error: "bad-amount" }, { status: 400 });
  }

  const db = getFirestore(app);
  const day = today();
  const mark = db.doc(`merit-exchange/${uid}_${day}`);
  const wallet = db.doc(`wallets/${uid}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const seen = await tx.get(mark);
      const used = seen.exists ? (seen.data()?.lotus as number) || 0 : 0;
      const left = DAILY_CAP - used;
      if (left <= 0) return { granted: 0, left: 0 };
      const give = Math.min(n, left);
      tx.set(
        mark,
        { uid, day, lotus: used + give, at: FieldValue.serverTimestamp() },
        { merge: true }
      );
      tx.set(wallet, { lotus: FieldValue.increment(give) }, { merge: true });
      return { granted: give, left: left - give };
    });
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
