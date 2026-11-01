// ─────────────────────────────────────────────────────────────
// 법당 좋아요 — 좌복에 앉은 이에게 하트 하나. 값은 없다.
//
// 형: 「얼굴이 뜨면 보고 좋아요 눌릴 수 있도록」
// 받는 쪽에는 「누군가」로만 간다(누가 눌렀는지는 호감에서 밝힌다).
// 같은 사람에게는 하루 한 번 — 알림 열쇠에 날짜를 넣어 두 번째는 저절로 묻힌다.
// 열쇠에 보낸 이 uid 를 그대로 넣으면 받는 쪽 알림 문서 이름으로 새어 나간다 — 해시로 가린다.
// ─────────────────────────────────────────────────────────────
import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 알림쓰기 } from "@/lib/alertsServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as { to?: unknown } | null;
  const to = typeof b?.to === "string" && /^[A-Za-z0-9]{6,64}$/.test(b.to) ? b.to : "";
  if (!to || to === uid) return Response.json({ error: "bad-to" }, { status: 400 });
  const db = getFirestore(app);
  // 서로 막은 사이면 조용히 끝
  const [a, c] = await Promise.all([db.doc(`yeon-blocks/${uid}/list/${to}`).get(), db.doc(`yeon-blocks/${to}/list/${uid}`).get()]);
  if (a.exists || c.exists) return Response.json({ ok: true });
  const 날 = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const 가림 = createHash("sha256").update(`${uid}|${to}`).digest("hex").slice(0, 16);
  await 알림쓰기(db, to, `hall_${가림}_${날}`, { kind: "like", text: "법당에서 누군가 좋아요를 눌렀어요" });
  return Response.json({ ok: true });
}
