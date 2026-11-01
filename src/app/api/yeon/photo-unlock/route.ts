// 사진 더 보기 — 🪷1 로 이레 동안 그 사람 사진을 다 본다.
// 형: 「돈 더 뜯으려면」. 카드에는 앞 두 장만 오고(yeonPick 무료사진), 나머지 주소는
// 여기서 값을 치른 뒤에만 서버가 준다. photo-unlock/{보는이}_{대상} = { until }
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { today, 추려서, type 프로필 } from "@/lib/yeonPick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const 값 = 1;
const 이레 = 7 * 86_400_000;

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  let uid = "", 주인 = false;
  try {
    const d = await getAuth(app).verifyIdToken(token);
    uid = d.uid;
    주인 = isAdminAccount({ uid, email: d.email, emailVerified: d.email_verified });
  } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const target = typeof b?.target === "string" && /^[A-Za-z0-9]{6,64}$/.test(b.target) ? b.target : "";
  if (!target || target === uid) return Response.json({ error: "bad-target" }, { status: 400 });
  const db = getFirestore(app);
  // 판에 서는 문턱(firestore.rules isOpen · /api/avatar 와 같다) + 막은 사이는 안 된다
  // + **실제로 내게 보인 사람만** — 오늘 카드(yeon-daily)에 뽑혔거나, 나를 합장해
  //   기다리는 줄에 섰고 오늘 그 줄을 열었다. 아무 uid 나 넣어 사진을 사 가지 못하게.
  const 날 = today();
  const [프, 내가막음, 쟤가막음, 오늘칸, 기다림, 줄열림] = await Promise.all([
    db.doc(`yeon-profiles/${target}`).get(),
    db.doc(`yeon-blocks/${uid}/list/${target}`).get(),
    db.doc(`yeon-blocks/${target}/list/${uid}`).get(),
    db.doc(`yeon-daily/${uid}_${날}`).get(),
    db.collection("yeon-haps").where("from", "==", target).where("to", "==", uid).limit(1).get(),
    db.doc(`yeon-waiting-open/${uid}_${날}`).get(),
  ]);
  const p = 프.data() as { state?: string; approvedPhotoCount?: number; reportHold?: boolean; photoProofRequired?: boolean; photoProof?: { state?: string } } | undefined;
  const 열림 =
    p?.state === "활동" &&
    (p.approvedPhotoCount ?? 0) > 0 &&
    p.reportHold !== true &&
    (p.photoProofRequired !== true || p.photoProof?.state === "ok");
  const 칸 = 오늘칸.data() as { picks?: string[]; pin?: string[] } | undefined;
  const 보였나 = 주인 || !!칸?.picks?.includes(target) || !!칸?.pin?.includes(target) || (!기다림.empty && 줄열림.exists);
  if (!열림 || 내가막음.exists || 쟤가막음.exists || !보였나)
    return Response.json({ error: "bad-target" }, { status: 404 });
  const ref = db.doc(`photo-unlock/${uid}_${target}`);
  const ok = await db.runTransaction(async (tx) => {
    const u = (await tx.get(ref)).data()?.until;
    if (typeof u === "number" && u > Date.now()) return true; // 이미 열려 있다 — 또 안 받는다
    if (!주인 && !(await 연꽃쓰기(tx, db, uid, 값, "yeon-photo-unlock"))) return false;
    tx.set(ref, { viewer: uid, target, until: Date.now() + 이레, at: FieldValue.serverTimestamp() });
    return true;
  });
  if (!ok) return Response.json({ error: "need-lotus" }, { status: 402 });
  const 카드 = await 추려서(app, { uid: target, ...프.data() } as 프로필);
  return Response.json({ ok: true, photos: 카드.photos });
}
