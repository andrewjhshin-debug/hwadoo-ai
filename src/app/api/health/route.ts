// 운영 점검용 상태 확인. 로그인이나 개인정보 없이 서버 준비 상태만 돌려준다.
// 외부 모니터는 이 주소가 200인지로 서비스 장애를 감지할 수 있다.

import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const app = adminApp();
  if (!app) return Response.json({ ok: false, service: "hwadu" }, { status: 503 });
  try {
    // 한 번 읽어 서비스 계정과 Firestore가 실제로 닿는지까지 확인한다.
    await getFirestore(app).doc("_healthcheck/status").get();
    return Response.json(
      { ok: true, service: "hwadu", at: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ ok: false, service: "hwadu" }, { status: 503 });
  }
}
