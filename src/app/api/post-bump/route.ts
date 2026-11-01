// 글 끌어올리기 — 🪷3 로 하루 동안 인연판 맨 위. 글쓴이만.
// bumpUntil 은 서버만 쓴다(규칙이 브라우저를 막는다).
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const 값 = 3;
const 하루 = 86_400_000;

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
  const post = typeof b?.post === "string" && /^[A-Za-z0-9]{6,64}$/.test(b.post) ? b.post : "";
  if (!post) return Response.json({ error: "bad-post" }, { status: 400 });
  const db = getFirestore(app);
  const ref = db.doc(`posts/${post}`);
  const out = await db.runTransaction(async (tx) => {
    const p = (await tx.get(ref)).data() as { authorUid?: string; board?: string; deleted?: boolean; bumpUntil?: number } | undefined;
    if (!p || p.authorUid !== uid || p.board !== "gathering" || p.deleted) return { error: "not-mine", status: 403 };
    if (!주인 && !(await 연꽃쓰기(tx, db, uid, 값, "post-bump"))) return { error: "need-lotus", status: 402 };
    // 아직 위에 있으면 그 위에 하루를 얹는다
    const bumpUntil = Math.max(Date.now(), p.bumpUntil ?? 0) + 하루;
    tx.update(ref, { bumpUntil });
    return { bumpUntil };
  });
  if ("error" in out) return Response.json({ error: out.error }, { status: out.status });
  return Response.json({ ok: true, bumpUntil: out.bumpUntil });
}
