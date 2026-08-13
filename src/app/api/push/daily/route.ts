// ─────────────────────────────────────────────────────────────
// 아침 문안 발송 — Vercel Cron 이 매일 23:00 UTC(08:00 KST)에 부른다.
// · CRON_SECRET 이 있으면 Bearer 검사 — 아무나 못 두드리게
// · FIREBASE_SERVICE_ACCOUNT (JSON 문자열)가 없으면 503 — 아직 준비 전
// · data-only 페이로드 — 알림 표시는 서비스 워커가 한 번만 한다
// · 로그인한 구독자는 문안을 골라 보낸다 — 익음 > 장기 격려 > 기본
//   (users/{uid}.store.current 를 읽어 지금 든 화두의 사정을 살핀다)
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
import { getMessaging, type TokenMessage } from "firebase-admin/messaging";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BATCH = 500; // FCM sendEach 도 한 번에 500개까지
const DAY_MS = 24 * 60 * 60 * 1000;

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

// ── 문안 고르기 — 순수 함수들 (서버에서 store 를 방어적으로 읽는다) ──

// 지금 든 화두에서 문안 판별에 필요한 것만 추린 모양
type CurrentSession = {
  receivedAt: number; // 화두를 받은 시각 (epoch ms)
  durationDays: number; // 참구 기간 (0 = 스스로 정함)
  hasJournal: boolean; // 회향(답)을 이미 썼는가
};

// 참구 기간 한글 이름 — src/lib/store.ts 의 durationLabel 과 같은 매핑
function durationLabel(days: number): string {
  if (days === 1) return "하루";
  if (days === 2) return "이틀";
  if (days === 3) return "사흘";
  if (days === 5) return "닷새";
  if (days === 7) return "이레";
  if (days === 21) return "삼칠일";
  if (days === 108) return "백팔일";
  return `${days}일`;
}

// 받침이 있으면 "이", 없으면 "가" — "하루가 지났습니다 / 삼칠일이 지났습니다"
function subjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "이"; // 한글 밖 — 무난한 쪽
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

// users/{uid} 문서의 store.current 를 방어적으로 파싱 — 모양이 어긋나면 null
function parseCurrentSession(store: unknown): CurrentSession | null {
  if (!store || typeof store !== "object") return null;
  const current = (store as { current?: unknown }).current;
  if (!current || typeof current !== "object") return null;
  const c = current as Record<string, unknown>;
  if (typeof c.receivedAt !== "number" || typeof c.durationDays !== "number") {
    return null;
  }
  return {
    receivedAt: c.receivedAt,
    durationDays: c.durationDays,
    hasJournal: typeof c.journal === "string" && c.journal.trim().length > 0,
  };
}

type Payload = { title: string; body: string; url: string };

const DEFAULT_PAYLOAD: Payload = {
  title: "오늘의 화두가 기다립니다",
  body: "물음을 들고 하루를 시작해 보십시오.",
  url: SITE_URL,
};

// 이 아침, 이 사람에게 갈 문안 — 우선순위: 익음 > 장기 격려 > 기본
function morningPayload(session: CurrentSession | null, now: number): Payload {
  // 화두가 없거나 수동(0)·이상값이면 기본 문안
  if (!session || session.durationDays < 1) return DEFAULT_PAYLOAD;

  const unlockAt = session.receivedAt + session.durationDays * DAY_MS;

  // 1) 익음 — 잠금이 풀렸는데 아직 답을 쓰지 않았다
  if (now >= unlockAt && !session.hasJournal) {
    const label = durationLabel(session.durationDays);
    return {
      title: `${label}${subjectParticle(label)} 지났습니다`,
      body: "이제 답을 쓸 수 있습니다. 물음이 기다립니다.",
      url: SITE_URL,
    };
  }

  // 2) 장기 격려 — 삼칠일 이상을 참구 중이면 이레마다 한 번
  //    (크론이 하루 한 번이니 floor(일수) % 7 === 0 이 곧 "그 주의 아침")
  if (session.durationDays >= 21 && now < unlockAt) {
    const elapsedDays = Math.floor((now - session.receivedAt) / DAY_MS);
    if (elapsedDays >= 7 && elapsedDays % 7 === 0) {
      return {
        title: "이레가 또 지났습니다",
        body: "물음은 아직 곁에 있습니다. 오늘도 한 번 들어 보십시오.",
        url: SITE_URL,
      };
    }
  }

  return DEFAULT_PAYLOAD;
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

  // 장부의 토큰 전부 — 문서 ID가 곧 토큰, uid 가 있으면 로그인 구독자다
  const snapshot = await db.collection("push-tokens").get();
  const entries = snapshot.docs.map((d) => {
    const uid = d.get("uid");
    return { token: d.id, uid: typeof uid === "string" && uid ? uid : null };
  });
  if (entries.length === 0) {
    return Response.json({ sent: 0, failed: 0, cleaned: 0 });
  }

  // uid 별 users 문서는 한 번만 읽는다 — 한 사람이 여러 기기로 구독해도
  const uids = [
    ...new Set(
      entries.map((e) => e.uid).filter((u): u is string => u !== null)
    ),
  ];
  const sessions = new Map<string, CurrentSession | null>();
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const userSnap = await db.collection("users").doc(uid).get();
        sessions.set(
          uid,
          parseCurrentSession(userSnap.exists ? userSnap.get("store") : null)
        );
      } catch {
        sessions.set(uid, null); // 못 읽으면 기본 문안으로
      }
    })
  );

  // data-only — notification 필드를 쓰면 브라우저가 한 번 더 띄워 중복된다
  const now = Date.now();
  const messages: TokenMessage[] = entries.map((e) => {
    const data = morningPayload(
      e.uid ? (sessions.get(e.uid) ?? null) : null,
      now
    );
    return {
      token: e.token,
      data,
      webpush: { fcmOptions: { link: data.url } },
    };
  });

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];

  // 토큰마다 문안이 다르니 sendEach — 500개씩 끊어 보낸다
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    const result = await messaging.sendEach(batch);
    sent += result.successCount;
    failed += result.failureCount;
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
