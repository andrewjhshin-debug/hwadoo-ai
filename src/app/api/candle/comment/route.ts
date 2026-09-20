import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX = 240;

export async function GET(req: Request) {
  const app = adminApp();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!app || !id) return Response.json({ comments: [] });
  const snap = await getFirestore(app)
    .collection(`candles/${id}/comments`)
    .orderBy("createdAt", "asc")
    .limit(100)
    .get()
    .catch(() => null);
  const comments = snap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [];
  return Response.json({ comments });
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid: string;
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const body = (await req.json().catch(() => null)) as { id?: unknown; body?: unknown; by?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, MAX) : "";
  const by = typeof body?.by === "string" ? body.by.trim().slice(0, 24) : "이름 없는 이";
  if (!id || !text) return Response.json({ error: "bad-body" }, { status: 400 });
  const db = getFirestore(app);
  const candle = await db.doc(`candles/${id}`).get();
  if (!candle.exists || candle.data()?.visibility !== "public" || Number(candle.data()?.until) <= Date.now()) {
    return Response.json({ error: "not-public" }, { status: 404 });
  }
  const ref = await db.collection(`candles/${id}/comments`).add({ uid, by, body: text, createdAt: FieldValue.serverTimestamp() });
  return Response.json({ ok: true, id: ref.id });
}
