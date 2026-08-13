// ─────────────────────────────────────────────────────────────
// 아침 문안 발송 — Vercel Cron 이 매일 23:00 UTC(08:00 KST)에 부른다.
// · CRON_SECRET 이 있으면 Bearer 검사 — 아무나 못 두드리게
// · FIREBASE_SERVICE_ACCOUNT (JSON 문자열)가 없으면 503 — 아직 준비 전
// · data-only 페이로드 — 알림 표시는 서비스 워커가 한 번만 한다
// · 죽은 토큰(등록 해제·형식 오류)은 장부에서 걷어낸다
// ─────────────────────────────────────────────────────────────

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BATCH = 500; // FCM sendEachForMulticast 의 토큰 상한

function adminApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    // 콘솔에서 받은 서비스 계정 JSON은 snake_case — cert() 가 그대로 받는다
    const account = JSON.parse(raw) as ServiceAccount & {
      private_key?: string;
    };
    // 환경변수에 개행이 \\n 으로 이중 이스케이프되어 들어오는 흔한 경우를 받쳐 준다
    if (typeof account.private_key === "string") {
      account.private_key = account.private_key.replace(/\\n/g, "\n");
    }
    return initializeApp({ credential: cert(account) });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // 인증 — CRON_SECRET 이 설정돼 있으면 Vercel Cron 의 Bearer 헤더를 검사한다
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const app = adminApp();
  if (!app) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const db = getFirestore(app);
  const messaging = getMessaging(app);

  // 장부의 토큰 전부 — 문서 ID가 곧 토큰이다
  const snapshot = await db.collection("push-tokens").get();
  const tokens = snapshot.docs.map((d) => d.id);
  if (tokens.length === 0) {
    return Response.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  // data-only — notification 필드를 쓰면 브라우저가 한 번 더 띄워 중복된다
  const data = {
    title: "오늘의 화두가 기다립니다",
    body: "물음을 들고 하루를 시작해 보십시오.",
    url: SITE_URL,
  };

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const result = await messaging.sendEachForMulticast({
      tokens: batch,
      data,
      webpush: { fcmOptions: { link: data.url } },
    });
    sent += result.successCount;
    failed += result.failureCount;
    result.responses.forEach((r, idx) => {
      const code = r.error?.code ?? "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(batch[idx]);
      }
    });
  }

  // 죽은 토큰 청소 — Firestore 일괄 쓰기도 500개 상한
  let cleaned = 0;
  for (let i = 0; i < dead.length; i += BATCH) {
    const writer = db.batch();
    const slice = dead.slice(i, i + BATCH);
    for (const token of slice) {
      writer.delete(db.collection("push-tokens").doc(token));
    }
    try {
      await writer.commit();
      cleaned += slice.length;
    } catch {
      /* 청소 실패는 다음 아침에 다시 */
    }
  }

  return Response.json({ sent, failed, cleaned });
}
