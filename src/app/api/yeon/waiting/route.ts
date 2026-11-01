// 기다리는 인연 — 나에게 합장했는데 내가 아직 답하지 않은 사람들.
//
// 형: 「과금 유도에 돈 버는 게 최고다. 인연에 특히 집중」
// 몇 명인지는 공짜로 보인다. **누구인지는 연꽃 한 송이** — 하루 동안 열린다.
// 「누가 나에게 합장했나」를 브라우저가 읽을 수 있으면 값이 무너진다 — yeon-haps 는
// 규칙이 잠가 두었고, 여기 서버만 연다.
//
// GET  → { got, sent, open, people? }
// POST → 연꽃 한 송이로 오늘 열기 → { got, sent, open: true, people }
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import type { App } from "firebase-admin/app";
import { adminApp } from "@/lib/firebaseAdmin";
import { 지갑열기 } from "@/lib/wallet";
import { today, 추려서 } from "@/lib/yeonPick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function 셈(app: App, db: Firestore, me: string, 열림: boolean) {
  const [받은, 보낸] = await Promise.all([
    db.collection("yeon-haps").where("to", "==", me).limit(200).get(),
    db.collection("yeon-haps").where("from", "==", me).limit(500).get(),
  ]);
  const 답함 = new Set(보낸.docs.map((d) => d.data().to as string));
  const 기다림 = 받은.docs.map((d) => d.data().from as string).filter((u) => !답함.has(u));
  // 막은 사이는 뺀다
  const 막힘 = await Promise.all(기다림.map((u) => db.doc(`yeon-blocks/${me}/list/${u}`).get()));
  const 남은 = 기다림.filter((_, i) => !막힘[i].exists);
  let people: unknown[] | undefined;
  if (열림) {
    const 문서 = await Promise.all(남은.slice(0, 12).map((u) => db.doc(`yeon-profiles/${u}`).get()));
    people = (await Promise.all(문서.filter((d) => d.exists && d.data()?.state === "활동").map((d) => 추려서(app, { uid: d.id, ...d.data() })))).filter(Boolean);
  }
  return { got: 남은.length, sent: 보낸.size, open: 열림, people };
}

async function 누구(req: Request, app: App) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  try { return (await getAuth(app).verifyIdToken(token)).uid; } catch { return ""; }
}

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const me = await 누구(req, app);
  if (!me) return Response.json({ error: "bad-token" }, { status: 401 });
  const db = getFirestore(app);
  const 열림 = (await db.doc(`yeon-waiting-open/${me}_${today()}`).get()).exists;
  return Response.json(await 셈(app, db, me, 열림), { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const me = await 누구(req, app);
  if (!me) return Response.json({ error: "bad-token" }, { status: 401 });
  const db = getFirestore(app);
  const 표 = db.doc(`yeon-waiting-open/${me}_${today()}`);
  const wallet = db.doc(`wallets/${me}`);
  const 남음 = await db.runTransaction(async (tx) => {
    if ((await tx.get(표)).exists) return 0; // 오늘 이미 열었다 — 두 번 안 받는다
    const { 지갑: w } = await 지갑열기(tx, wallet);
    if (w.lotus < 1) return -1;
    const 무상 = Math.min(w.free, 1);
    tx.set(wallet, { lotus: w.lotus - 1, free: w.free - 무상, paid: w.paid - (1 - 무상) }, { merge: true });
    tx.set(db.collection(`wallet-log/${me}/list`).doc(), { n: -1, paid: -(1 - 무상), free: -무상, why: "yeon-waiting", at: FieldValue.serverTimestamp() });
    tx.set(표, { uid: me, at: FieldValue.serverTimestamp() });
    return 1;
  });
  if (남음 < 0) return Response.json({ error: "need-lotus" }, { status: 402 });
  return Response.json(await 셈(app, db, me, true));
}
