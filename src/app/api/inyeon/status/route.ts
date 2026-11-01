import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { acceptedPostIds, approvedGoPostIds } from "@/lib/inyeon-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = new Map<string, { at: number; ids: string[] }>();

/** Public badge only: no participants, messages or pending requests leave this route. */
export async function GET(req: Request) {
  const ids = [...new Set((new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean))].sort();
  if (!ids.length || ids.length > 60 || ids.some(id => !/^[\w-]{1,120}$/.test(id))) return Response.json({ error: "bad-request" }, { status: 400 });
  const key = ids.join(","), hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30000) return Response.json({ matched: hit.ids });
  const app = adminApp();
  if (!app) return Response.json({ error: "unavailable" }, { status: 503 });
  try {
    const db = getFirestore(app);
    const posts = await db.getAll(...ids.map(id => db.doc(`posts/${id}`)));
    const owners = Object.fromEntries(posts.filter(p => p.exists && !p.data()?.deleted && p.data()?.board === "gathering").map(p => [p.id, p.data()?.authorUid as string]));
    const visible = Object.keys(owners);
    const groups = [visible.slice(0, 30), visible.slice(30)].filter(g => g.length);
    const snapshots = await Promise.all(groups.map(group => db.collection("dm-threads").where("postId", "in", group).select("postId", "status", "members").limit(1000).get()));
    const together = posts.filter(p => owners[p.id] && (p.data()?.category ?? "together") === "together");
    const go = together.length ? await db.getAll(...together.map(p => db.doc(`gogo/p_${p.id}`))) : [];
    const matched = [...new Set([
      ...acceptedPostIds(owners, snapshots.flatMap(s => s.docs.map(d => d.data()))),
      ...approvedGoPostIds(owners, go.map(p => ({ postId: p.id.replace(/^p_/, ""), people: p.data()?.people }))),
    ])];
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), ids: matched });
    return Response.json({ matched });
  } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
