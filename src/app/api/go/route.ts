// ─────────────────────────────────────────────────────────────
// 같이 가요 — 절 가는 날에 손을 든다.
//
// 형: 「절 좋지? 근데 어떻게 가는지 모르지? 아는 사람 같이 가자 — 이성이랑,
//      그러면서 데이팅까지 된다」 「같이 가요 기능 넣어. 도전장이란 표현은 말고」
//
// 문서 하나가 하루다: gogo/{YYYY-MM-DD} = { date, name, people: { uid: {name, sex, rank, at} } }
// 손 들기·내리기는 서버가 한다(규칙은 읽기만 연다). 이름은 내 도량 법명.
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const 이름 = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[^가-힣一-龥A-Za-z0-9 ]/g, "").slice(0, 8) : "");

export type 가는사람 = { name: string; sex?: "m" | "f"; rank?: string; at: number };

/** GET ?date= — 그날 가는 사람들 */
export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!DATE.test(date)) return Response.json({ error: "bad-date" }, { status: 400 });
  const d = (await getFirestore(app).doc(`gogo/${date}`).get()).data() as { name?: string; people?: Record<string, 가는사람> } | undefined;
  return Response.json({ date, name: d?.name ?? "", people: d?.people ?? {} }, { headers: { "cache-control": "no-store" } });
}

/** POST { date, eventName, name, sex?, rank?, on } — 손 들기(on) / 내리기 */
export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const date = typeof b?.date === "string" ? b.date : "";
  if (!DATE.test(date)) return Response.json({ error: "bad-date" }, { status: 400 });
  // 지난 날엔 손 못 든다
  const 오늘 = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  if (date < 오늘) return Response.json({ error: "past" }, { status: 400 });
  const on = b?.on !== false;
  const name = 이름(b?.name) || "수행자";
  const sex = b?.sex === "m" || b?.sex === "f" ? b.sex : undefined;
  const rank = typeof b?.rank === "string" ? b.rank.slice(0, 2) : undefined;
  const eventName = typeof b?.eventName === "string" ? b.eventName.trim().slice(0, 40) : "";
  const ref = getFirestore(app).doc(`gogo/${date}`);
  if (on) {
    const me: 가는사람 = { name, at: Date.now(), ...(sex ? { sex } : {}), ...(rank ? { rank } : {}) };
    await ref.set({ date, ...(eventName ? { name: eventName } : {}), people: { [uid]: me }, at: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    await ref.set({ people: { [uid]: FieldValue.delete() } }, { merge: true });
  }
  const d = (await ref.get()).data() as { people?: Record<string, 가는사람> } | undefined;
  return Response.json({ ok: true, people: d?.people ?? {} });
}
