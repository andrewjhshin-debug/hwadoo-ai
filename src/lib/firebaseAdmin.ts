// ─────────────────────────────────────────────────────────────
// Firebase Admin — api/push/daily 와 api/push/notify 가 함께 쓰는 살림.
// · adminApp: FIREBASE_SERVICE_ACCOUNT(JSON 문자열)로 앱을 연다 — 없으면 null
// · cleanDeadTokens: 죽은 토큰(등록 해제·형식 오류)을 장부에서 걷어낸다
// ─────────────────────────────────────────────────────────────

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";

// FCM sendEach 도, Firestore 일괄 쓰기도 한 번에 500개까지
export const BATCH = 500;

export function adminApp(): App | null {
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

// 죽은 토큰 청소 — Firestore 일괄 쓰기도 500개 상한.
// 걷어낸 수를 돌려준다. 실패한 묶음은 세지 않는다 — 다음 기회에 마저 걷어낸다.
export async function cleanDeadTokens(
  db: Firestore,
  dead: string[]
): Promise<number> {
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
      /* 청소 실패는 다음 기회에 다시 */
    }
  }
  return cleaned;
}
