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
    // 형: 「1대1은 손잡고 절로, 떼거지는 같이 가요」 — 매칭은 남에게 안 보인다.
    // 청실홍실은 「손잡고 절로」를 둘 다 받은 짝(hand)만 건다. 한 사람에 하나뿐이라 고를 것도 없다.
    // ponytail: 손잡은 짝 전체를 한 번에 읽는다(색인 없이). 수천 쌍이 넘으면 pair array-contains-any + hand 복합 색인으로
    const 글쓴이 = new Set(authors);
    const snap = await db.collection("yeon-pairs").where("hand", "==", true).select("pair", "names", "sex").limit(2000).get();
    for (const d of snap.docs) {
      const v = d.data(), pr = v.pair as string[], names = (v.names ?? {}) as Record<string, string>, sexes = (v.sex ?? {}) as Record<string, string>;
      for (const u of pr) {
        if (!글쓴이.has(u)) continue;
        paired.add(u);
        const 저 = pr.find((x) => x !== u);
        if (저) 상대[u] = { name: names[저] ?? "도반", sex: sexes[저] ?? "" };
      }
    }
    const matched = pairedPostIds(owners, together, paired);
    const partner = Object.fromEntries(matched.map((id) => [id, 상대[owners[id]]]).filter(([, v]) => v));
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), ids: matched, partner });
    return Response.json({ matched, partner });
  } catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
