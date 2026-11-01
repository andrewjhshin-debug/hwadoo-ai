// 같이 가요 단체방 — 손 든 사람(과 글쓴이)만 들어와 말을 나눈다.
//
// 형: 「같이 가요는 버튼 눌리면 뭐가 되도록 — 단체방 만드는 느낌으로」
// 말은 gogo/p_{글}/msgs 에만 산다. 규칙에 칸이 없어 손님은 못 읽고, 여기 서버가
// 손 든 사람인지 보고 연다.
//
// GET  ?post=  → { title, people, msgs }
// POST { post, text } → 한 줄 보탠다
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{6,64}$/;
type 사람 = { name: string; at: number };

async function 문(req: Request, post: unknown) {
  const app = adminApp();
  if (!app) return { 탈: Response.json({ error: "server-not-ready" }, { status: 503 }) };
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return { 탈: Response.json({ error: "bad-token" }, { status: 401 }) }; }
  if (typeof post !== "string" || !ID.test(post)) return { 탈: Response.json({ error: "bad-post" }, { status: 400 }) };
  const db = getFirestore(app);
  const [글, 장부] = await Promise.all([db.doc(`posts/${post}`).get(), db.doc(`gogo/p_${post}`).get()]);
  if (!글.exists || 글.data()?.deleted) return { 탈: Response.json({ error: "no-post" }, { status: 404 }) };
  const people = (장부.data()?.people ?? {}) as Record<string, 사람>;
  const 쓴이 = 글.data()?.authorUid as string;
  if (uid !== 쓴이 && !people[uid]) return { 탈: Response.json({ error: "not-member" }, { status: 403 }) };
  return { db, uid, post, 글: 글.data()!, people };
}

export async function GET(req: Request) {
  const d = await 문(req, new URL(req.url).searchParams.get("post"));
  if ("탈" in d) return d.탈;
  const snap = await d.db.collection(`gogo/p_${d.post}/msgs`).orderBy("at", "desc").limit(100).get();
  const msgs = snap.docs.reverse().map((m) => ({ id: m.id, uid: m.data().uid as string, name: m.data().name as string, text: m.data().text as string, at: (m.data().at?.toMillis?.() ?? 0) as number }));
  return Response.json({ title: d.글.title ?? "", me: d.uid, author: { uid: d.글.authorUid, name: d.글.authorName }, people: d.people, msgs }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { post?: unknown; text?: unknown; name?: unknown } | null;
  const d = await 문(req, b?.post);
  if ("탈" in d) return d.탈;
  const text = typeof b?.text === "string" ? b.text.trim().slice(0, 300) : "";
  if (!text) return Response.json({ error: "empty" }, { status: 400 });
  const name = d.uid === d.글.authorUid ? (d.글.authorName as string) : (d.people[d.uid]?.name ?? "수행자");
  await d.db.collection(`gogo/p_${d.post}/msgs`).add({ uid: d.uid, name, text, at: FieldValue.serverTimestamp() });
  return Response.json({ ok: true });
}
