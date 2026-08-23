// ─────────────────────────────────────────────────────────────
// 메일 시험 발송 — 뒷방(관리자)만. RESEND_API_KEY 확인 + 실제 발송 한 통.
// POST { to: string, kind?: "dm-request" | "milestone", days?: number }
// 인증: Authorization Bearer 의 파이어베이스 ID 토큰 (notify 와 같은 결)
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { adminApp } from "@/lib/firebaseAdmin";
import { ADMIN_UID, ADMIN_EMAILS } from "@/lib/config";
import { dmRequestMail, milestoneMail, sendMail } from "@/lib/mail";

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

  let callerUid: string;
  let callerEmail: string | undefined;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    callerUid = decoded.uid;
    callerEmail = decoded.email ?? undefined;
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const callerIsAdmin =
    callerUid === ADMIN_UID ||
    (!!callerEmail && ADMIN_EMAILS.includes(callerEmail.toLowerCase()));
  if (!callerIsAdmin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "mail not configured" }, { status: 503 });
  }

  let payload: { to?: unknown; kind?: unknown; days?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const to = typeof payload.to === "string" ? payload.to.trim() : "";
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const mail =
    payload.kind === "dm-request"
      ? dmRequestMail("시험 이름")
      : milestoneMail(typeof payload.days === "number" ? payload.days : 3);

  const ok = await sendMail(to, mail);
  return Response.json({ sent: ok });
}
