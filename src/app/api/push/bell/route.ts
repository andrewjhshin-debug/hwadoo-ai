// ─────────────────────────────────────────────────────────────
// 예불 종 발송 — 깃허브 액션 크론이 하루 네 번(KST 04:00 · 07:00 ·
// 11:30 · 18:00) 이 문을 두드린다 (.github/workflows/bells.yml).
// · 인증: Bearer CRON_SECRET — 미설정이면 차단(fail-closed)
// · 지금 KST 시각에서 ±25분 안의 종을 찾아, 그 종을 고른 토큰
//   (push-tokens.bells array-contains)에만 보낸다 — 크론이 몇 분
//   늦어도 창 안에 들어온다.
// · data-only 페이로드 — 알림 표시는 서비스 워커가 한 번만 한다
// ─────────────────────────────────────────────────────────────

import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, type TokenMessage } from "firebase-admin/messaging";
import { adminApp, BATCH, cleanDeadTokens } from "@/lib/firebaseAdmin";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 종별 문안 — id 는 KST "HHmm"
const SLOTS: Record<string, { minutes: number; title: string; body: string }> = {
  "0400": {
    minutes: 4 * 60,
    title: "새벽 예불 — 인시(寅時)",
    body: "도량이 눈을 뜨는 시각입니다. 오늘의 물음과 함께 하루를 여십시오.",
  },
  "0700": {
    minutes: 7 * 60,
    title: "삼귀의 — 아침 마음가짐",
    body: "부처님께, 가르침에, 도반에게 — 세 번 귀의하고 시작합니다.",
  },
  "1130": {
    minutes: 11 * 60 + 30,
    title: "발우공양 — 점심",
    body: "한 그릇의 밥이 오기까지를 생각하며 천천히 드십시오.",
  },
  "1800": {
    minutes: 18 * 60,
    title: "저녁 예불 — 유시(酉時)",
    body: "하루를 내려놓는 시각입니다. 품던 물음은 어떻게 익었습니까.",
  },
};

const WINDOW_MIN = 25; // 크론 지연 흡수 창

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const app = adminApp();
  if (!app) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  // 지금 KST — 분 단위 시계
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowMin = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const slotId = Object.keys(SLOTS).find(
    (id) => Math.abs(SLOTS[id].minutes - nowMin) <= WINDOW_MIN
  );
  if (!slotId) {
    return Response.json({ slot: null, sent: 0 });
  }
  const slot = SLOTS[slotId];

  const db = getFirestore(app);
  const messaging = getMessaging(app);

  const snapshot = await db
    .collection("push-tokens")
    .where("bells", "array-contains", slotId)
    .get();
  const tokens = snapshot.docs.map((d) => d.id);
  if (tokens.length === 0) {
    return Response.json({ slot: slotId, sent: 0 });
  }

  const data = { title: slot.title, body: slot.body, url: SITE_URL };
  const messages: TokenMessage[] = tokens.map((token) => ({
    token,
    data,
    webpush: { fcmOptions: { link: data.url } },
  }));

  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const result = await messaging.sendEach(batch);
    sent += result.successCount;
    result.responses.forEach((r, idx) => {
      const code = r.error?.code ?? "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-argument"
      ) {
        dead.push(batch[idx].token);
      }
    });
  }
  const cleaned = await cleanDeadTokens(db, dead);

  return Response.json({ slot: slotId, sent, cleaned });
}
