// ─────────────────────────────────────────────────────────────
// 외우기 연꽃 — 경전을 도움 없이 외워 친 사람에게 한 송이.
//
// 왜 서버인가 —
// 연꽃은 돈으로 사는 재화다. 브라우저가 스스로 지갑을 채우게 두면
// 콘솔 한 줄로 무한정 늘어난다. 그래서 "이 사람이 이 경전으로 이미
// 받았는가"는 서버만 판정하고, 지갑도 서버(관리자 권한)만 만진다.
//
// 타이핑을 실제로 했는지는 서버가 알 수 없다 — 그건 받아들인다.
// 대신 **한 사람이 경전 하나당 딱 한 번**으로 묶는다. 경전이 셋이니
// 아무리 속여도 세 송이가 끝이고, 그 정도는 첫 선물(3송이)과 같은 크기다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// 몸통: { sutraId: "samgwi" | "sahong" | "banya" }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 지갑열기, 무상기한 } from "@/lib/wallet";
import { FIRST_GRANT } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 연꽃을 내주는 경전 — 여기 없는 id 는 거절한다 */
const ALLOWED = new Set(["samgwi", "sahong", "banya"]);

/** 한 편에 한 송이 */
const GRANT = 1;

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) {
    return Response.json({ error: "server-not-ready" }, { status: 503 });
  }

  // 누구인가 — 토큰이 말한다
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  // 어느 경전인가
  let sutraId: unknown;
  try {
    sutraId = ((await req.json()) as { sutraId?: unknown }).sutraId;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }
  if (typeof sutraId !== "string" || !ALLOWED.has(sutraId)) {
    return Response.json({ error: "bad-sutra" }, { status: 400 });
  }

  const db = getFirestore(app);
  const mark = db.doc(`sutra-clears/${uid}_${sutraId}`);
  const wallet = db.doc(`wallets/${uid}`);

  try {
    // 한 번만 — 표식이 이미 있으면 지갑을 건드리지 않는다.
    // 두 창에서 동시에 눌러도 트랜잭션이 하나만 통과시킨다.
    const given = await db.runTransaction(async (tx) => {
      const seen = await tx.get(mark);
      if (seen.exists) return false;
      tx.set(mark, {
        uid,
        sutraId,
        lotus: GRANT,
        at: FieldValue.serverTimestamp(),
      });
      // **첫 지갑이면 선물을 함께 얹는다.**
      // 지갑을 만드는 길이 여럿인데 선물을 얹는 곳은 일부뿐이었다 —
      // 보상을 먼저 받은 사람은 세 송이를 영영 못 받았다(lib/wallet).
      const { 처음인가 } = await 지갑열기(tx, wallet);
      tx.set(
        wallet,
        처음인가
          ? { lotus: FIRST_GRANT + GRANT, paid: 0, free: FIRST_GRANT + GRANT, freeUntil: 무상기한() }
          : { lotus: FieldValue.increment(GRANT), free: FieldValue.increment(GRANT), freeUntil: 무상기한() },
        { merge: true }
      );
      return true;
    });

    return Response.json({ ok: true, granted: given ? GRANT : 0, already: !given });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
