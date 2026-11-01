// ─────────────────────────────────────────────────────────────
// 받은 호감함 + 이어진 인연.
//
// GET → { got: [{ key, sincere, at, name?, line?, hidden? }], revealed, pairs: [{ pair, uid, name, sex, state, thread? }] }
//   받은 호감은 **몇 개인지는 그냥**, 누군지·한 줄은 「누군지 보기 🪷1」(그날 하루, dm-reveal) 뒤에만.
//   진심은 처음부터 보인다. 가려진 줄엔 uid 대신 key 만 준다.
// POST { key, act: "yes" | "pass" }
//   yes  → 「나도」, 값 없이 청실홍실
//   pass → 넘기기, 30일 숨긴다
// (누군지 보기 값 치르기는 /api/dm/threads POST 가 한다 — 같은 dm-reveal 문서)
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 맺기 } from "@/lib/yeonMatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;

async function 누구(req: Request) {
  const app = adminApp();
  if (!app) return null;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  try {
    const d = await getAuth(app).verifyIdToken(token);
    return { uid: d.uid, 주인: isAdminAccount({ uid: d.uid, email: d.email, emailVerified: d.email_verified }), db: getFirestore(app) };
  } catch { return undefined; }
}

export async function GET(req: Request) {
  const me = await 누구(req);
  if (me === null) return Response.json({ error: "server-not-ready" }, { status: 503 });
  if (!me) return Response.json({ error: "bad-token" }, { status: 401 });
  const { uid, db } = me;
  const [받음, 짝들, 열림] = await Promise.all([
    db.collection("yeon-likes").where("to", "==", uid).limit(200).get(),
    db.collection("yeon-pairs").where("pair", "array-contains", uid).limit(100).get(),
    db.doc(`dm-reveal/${uid}`).get(),
  ]);
  const 봄 = me.주인 || ((열림.data()?.until as number | undefined) ?? 0) > Date.now();
  const 지금 = Date.now();
  const got = 받음.docs
    .map((d) => d.data())
    .filter((x) => x.state === "sent" || (x.state === "pass" && (x.passUntil ?? 0) <= 지금))
    .sort((a, b) => Number(!!b.sincere) - Number(!!a.sincere) || (b.at?.seconds ?? 0) - (a.at?.seconds ?? 0))
    .map((x) => {
      const 보임 = 봄 || x.sincere;
      return {
        key: x.key as string,
        sincere: !!x.sincere,
        at: x.at?.seconds ?? 0,
        ...(보임 ? { name: (x.fromName as string) || "도반", line: (x.line as string) || "", uid: x.from as string } : { hidden: true }),
      };
    });
  const pairs = 짝들.docs
    .map((d) => {
      const p = d.data();
      const 저 = (p.pair as string[]).find((m) => m !== uid) ?? "";
      return { pair: d.id, uid: 저, name: (p.names?.[저] as string) || "도반", sex: (p.sex?.[저] as string) || "", myName: (p.names?.[uid] as string) || "나", mySex: (p.sex?.[uid] as string) || "", state: p.state as string, thread: (p.thread as string) || null, at: p.at?.seconds ?? 0 };
    })
    .sort((a, b) => b.at - a.at);
  return Response.json({ got, revealed: 봄, pairs }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const me = await 누구(req);
  if (me === null) return Response.json({ error: "server-not-ready" }, { status: 503 });
  if (!me) return Response.json({ error: "bad-token" }, { status: 401 });
  const { uid, db } = me;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const key = typeof b?.key === "string" && /^[a-f0-9]{24}$/.test(b.key) ? b.key : "";
  const act = b?.act === "yes" ? "yes" : b?.act === "pass" ? "pass" : "";
  if (!key || !act) return Response.json({ error: "bad-request" }, { status: 400 });
  const hit = (await db.collection("yeon-likes").where("to", "==", uid).where("key", "==", key).limit(1).get()).docs[0];
  if (!hit) return Response.json({ error: "no-like" }, { status: 404 });
  const from = hit.data().from as string;
  if (act === "pass") {
    await hit.ref.set({ state: "pass", passUntil: Date.now() + 30 * DAY }, { merge: true });
    return Response.json({ ok: true });
  }
  // 막은 사이면 잇지 않는다
  const [a, c] = await Promise.all([db.doc(`yeon-blocks/${uid}/list/${from}`).get(), db.doc(`yeon-blocks/${from}/list/${uid}`).get()]);
  if (a.exists || c.exists) return Response.json({ error: "blocked" }, { status: 409 });
  // 넘겼던 것을 다시 「나도」 하면 되살린다
  if (hit.data().state === "pass") await hit.ref.set({ state: "sent" }, { merge: true });
  const ok = await 맺기(db, uid, from);
  return Response.json({ ok, matched: ok });
}
