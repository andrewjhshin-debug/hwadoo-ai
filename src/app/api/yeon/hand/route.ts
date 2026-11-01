// ─────────────────────────────────────────────────────────────
// 손잡고 절로 — 청실홍실은 둘이 손잡았을 때만.
//
// 형: 「여러 사람이랑 매칭되면 청실홍실이 이상하잖아 — 1대1은 손잡고 절로, 떼거지는 같이 가요」
// 매칭(yeon-pairs)은 남에게 안 보인다. 둘 중 하나가 「손잡고 절로」를 청하고 상대가 받으면
// 그 짝만 hand: true 가 되고, 그때부터 글 머리에 청실홍실이 걸린다.
// **한 사람에 하나뿐**이다 — yeon-hand/{uid} 가 지금 손잡은 짝을 쥔다(서버만 읽고 쓴다).
// 값은 없다. 연꽃이 아니라 마음을 거는 자리다.
//
// GET  ?pair=  → { state: none|mine|theirs|hand, me, them, other }
// POST { pair, act: propose|accept|decline|release }
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Transaction, type Firestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 알림쓰기 } from "@/lib/alertsServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAIR = /^[A-Za-z0-9]{6,64}_[A-Za-z0-9]{6,64}$/;
type 짝 = { pair?: string[]; names?: Record<string, string>; sex?: Record<string, string>; hand?: boolean; handBy?: Record<string, boolean> };

async function 누구(req: Request) {
  const app = adminApp();
  if (!app) return null;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  try { return { app, uid: (await getAuth(app).verifyIdToken(token)).uid }; } catch { return null; }
}

/** 이 짝에서 내가 어디에 서 있나 */
function 자리(p: 짝, uid: string) {
  const 저 = (p.pair ?? []).find((m) => m !== uid) ?? "";
  const state = p.hand ? "hand" : p.handBy?.[uid] ? "mine" : p.handBy?.[저] ? "theirs" : "none";
  return { 저, state };
}

export async function GET(req: Request) {
  const a = await 누구(req);
  if (!a) return Response.json({ error: "bad-token" }, { status: 401 });
  const pairKey = new URL(req.url).searchParams.get("pair") ?? "";
  if (!PAIR.test(pairKey)) return Response.json({ error: "bad-pair" }, { status: 400 });
  const db = getFirestore(a.app);
  const [ps, hs] = await db.getAll(db.doc(`yeon-pairs/${pairKey}`), db.doc(`yeon-hand/${a.uid}`));
  const p = ps.data() as 짝 | undefined;
  if (!p?.pair?.includes(a.uid)) return Response.json({ error: "not-member" }, { status: 403 });
  const { 저, state } = 자리(p, a.uid);
  const 쥔 = hs.data()?.pair as string | undefined;
  return Response.json(
    {
      state,
      me: { name: p.names?.[a.uid] ?? "나", sex: p.sex?.[a.uid] ?? "" },
      them: { name: p.names?.[저] ?? "도반", sex: p.sex?.[저] ?? "" },
      // 다른 짝과 이미 손잡았으면 그 짝 열쇠 — 「그 인연 풀고 잡기」에 쓴다
      other: 쥔 && 쥔 !== pairKey ? 쥔 : null,
    },
    { headers: { "cache-control": "no-store" } }
  );
}

/** 손 놓기 — 짝 문서와 두 사람의 손 문서를 함께 비운다(이 짝을 쥔 문서만) */
async function 놓기(tx: Transaction, db: Firestore, pairKey: string, p: 짝) {
  const hands = await Promise.all((p.pair ?? []).map((u) => tx.get(db.doc(`yeon-hand/${u}`))));
  tx.set(db.doc(`yeon-pairs/${pairKey}`), { hand: false, handAt: FieldValue.delete(), handBy: FieldValue.delete() }, { merge: true });
  for (const h of hands) if (h.data()?.pair === pairKey) tx.delete(h.ref);
}

export async function POST(req: Request) {
  const a = await 누구(req);
  if (!a) return Response.json({ error: "bad-token" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const pairKey = typeof b?.pair === "string" && PAIR.test(b.pair) ? b.pair : "";
  const act = b?.act;
  if (!pairKey || !["propose", "accept", "decline", "release"].includes(act as string)) return Response.json({ error: "bad-request" }, { status: 400 });
  const db = getFirestore(a.app), uid = a.uid;
  const 짝문서 = db.doc(`yeon-pairs/${pairKey}`);

  const out = await db.runTransaction(async (tx) => {
    const p = (await tx.get(짝문서)).data() as 짝 | undefined;
    if (!p?.pair?.includes(uid)) return { error: "not-member", status: 403 };
    const { 저, state } = 자리(p, uid);

    if (act === "release" || act === "decline") {
      if (act === "decline" && state !== "theirs") return { error: "no-offer", status: 409 };
      await 놓기(tx, db, pairKey, p);
      return { state: "none" };
    }

    // 청하기·받기 — 막은 사이면 안 되고, 둘 다 다른 짝과 손잡고 있으면 안 된다(읽기 먼저)
    const [내막음, 쟤막음, 내손, 쟤손] = await Promise.all([
      tx.get(db.doc(`yeon-blocks/${uid}/list/${저}`)),
      tx.get(db.doc(`yeon-blocks/${저}/list/${uid}`)),
      tx.get(db.doc(`yeon-hand/${uid}`)),
      tx.get(db.doc(`yeon-hand/${저}`)),
    ]);
    if (내막음.exists || 쟤막음.exists) return { error: "blocked", status: 409 };
    const 내것 = 내손.data()?.pair as string | undefined;
    if (내것 && 내것 !== pairKey) return { error: "taken", status: 409, other: 내것 };
    if (state === "hand") return { state: "hand" };
    // 이미 청해 둔 것을 또 누르면 그대로 — 알림을 두 번 울리지 않는다
    if (act === "propose" && state === "mine") return { state: "mine" };

    // 저쪽이 이미 청했으면 「청하기」도 곧 「받기」다
    const 받기 = act === "accept" || state === "theirs";
    if (act === "accept" && state !== "theirs") return { error: "no-offer", status: 409 };
    if (!받기) {
      tx.set(짝문서, { handBy: { [uid]: true } }, { merge: true });
      return { state: "mine", alert: "propose" as const, 저, 이름: p.names?.[uid] ?? "도반" };
    }
    const 쟤것 = 쟤손.data()?.pair as string | undefined;
    if (쟤것 && 쟤것 !== pairKey) return { error: "taken-them", status: 409 };
    tx.set(짝문서, { hand: true, handAt: FieldValue.serverTimestamp(), handBy: FieldValue.delete() }, { merge: true });
    tx.set(db.doc(`yeon-hand/${uid}`), { pair: pairKey, at: FieldValue.serverTimestamp() });
    tx.set(db.doc(`yeon-hand/${저}`), { pair: pairKey, at: FieldValue.serverTimestamp() });
    return { state: "hand", alert: "accept" as const, 저 };
  });

  if ("error" in out) return Response.json({ error: out.error, other: "other" in out ? out.other : undefined }, { status: out.status });
  if (out.alert === "propose") await 알림쓰기(db, out.저, `hand_${pairKey}_${Date.now()}`, { kind: "dm", text: `${out.이름}님이 손잡고 절로 가자고 해요` });
  if (out.alert === "accept") await 알림쓰기(db, out.저, `handok_${pairKey}_${Date.now()}`, { kind: "dm", text: "청실홍실이 이어졌어요" });
  return Response.json({ ok: true, state: out.state });
}
