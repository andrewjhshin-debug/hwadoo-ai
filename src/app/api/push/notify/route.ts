// ─────────────────────────────────────────────────────────────
// 승인 알림 — 뒷방에서 승인 버튼을 누른 직후, 던진 이에게 알린다.
// · POST { kind: "thrown" | "answer", uid: string }
// · 인증: Authorization Bearer 에 파이어베이스 ID 토큰 —
//   verifyIdToken 으로 검증하고, 관리자 UID 가 아니면 403
// · FIREBASE_SERVICE_ACCOUNT 가 없으면 503 — 아직 준비 전
// · data-only 페이로드 — 알림 표시는 서비스 워커가 한 번만 한다
// · 죽은 토큰은 여기서도 걷어낸다
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, type TokenMessage } from "firebase-admin/messaging";
import { adminApp, BATCH, cleanDeadTokens } from "@/lib/firebaseAdmin";
import { ADMIN_UID, SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 승인 종류별 문안
const NOTICE: Record<"thrown" | "answer", { title: string; body: string }> = {
  thrown: {
    title: "내 화두가 수행자에게 전달됐습니다",
    body: "던진 물음이 도량에 걸렸습니다.",
  },
  answer: {
    title: "내 답이 다른 수행자에게 닿기 시작했습니다",
    body: "나눈 답이 검수를 지나 걸렸습니다.",
  },
};

export async function POST(request: Request) {
  // 1) Bearer ID 토큰이 실려 왔는가
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!idToken) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) 서비스 계정이 준비됐는가
  const app = adminApp();
  if (!app) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  // 3) 관리자인가 — ID 토큰을 검증하고 UID 를 견준다
  let callerUid: string;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (callerUid !== ADMIN_UID) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // 4) 본문 — { kind, uid }
  let kind: "thrown" | "answer";
  let uid: string;
  try {
    const body = (await request.json()) as { kind?: unknown; uid?: unknown };
    if (
      (body.kind !== "thrown" && body.kind !== "answer") ||
      typeof body.uid !== "string" ||
      !body.uid
    ) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }
    kind = body.kind;
    uid = body.uid;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const db = getFirestore(app);
  const messaging = getMessaging(app);

  // 이 수행자의 기기들 — uid 가 새겨진 토큰 전부
  const snapshot = await db
    .collection("push-tokens")
    .where("uid", "==", uid)
    .get();
  const tokens = snapshot.docs.map((d) => d.id);
  if (tokens.length === 0) {
    return Response.json({ sent: 0 });
  }

  // data-only — notification 필드를 쓰면 브라우저가 한 번 더 띄워 중복된다
  const data = { ...NOTICE[kind], url: SITE_URL };
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

  // 죽은 토큰 청소 — 실패해도 다음 기회에 (아침 크론이 마저 걷어낸다)
  await cleanDeadTokens(db, dead);

  return Response.json({ sent });
}
