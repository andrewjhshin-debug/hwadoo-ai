// 연락처 열기 — 쪽지가 이어진 둘이 **둘 다** 열어야 서로의 연락처가 보인다.
//
// 형: 「서로 인증하면 번호 또는 카톡아이디 공유되기 기능 넣어야겠지? 서로 쪽지해서 오픈하면」
//     「번호나 카톡 아이디는 맨 마지막에 공개, 꽁 숨겨 놓고」
// 연락처는 dm-contacts/{대화 id} 에만 산다 — 규칙에 칸이 없어 손님은 못 읽는다.
// 서버가 대화 멤버·수락·양쪽 다 열었는지를 보고 상대 것만 돌려준다.
//
// 값: 열 때 각자 🪷5, 또는 한 사람이 🪷9 로 둘 몫을 낸다. 한 번 낸 사람은
// 거뒀다 다시 열어도 또 안 낸다(paid 표).
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { DM_CONTACT, DM_CONTACT_BOTH } from "@/lib/dmLadder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{6,64}$/;
type 문서 = { [uid: string]: unknown; paid?: Record<string, boolean> };

async function 펴기(req: Request, threadId: unknown) {
  const app = adminApp();
  if (!app) return { error: Response.json({ error: "server-not-ready" }, { status: 503 }) };
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  let uid = "", email: string | undefined;
  try {
    const d = await getAuth(app).verifyIdToken(token);
    uid = d.uid;
    email = d.email_verified ? d.email : undefined;
  } catch { return { error: Response.json({ error: "bad-token" }, { status: 401 }) }; }
  if (typeof threadId !== "string" || !ID.test(threadId)) return { error: Response.json({ error: "bad-thread" }, { status: 400 }) };
  const db = getFirestore(app);
  const t = (await db.doc(`dm-threads/${threadId}`).get()).data() as { members?: string[]; status?: string } | undefined;
  if (!t?.members?.includes(uid) || t.status !== "accepted") return { error: Response.json({ error: "not-member" }, { status: 403 }) };
  const 상대 = t.members.find((m) => m !== uid) ?? "";
  return { uid, 상대, db, 주인: isAdminAccount({ uid, email, emailVerified: !!email }), ref: db.doc(`dm-contacts/${threadId}`) };
}

function 답(d: 문서 | undefined, uid: string, 상대: string) {
  const 값 = (k: string) => (typeof d?.[k] === "string" ? (d[k] as string) : "");
  const 나 = !!값(uid), 너 = !!값(상대);
  return Response.json(
    { mine: 나, theirs: 너, paidMine: !!d?.paid?.[uid], paidTheirs: !!d?.paid?.[상대], contact: 나 && 너 ? 값(상대) : null },
    { headers: { "cache-control": "no-store" } }
  );
}

/** GET ?thread= — 내가 열었나 · 상대가 열었나 · 냈나 · 둘 다면 상대 연락처 */
export async function GET(req: Request) {
  const p = await 펴기(req, new URL(req.url).searchParams.get("thread"));
  if ("error" in p) return p.error;
  return 답((await p.ref.get()).data() as 문서 | undefined, p.uid, p.상대);
}

/** POST { thread, contact, both? } — 내 연락처를 건다(처음이면 값을 낸다). 빈 값이면 거둔다 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const p = await 펴기(req, b?.thread);
  if ("error" in p) return p.error;
  const contact = typeof b?.contact === "string" ? b.contact.trim().replace(/[<>]/g, "").slice(0, 40) : "";
  const both = b?.both === true;
  const out = await p.db.runTransaction(async (tx) => {
    const d = ((await tx.get(p.ref)).data() ?? {}) as 문서;
    const paid = { ...(d.paid ?? {}) };
    if (contact && !paid[p.uid]) {
      const n = both && !paid[p.상대] ? DM_CONTACT_BOTH : DM_CONTACT;
      if (!p.주인 && !(await 연꽃쓰기(tx, p.db, p.uid, n, n === DM_CONTACT_BOTH ? "dm-contact-both" : "dm-contact"))) return null;
      paid[p.uid] = true;
      if (n === DM_CONTACT_BOTH) paid[p.상대] = true;
    }
    tx.set(p.ref, { [p.uid]: contact, paid }, { merge: true });
    return { ...d, [p.uid]: contact, paid };
  });
  if (!out) return Response.json({ error: "need-lotus" }, { status: 402 });
  return 답(out, p.uid, p.상대);
}
