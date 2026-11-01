// 친구 초대 — 초대한 이와 들어온 이에게 연꽃 한 송이씩.
//
// 문턱: 들어온 이는 **가입 하루 안**의 새 계정, 한 사람은 한 번만 초대받는다(invites/{새 uid}),
// 초대한 이는 평생 스무 명까지. 자기 자신은 안 된다.
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { 지갑열기, 무상기한 } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const 상한 = 20;

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  let me = "";
  // 메일이 확인된 계정만(구글 로그인은 늘 확인됨) — 익명·가짜 계정으로 연꽃을 찍어 내지 못하게
  try { const t = await getAuth(app).verifyIdToken(token); if (!t.email_verified) throw 0; me = t.uid; } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as { ref?: unknown } | null;
  const ref = typeof b?.ref === "string" && /^[A-Za-z0-9]{6,64}$/.test(b.ref) ? b.ref : "";
  if (!ref || ref === me) return Response.json({ error: "bad-ref" }, { status: 400 });
  const [나, 그이] = await Promise.all([getAuth(app).getUser(me), getAuth(app).getUser(ref).catch(() => null)]);
  if (!그이) return Response.json({ error: "bad-ref" }, { status: 400 });
  if (Date.now() - Date.parse(나.metadata.creationTime) > 24 * 3600_000) return Response.json({ error: "not-new" }, { status: 409 });

  const db = getFirestore(app);
  const 표 = db.doc(`invites/${me}`), 셈 = db.doc(`invite-counts/${ref}`);
  const 지갑들 = [db.doc(`wallets/${me}`), db.doc(`wallets/${ref}`)];
  const 결과 = await db.runTransaction(async (tx) => {
    const [이미, 센] = await Promise.all([tx.get(표), tx.get(셈)]);
    if (이미.exists) return "done";
    if (((센.data()?.n as number) ?? 0) >= 상한) return "cap";
    const 열린 = await Promise.all(지갑들.map((w) => 지갑열기(tx, w)));
    지갑들.forEach((w, i) => {
      const { 지갑: x } = 열린[i];
      tx.set(w, { lotus: x.lotus + 1, paid: x.paid, free: x.free + 1, freeUntil: 무상기한() }, { merge: true });
    });
    tx.set(표, { ref, at: FieldValue.serverTimestamp() });
    tx.set(셈, { n: FieldValue.increment(1) }, { merge: true });
    return "ok";
  });
  return Response.json({ ok: 결과 === "ok", why: 결과 });
}
