// ─────────────────────────────────────────────────────────────
// 새 연꽃 주문 알림 — 로그인한 사용자가 /lotus 에서 [입금했습니다]를
// 누르면, 관리자(CONTACT_EMAIL)에게 입금 확인 요청 메일이 간다.
// 인증: Authorization Bearer 의 파이어베이스 ID 토큰 (본인 주문만)
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { adminApp } from "@/lib/firebaseAdmin";
import { CONTACT_EMAIL } from "@/lib/config";
import { orderMail, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const app = adminApp();
  if (!app) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  let email: string | null = null;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    email = decoded.email ?? null;
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { n?: unknown; price?: unknown; depositor?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const n = typeof payload.n === "number" ? payload.n : 0;
  const price = typeof payload.price === "number" ? payload.price : 0;
  const depositor =
    typeof payload.depositor === "string"
      ? payload.depositor.trim().slice(0, 30)
      : "";
  if (n <= 0 || price <= 0 || !depositor) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const result = await sendMail(
    CONTACT_EMAIL,
    orderMail({ n, price, depositor, email })
  );
  return Response.json({ sent: result.ok });
}
