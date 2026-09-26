// ─────────────────────────────────────────────────────────────
// 연꽃을 쓴다 — 서버가 센다.
//
// 왜 이것이 필요한가 (적대 검토에서 나온 두 가지) —
//
// ① **환불 계산이 불가능했다.** 지갑이 `lotus` 정수 한 칸이라 첫 선물
//    3송이·공덕으로 바꾼 것·돈 주고 산 것이 한 숫자에 뒤섞여 있었다.
//    약관은 「무상분을 먼저 쓴 것으로 보고, 환불은 남은 유상분 기준」이라
//    적어 두었는데 셈할 데이터가 없었다.
//    → `paid`(산 것)와 `free`(받은 것)를 따로 센다. 쓸 때는 **무상분부터**.
//
// ② **여러 송이를 한 번에 못 뺐다.** 규칙이 「정확히 -1」만 허락해서,
//    「연꽃 3송이」짜리 값은 코드로 아예 돌아가지 않았다.
//    → 여러 송이 차감은 여기(서버)에서만 한다.
//
// 옛 지갑({lotus}만 있는 것)은 처음 손댈 때 전부 무상분으로 본다 —
// 결제가 아직 열린 적이 없으니 그게 사실이다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// 몸통: { n: 1~10, why: "yeon-hap" 같은 짧은 까닭 }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 지갑열기 } from "@/lib/wallet";
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

  const body = (await req.json().catch(() => null)) as
    | { n?: unknown; why?: unknown }
    | null;
  const n = Math.floor(Number(body?.n ?? 1));
  const why = typeof body?.why === "string" ? body.why.slice(0, 40) : "";
  if (!Number.isFinite(n) || n < 1 || n > 10)
    return Response.json({ error: "bad-count" }, { status: 400 });

  // 뒷방 주인의 지갑은 줄지 않는다 — 초 켜기와 같은 셈
  if (isAdminAccount({ uid, email }))
    return Response.json({ ok: true, free: true, left: 999 });

  const db = getFirestore(app);
  const wallet = db.doc(`wallets/${uid}`);

  try {
    const left = await db.runTransaction(async (tx) => {
      // **지갑이 없으면 첫 선물을 얹어 연다** — 지갑을 만드는 길이 여럿인데
      // 선물을 얹는 곳은 일부뿐이라, 어느 길로 먼저 들어왔느냐에 따라
      // 세 송이가 통째로 사라졌다. 여는 자리를 하나로 모은다(lib/wallet)
      const { 지갑: w0 } = await 지갑열기(tx, wallet);
      const { lotus, paid, free } = w0;

      if (lotus < n) return -1;

      // **무상분 먼저.** 그래야 남은 유상분이 곧 환불 대상이 된다
      const 무상차감 = Math.min(free, n);
      const 유상차감 = n - 무상차감;
      tx.set(
        wallet,
        {
          lotus: lotus - n,
          free: free - 무상차감,
          paid: paid - 유상차감,
        },
        { merge: true }
      );
      // 무엇에 썼는지 남긴다 — 환불·분쟁 때 근거가 된다
      tx.set(db.collection(`wallet-log/${uid}/list`).doc(), {
        n: -n,
        paid: -유상차감,
        free: -무상차감,
        why,
        at: FieldValue.serverTimestamp(),
      });
      return lotus - n;
    });

    if (left < 0) return Response.json({ error: "need-lotus" }, { status: 402 });
    return Response.json({ ok: true, left });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
