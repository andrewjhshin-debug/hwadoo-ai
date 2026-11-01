import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { pairedPostIds } from "@/lib/inyeon-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type 짝 = { name: string; sex: string };
const cache = new Map<string, { at: number; ids: string[]; partner: Record<string, 짝> }>();

/** 글쓴이가 청실홍실로 이어진 사람이면 그 글에 「이어짐」, 그리고 이어진 이의 법명·음양(글 머리에 끈을 걸려고).
 *  형: 「매칭되면 매칭된 사람은 법명이 뜨도록」 — 법명은 이미 게시판에 쓰는 가명이다 */
export async function GET(req: Request) {
  const ids = [...new Set((new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean))].sort();
  if (!ids.length || ids.length > 60 || ids.some(id => !/^[\w-]{1,120}$/.test(id))) return Response.json({ error: "bad-request" }, { status: 400 });
  const key = ids.join(","), hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30000) return Response.json({ matched: hit.ids, partner: hit.partner });
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
    const 상대: Record<string, 짝> = {};
    // array-contains-any 는 한 번에 서른까지
    for (let i = 0; i < authors.length; i += 30) {
      const snap = await db.collection("yeon-pairs").where("pair", "array-contains-any", authors.slice(i, i + 30)).select("pair", "names", "sex", "state", "thread", "at").limit(500).get();
      // 형: 「한 사람이 여러 명이랑 매칭될 수도 있거든 — 최종 매칭만」
      // 여럿이면 가장 깊이 간 짝 하나만 건다: 번호까지 연 짝 > 쪽지방 연 짝 > 막 이어진 짝, 같으면 최근
      const 깊이 = (d: FirebaseFirestore.DocumentData) => (d.state === "contact" ? 3 : d.thread || d.state === "room" ? 2 : 1);
      const 고른: Record<string, { 깊: number; 때: number }> = {};
      for (const d of snap.docs) {
        const v = d.data(), pr = v.pair as string[], names = (v.names ?? {}) as Record<string, string>, sexes = (v.sex ?? {}) as Record<string, string>;
        const 깊 = 깊이(v), 때 = v.at?.toMillis?.() ?? 0;
        for (const u of pr) {
          paired.add(u);
          const 저 = pr.find((x) => x !== u);
          const 앞 = 고른[u];
          if (저 && (!앞 || 깊 > 앞.깊 || (깊 === 앞.깊 && 때 > 앞.때))) { 고른[u] = { 깊, 때 }; 상대[u] = { name: names[저] ?? "도반", sex: sexes[저] ?? "" }; }
        }
      }
    }
    const matched = pairedPostIds(owners, together, paired);
    const partner = Object.fromEntries(matched.map((id) => [id, 상대[owners[id]]]).filter(([, v]) => v));
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), ids: matched, partner });
    return Response.json({ matched, partner });
  } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
