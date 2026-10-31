import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "./firebaseAdmin";
import { isAdminAccount } from "./config";
import type { SajuChart } from "./saju";
import type { SajuReading } from "./saju-reading";
export type SajuStored = { id: string; chart: SajuChart; at: number; entitled: boolean; orderId?: string; reading?: SajuReading; questions: { id: string; question: string; answer: string; at: number }[]; lease?: { id: string; until: number }; state: string };
export async function sajuSession(req: Request) {
  const app = adminApp();
  if (!app) throw Error("server-not-ready");
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw Error("unauthorized");
  const user = await getAuth(app).verifyIdToken(token).catch(() => null);
  if (!user) throw Error("unauthorized");
  return { db: getFirestore(app), uid: user.uid, admin: isAdminAccount({ uid: user.uid, email: user.email, emailVerified: user.email_verified === true }) };
}
export const safeSajuId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{24}$/.test(v);
export function visibleSaju(row: SajuStored) {
  return { id: row.id, chart: row.chart, at: row.at, entitled: row.entitled === true, orderId: row.orderId ?? null, state: row.state, reading: row.entitled ? row.reading ?? null : null, questions: row.entitled ? row.questions ?? [] : [], generating: !!row.lease && row.lease.until > Date.now() };
}
export function sajuFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "처리하지 못했어요. 다시 시도해 주세요.";
  const status = message === "unauthorized" ? 401 : message === "server-not-ready" ? 503 : message === "forbidden" ? 403 : message === "not-found" ? 404 : message === "payment-required" ? 402 : message === "busy" ? 409 : message === "quota" ? 429 : 400;
  const labels: Record<string, string> = { unauthorized: "로그인이 필요해요.", "server-not-ready": "서비스가 준비 중이에요.", forbidden: "접근 권한이 없어요.", "not-found": "기록을 찾지 못했어요.", "payment-required": "입금 확인 후 열리는 기능이에요.", busy: "풀이를 만들고 있어요. 잠시 후 다시 확인해 주세요.", quota: "오늘의 생성 한도 또는 포함된 질문 횟수를 모두 사용했어요." };
  return Response.json({ error: labels[message] ?? (message.length < 180 ? message : "처리하지 못했어요. 다시 시도해 주세요.") }, { status, headers: { "Cache-Control": "no-store" } });
}
