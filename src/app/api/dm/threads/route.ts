// 내 쪽지함 — 서버가 준다.
//
// 「누가 청했나 다 보기」 🪷1(그날 하루). 받은 청 가운데 진심 쪽지만 이름·한 마디가 보이고,
// 나머지는 **이름과 한 마디를 아예 안 보낸다**(hidden: true). 값을 치르면
// dm-reveal/{uid} = { until: 그날 자정(KST) } 이 서고, 그날은 다 보낸다.
// 브라우저가 dm-threads 를 직접 읽으면 이 문이 뚫리므로 규칙에서도 그 줄은 막았다.
//
// GET           → { threads, revealed }
// POST {reveal} → 🪷1 내고 오늘 다 보기
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { DM_REVEAL } from "@/lib/dmLadder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 오늘(KST) 자정 — 다 보기는 그때까지 */
function 오늘끝() {
  const kst = Date.now() + 9 * 3_600_000;
  return kst - (kst % 86_400_000) + 86_400_000 - 9 * 3_600_000;
}

async function 누구(req: Request) {
  const app = adminApp();
  if (!app) return null;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  try {
    const d = await getAuth(app).verifyIdToken(token);
    return { uid: d.uid, 주인: isAdminAccount({ uid: d.uid, email: d.email, emailVerified: d.email_verified }), db: getFirestore(app) };
  } catch { return undefined; }
}

async function 열렸나(db: Firestore, uid: string) {
  const u = (await db.doc(`dm-reveal/${uid}`).get()).data()?.until;
  return typeof u === "number" && u > Date.now();
}

/** Timestamp 는 화면이 쓰던 모양({seconds})으로 */
function 모양(v: unknown) {
  return v && typeof v === "object" && "seconds" in v ? { seconds: (v as { seconds: number }).seconds } : v;
}

export async function GET(req: Request) {
  const me = await 누구(req);
  if (me === null) return Response.json({ error: "server-not-ready" }, { status: 503 });
  if (!me) return Response.json({ error: "bad-token" }, { status: 401 });
  const { uid, db } = me;
  const [snap, 봄] = await Promise.all([
    db.collection("dm-threads").where("members", "array-contains", uid).limit(100).get(),
    me.주인 ? Promise.resolve(true) : 열렸나(db, uid),
  ]);
  // 읽음 — 읽음 확인(readPassUntil)이 살아 있는 방만 상대가 읽은 때를 붙인다
  const 지금 = Date.now();
  const 읽음 = new Map<string, Record<string, number>>();
  await Promise.all(snap.docs.map(async (d) => {
    const t = d.data();
    if (!(me.주인 || (t.readPassUntil?.[uid] ?? 0) > 지금)) return;
    const r = (await db.doc(`dm-read/${d.id}`).get()).data() as Record<string, number> | undefined;
    const 상대 = ((t.members ?? []) as string[]).find((m) => m !== uid);
    if (r && 상대 && typeof r[상대] === "number") 읽음.set(d.id, { [상대]: r[상대] });
  }));
  const threads = snap.docs.map((d) => {
    const t = d.data();
    const out: Record<string, unknown> = { id: d.id };
    for (const [k, v] of Object.entries(t)) if (k !== "lastRead") out[k] = 모양(v);
    if (읽음.has(d.id)) out.lastRead = 읽음.get(d.id);
    // 받은 청 · 아직 안 열었고 · 진심이 아니면 — 누군지와 한 마디를 뺀다
    if (t.status === "pending" && t.ownerUid === uid && !t.sincere && !봄) {
      out.requesterName = "";
      out.intro = "";
      out.requesterUid = "";
      out.members = [uid];
      out.hidden = true;
    }
    return out;
  });
  return Response.json({ threads, revealed: 봄 }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const me = await 누구(req);
  if (me === null) return Response.json({ error: "server-not-ready" }, { status: 503 });
  if (!me) return Response.json({ error: "bad-token" }, { status: 401 });
  const { uid, db } = me;
  const ref = db.doc(`dm-reveal/${uid}`);
  const ok = await db.runTransaction(async (tx) => {
    const u = (await tx.get(ref)).data()?.until;
    if (typeof u === "number" && u > Date.now()) return true; // 오늘 이미 냈다
    if (!me.주인 && !(await 연꽃쓰기(tx, db, uid, DM_REVEAL, "dm-reveal"))) return false;
    tx.set(ref, { uid, until: 오늘끝(), at: FieldValue.serverTimestamp() });
    return true;
  });
  if (!ok) return Response.json({ error: "need-lotus" }, { status: 402 });
  return Response.json({ ok: true });
}
