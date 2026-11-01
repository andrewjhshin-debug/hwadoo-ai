// 연락처 열기 — 쪽지가 이어진 둘이 **둘 다** 열어야 서로의 연락처가 보인다.
//
// 형: 「서로 인증하면 번호 또는 카톡아이디 공유되기 기능 넣어야겠지? 서로 쪽지해서 오픈하면」
// 연락처는 dm-contacts/{대화 id} 에만 산다 — 규칙에 칸이 없어 손님은 못 읽는다.
// 서버가 대화 멤버·수락·양쪽 다 열었는지를 보고 상대 것만 돌려준다.
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{6,64}$/;

async function 펴기(req: Request, threadId: unknown) {
  const app = adminApp();
  if (!app) return { error: Response.json({ error: "server-not-ready" }, { status: 503 }) };
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  let uid = "";
  try { uid = (await getAuth(app).verifyIdToken(token)).uid; } catch { return { error: Response.json({ error: "bad-token" }, { status: 401 }) }; }
  if (typeof threadId !== "string" || !ID.test(threadId)) return { error: Response.json({ error: "bad-thread" }, { status: 400 }) };
  const db = getFirestore(app);
  const t = (await db.doc(`dm-threads/${threadId}`).get()).data() as { members?: string[]; status?: string } | undefined;
  if (!t?.members?.includes(uid) || t.status !== "accepted") return { error: Response.json({ error: "not-member" }, { status: 403 }) };
  const 상대 = t.members.find((m) => m !== uid) ?? "";
  return { uid, 상대, ref: db.doc(`dm-contacts/${threadId}`) };
}

function 답(d: Record<string, string> | undefined, uid: string, 상대: string) {
  const 나 = !!d?.[uid], 너 = !!d?.[상대];
  return Response.json({ mine: 나, theirs: 너, contact: 나 && 너 ? d![상대] : null }, { headers: { "cache-control": "no-store" } });
}

/** GET ?thread= — 내가 열었나 · 상대가 열었나 · 둘 다면 상대 연락처 */
export async function GET(req: Request) {
  const p = await 펴기(req, new URL(req.url).searchParams.get("thread"));
  if ("error" in p) return p.error;
  return 답((await p.ref.get()).data() as Record<string, string> | undefined, p.uid, p.상대);
}

/** POST { thread, contact } — 내 연락처(카톡 아이디나 번호)를 건다. 빈 값이면 거둔다 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const p = await 펴기(req, b?.thread);
  if ("error" in p) return p.error;
  const contact = typeof b?.contact === "string" ? b.contact.trim().replace(/[<>]/g, "").slice(0, 40) : "";
  await p.ref.set({ [p.uid]: contact }, { merge: true });
  return 답((await p.ref.get()).data() as Record<string, string> | undefined, p.uid, p.상대);
}
