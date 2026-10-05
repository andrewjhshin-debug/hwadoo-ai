// ─────────────────────────────────────────────────────────────
// 법당 공양 줄 — 뒷방에서만 읽는다.
//
// 공개 법당은 현재 걸린 몇 송이만 빠르게 불러온다. 운영자는 신고가
// 없어도 최근 공양을 살펴야 하므로, 이 길에서 공개·비공개·가린 것까지
// 필요한 칸만 골라 돌려준다. 사연의 민감한 개인정보는 애초에 받지 않는다.
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, isAdminAccount } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function timeMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });

  let me: { uid: string; email?: string; verified: boolean };
  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    me = { uid: decoded.uid, email: decoded.email, verified: !!decoded.email_verified };
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const isAdmin =
    me.uid === ADMIN_UID ||
    (me.verified && isAdminAccount({ uid: me.uid, email: me.email, emailVerified: me.verified }));
  if (!isAdmin) return Response.json({ error: "not-admin" }, { status: 403 });

  const snap = await getFirestore(app)
    .collection("candles")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const candles = snap.docs.map((doc) => {
    const row = doc.data();
    return {
      id: doc.id,
      uid: typeof row.uid === "string" ? row.uid : "",
      gift: typeof row.gift === "string" ? row.gift : "deung",
      by: typeof row.by === "string" ? row.by : "이름 없는 이",
      forName: typeof row.forName === "string" ? row.forName : "이름 없는 기원",
      wish: typeof row.wish === "string" ? row.wish : "",
      visibility: row.visibility === "private" ? "private" : "public",
      held: row.held === true,
      until: typeof row.until === "number" ? row.until : 0,
      createdAt: timeMs(row.createdAt),
    };
  });

  return Response.json({ candles });
}
