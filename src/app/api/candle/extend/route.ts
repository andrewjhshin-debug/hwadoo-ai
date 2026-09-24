import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { EXTEND_DAYS } from "@/lib/candleSpec";
import { isAdminAccount } from "@/lib/config";

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
    email = t.email;
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
      if (!candleSnap.exists || c?.uid !== uid || c.visibility !== "public") return null;
      if (!free) {
        const lotus = walletSnap.data()?.lotus;
        if (typeof lotus !== "number" || lotus < 1) return "no-lotus" as const;
        tx.update(wallet, { lotus: FieldValue.increment(-1) });
      }
      tx.update(candle, { until: Math.max(Date.now(), Number(c.until) || Date.now()) + EXTEND_DAYS * DAY });
      return "ok" as const;
    });
    if (out === "no-lotus") return Response.json({ error: "no-lotus" }, { status: 402 });
    if (out !== "ok") return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
