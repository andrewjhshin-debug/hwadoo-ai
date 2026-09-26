import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { EXTEND_DAYS } from "@/lib/candleSpec";
import { isAdminAccount } from "@/lib/config";
import { 갖춘지갑 } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;

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

  // 뒷방 주인의 지갑은 줄지 않는다 — 초 켜기(light/route.ts)는 진작
  // 이렇게 하고 있었는데 **연장만 빠져 있었다.** 화면에는 「蓮 999」라고
  // 떠 있는데 단추를 눌러도 402 로 조용히 되돌아왔다. 셈이 다르면
  // 화면이 거짓말을 한다.
  const free = isAdminAccount({ uid, email });

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(id)) return Response.json({ error: "bad-id" }, { status: 400 });

  const db = getFirestore(app);
  const candle = db.doc(`candles/${id}`);
  const wallet = db.doc(`wallets/${uid}`);
  try {
    const out = await db.runTransaction(async (tx) => {
      const [candleSnap, walletSnap] = await Promise.all([tx.get(candle), tx.get(wallet)]);
      const c = candleSnap.data();
      if (!candleSnap.exists || !c) return null;
      // ── 남도 늘려 줄 수 있다 ────────────────────────────────
      // 형: 「사람들이 내 공덕이나 연꽃 나눔 하면 기한 늘어나도록」
      //
      // 여태 **제 것만** 늘릴 수 있었다(c.uid !== uid 면 404).
      // 그러니 남의 사연을 읽고 마음이 움직여도 할 수 있는 게 공덕
      // 나누기 하나뿐이었다 — 그건 서른 사람이 모여야 하루다.
      // 공개된 등이면 누구든 제 연꽃으로 하루를 보탤 수 있다.
      // 나만 보는 등은 주인만(볼 사람이 주인뿐이라 그렇다).
      // 나만 보는 등은 늘릴 자리가 아니다(볼 사람이 주인뿐이라 그렇다)
      const 주인인가 = c.uid === uid;
      if (c.visibility !== "public") return null;

      const 이제 = Date.now();
      const 지금까지 = Math.max(이제, Number(c.until) || 이제);
      // 끝없이 쌓이지 않게 — 아흔 날이 천장이다. 넘으면 값을 안 받는다
      if (지금까지 + EXTEND_DAYS * DAY > 이제 + 90 * DAY) return "full" as const;

      if (!free) {
        // 지갑을 읽는 셈도 한 군데다 — 옛 지갑({lotus}만)도 셋으로 갖춘다
        const 지갑 = 갖춘지갑(walletSnap.data());
        if (지갑.lotus < 1) return "no-lotus" as const;
        tx.set(
          wallet,
          { lotus: 지갑.lotus - 1, paid: 지갑.paid, free: Math.max(0, 지갑.free - 1) },
          { merge: true }
        );
      }
      tx.update(candle, {
        until: 지금까지 + EXTEND_DAYS * DAY,
        // 누가 보태 주었나 — 사연 판에서 「n명이 함께」로 읽는다
        ...(주인인가 ? {} : { gifts: FieldValue.increment(1) }),
      });
      return "ok" as const;
    });
    if (out === "no-lotus") return Response.json({ error: "no-lotus" }, { status: 402 });
    if (out === "full") return Response.json({ error: "full" }, { status: 409 });
    if (out !== "ok") return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
