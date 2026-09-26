// ─────────────────────────────────────────────────────────────
// 한 사람 더 — 연꽃 한 송이.
//
// 형: 「한 장이 값의 근거다 — 더 보려면 연꽃」
//
// 하루 몫(FREE_PICKS)은 한 장이다. 그 한 장을 다 보고 나서 더 보고
// 싶으면 연꽃을 낸다. 하루 MAX_PICKS 까지, 그 위로는 안 판다 —
// 무한 스와이프를 하지 않는 것이 이 판의 값이다.
//
// **차례가 값이다** —
//   ① 먼저 **사람을 찾는다.** 없으면 아무것도 안 받고 돌려보낸다.
//      (처음엔 지갑부터 긁고 나중에 뽑았다. 후보가 0명이면 뽑기가 빈손으로
//       와도 되돌리는 길이 없어 **연꽃만 조용히 탔다.**)
//   ② 찾았으면 연꽃을 뺀다
//   ③ 그 다음에 칸과 사람을 적는다
//   어긋나더라도 손님이 손해 보는 쪽으로는 안 기울게.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// POST → { ok, cap }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 지갑열기 } from "@/lib/wallet";
import { FREE_PICKS, MAX_PICKS, today, 뽑기 } from "@/lib/yeonPick";
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
    // **메일이 확인된 것만** 관리자 판별에 쓴다. 안 보면 남이 그 메일을
    // 제 계정에 달아 놓는 것만으로 값을 안 치르는 문이 열린다.
    // 규칙(isAdmin)과 형제 라우트 넷은 다 본다 — 한쪽만 느슨하면
    // 그쪽이 문이 된다.
    email = t.email_verified ? (t.email ?? undefined) : undefined;
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

  // ① 사람부터 — 없으면 **아무것도 안 받는다**
  const 지금picks: string[] = s.exists ? (s.data()!.picks ?? []) : [];
  const 골라 = await 뽑기(db, uid, 1, 지금picks);
  if ("err" in 골라) return Response.json({ error: 골라.err }, { status: 409 });
  const 새사람 = 골라.picks.filter((x) => !지금picks.includes(x));
  if (!새사람.length)
    return Response.json({ error: "no-one" }, { status: 409 });

  // ② 값 — 뒷방 주인은 안 치른다(초 켜기·연꽃 쓰기와 같은 셈)
  const 공짜 = isAdminAccount({ uid, email });

  if (!공짜) {
    const wallet = db.doc(`wallets/${uid}`);
    const 남음 = await db.runTransaction(async (tx) => {
      // **지갑이 없으면 첫 선물을 얹어 연다.** 없다고 곧장 「모자랍니다」로
      // 돌려보내고 있었다 — 아직 한 송이도 안 쓴 사람에게. 쪽지 청하기와
      // 초 켜기는 같은 자리에서 세 송이를 쥐여 준다. 문이 다르게 답하면 안 된다.
      const { 지갑: w0 } = await 지갑열기(tx, wallet);
      const { lotus, paid, free } = w0;
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

  // ③ 칸과 사람을 함께 적는다. 뽑기는 lib 한 군데에만 있어서
  //    쿨다운·차단·점수 셈이 today 와 갈리지 않는다
  await 칸.set(
    { uid, day, cap: cap + 1, picks: 지금picks.concat(새사람) },
    { merge: true }
  );
  return Response.json({ ok: true, cap: cap + 1, max: MAX_PICKS });
}
