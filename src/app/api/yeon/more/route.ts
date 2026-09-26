// ─────────────────────────────────────────────────────────────
// 한 사람 더 — 연꽃 한 송이.
//
// 형: 「한 장이 값의 근거다 — 더 보려면 연꽃」
//
// 하루 몫(FREE_PICKS)은 한 장이다. 그 한 장을 다 보고 나서 더 보고
// 싶으면 연꽃을 낸다. 하루 MAX_PICKS 까지, 그 위로는 안 판다 —
// 무한 스와이프를 하지 않는 것이 이 판의 값이다.
//
// **왜 연꽃 쓰기와 뽑기를 한 길에서 하나** —
//   둘로 나누면 연꽃만 빠지고 사람은 안 늘어나는 자리가 생긴다(그 사이에
//   판이 끊기면). 여기서는 **먼저 하루치 칸을 늘리고, 그 다음에** 연꽃을
//   뺀다. 거꾸로 하지 않는다 — 어긋나더라도 손님이 손해 보는 쪽으로는
//   안 기울게.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// POST → { ok, cap }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { FREE_PICKS, MAX_PICKS, today } from "@/lib/yeonPick";
import { isAdminAccount } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid: string;
  let email: string | undefined;
  try {
    const t = await getAuth(app).verifyIdToken(token);
    uid = t.uid;
    email = t.email;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const db = getFirestore(app);
  const day = today();
  const 칸 = db.doc(`yeon-daily/${uid}_${day}`);
  const s = await 칸.get();
  const cap: number = s.exists ? (s.data()!.cap ?? FREE_PICKS) : FREE_PICKS;
  if (cap >= MAX_PICKS)
    return Response.json({ error: "max-today" }, { status: 409 });

  // 뒷방 주인은 값을 안 치른다 — 초 켜기·연꽃 쓰기와 같은 셈
  const 공짜 = isAdminAccount({ uid, email });

  if (!공짜) {
    const wallet = db.doc(`wallets/${uid}`);
    const 남음 = await db.runTransaction(async (tx) => {
      const w = await tx.get(wallet);
      const d = w.exists ? w.data()! : null;
      const lotus: number = typeof d?.lotus === "number" ? d.lotus : 0;
      const paid: number = typeof d?.paid === "number" ? d.paid : 0;
      // 옛 지갑({lotus}만 있는 것)은 전부 무상분으로 본다
      const free: number = typeof d?.free === "number" ? d.free : lotus - paid;
      if (lotus < 1) return -1;
      // **무상분 먼저** — 남은 유상분이 곧 환불 대상이 된다
      const 무상차감 = Math.min(free, 1);
      tx.set(
        wallet,
        { lotus: lotus - 1, free: free - 무상차감, paid: paid - (1 - 무상차감) },
        { merge: true }
      );
      tx.set(db.collection(`wallet-log/${uid}/list`).doc(), {
        n: -1,
        paid: -(1 - 무상차감),
        free: -무상차감,
        why: "yeon-more",
        at: FieldValue.serverTimestamp(),
      });
      return lotus - 1;
    });
    if (남음 < 0) return Response.json({ error: "need-lotus" }, { status: 402 });
  }

  await 칸.set({ uid, day, cap: cap + 1 }, { merge: true });
  // 새 사람은 /api/yeon/today 가 채운다 — 거기 한 군데서만 뽑아야
  // 90일 쿨다운·차단·점수 셈이 두 군데로 갈리지 않는다
  return Response.json({ ok: true, cap: cap + 1, max: MAX_PICKS });
}
