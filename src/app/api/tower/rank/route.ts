import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ANON_NAMES } from "@/lib/anonName";
import { towerWeek, verifiedTowerScore } from "@/lib/tower-ranking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function nameFor(uid: string) {
  let h = 2166136261;
  for (const ch of uid) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `${ANON_NAMES[(h >>> 0) % ANON_NAMES.length]} · ${(h >>> 0).toString(36).slice(-3)}`;
}
async function identity(req: Request) {
  const app = adminApp(), token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!app || !token) return null;
  try { return (await getAuth(app).verifyIdToken(token)).uid; } catch { return null; }
}
export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "unavailable" }, { status: 503 });
  const uid = await identity(req);
  if (!uid) return Response.json({ error: "unauthorized" }, { status: 401 });
  let score: number | null, playedWeek = "";
  try {
    const text = await req.text();
    if (text.length > 24000) return Response.json({ error: "too-large" }, { status: 413 });
    const body = JSON.parse(text);
    playedWeek = typeof body?.week === "string" ? body.week : "";
    score = /^\d{4}-\d{2}-\d{2}$/.test(playedWeek) && playedWeek <= towerWeek() ? verifiedTowerScore(body) : null;
  } catch { score = null; }
  if (score === null) return Response.json({ error: "invalid-record" }, { status: 400 });
  const db = getFirestore(app), week = towerWeek(), field = `week_${week}`, ref = db.doc(`tower-ranks/${uid}`);
  try {
    await db.runTransaction(async tx => {
      const doc = await tx.get(ref), data = doc.data() ?? {};
      const all = Number(data.all ?? 0), current = Number(data[field] ?? 0);
      const thisWeek = playedWeek === week;
      if (all >= score && (!thisWeek || current >= score)) return;
      const update: Record<string, unknown> = { name: nameFor(uid), all: Math.max(all, score), at: FieldValue.serverTimestamp() };
      if (thisWeek) update[field] = Math.max(current, score);
      const cutoff = towerWeek(Date.now() - 8 * 7 * 86400000);
      for (const key of Object.keys(data)) if (/^week_\d{4}-\d{2}-\d{2}$/.test(key) && key.slice(5) < cutoff) update[key] = FieldValue.delete();
      tx.set(ref, update, { merge: true });
    });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "write-failed" }, { status: 503 }); }
}
export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "unavailable" }, { status: 503 });
  const field = new URL(req.url).searchParams.get("period") === "all" ? "all" : `week_${towerWeek()}`;
  const uid = await identity(req), col = getFirestore(app).collection("tower-ranks");
  try {
    const snap = await col.orderBy(field, "desc").limit(10).get();
    let previous = -1, rank = 0;
    const rows = snap.docs.map((doc, i) => {
      const score = Number(doc.get(field));
      if (score !== previous) rank = i + 1;
      previous = score;
      return { rank, name: nameFor(doc.id), height: score / 10, me: doc.id === uid };
    });
    let mine = rows.find(row => row.me) ?? null;
    if (uid && !mine) {
      const doc = await col.doc(uid).get(), score = Number(doc.get(field) ?? 0);
      if (score > 0) {
        const higher = await col.where(field, ">", score).count().get();
        mine = { rank: higher.data().count + 1, name: nameFor(uid), height: score / 10, me: true };
      }
    }
    return Response.json({ rows, mine }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "read-failed" }, { status: 503 }); }
}
