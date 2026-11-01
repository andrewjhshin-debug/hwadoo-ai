import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { pairedPostIds } from "@/lib/inyeon-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = new Map<string, { at: number; ids: string[] }>();

/** 공개 표시만 — 누구와 이어졌는지는 내보내지 않는다. 글쓴이가 청실홍실로 이어진 사람이면 그 글에 「이어짐」 */
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
    const live = posts.filter(p => p.exists && !p.data()?.deleted && p.data()?.board === "gathering");
    const owners = Object.fromEntries(live.map(p => [p.id, p.data()?.authorUid as string]));
    const together = new Set(live.filter(p => (p.data()?.category ?? "together") === "together").map(p => p.id));
    const authors = [...new Set(Object.values(owners).filter(Boolean))];
    const paired = new Set<string>();
    // array-contains-any 는 한 번에 서른까지
    for (let i = 0; i < authors.length; i += 30) {
      const snap = await db.collection("yeon-pairs").where("pair", "array-contains-any", authors.slice(i, i + 30)).select("pair").limit(500).get();
      for (const d of snap.docs) for (const u of d.data().pair as string[]) paired.add(u);
    }
    const matched = pairedPostIds(owners, together, paired);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), ids: matched });
    return Response.json({ matched });
  } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
