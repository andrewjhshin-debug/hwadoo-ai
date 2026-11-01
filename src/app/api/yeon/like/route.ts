// ─────────────────────────────────────────────────────────────
// 호감 보내기 — 인연의 **하나뿐인 입구**.
//
// 형: 「글 쓰고 댓글 있고 쪽지하고 쪽지 받고 매칭하고 — 흐름대로」
//     「호감 보내기 하고 상대가 받으면 번호나 카톡 아이디 열기」
// 게시판 얼굴 · 글 머리 · 오늘의 인연 카드 · 법당 좌복 카드 — 다 여기로 온다.
//
// POST { to, line, sincere? }
//   · 저쪽이 먼저 나에게 호감을 보내 두었으면 → 청실홍실(값 없음)
//   · 아니면 호감 🪷1 / 진심 🪷3 을 내고 yeon-likes/{나}_{저} 에 적는다
//   → { matched, pair? } | 402 need-lotus
//
// yeon-likes · yeon-pairs 는 규칙에 칸이 없다 — 서버만 읽고 쓴다.
// ─────────────────────────────────────────────────────────────
import { randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { LIKE, LIKE_SINCERE } from "@/lib/dmLadder";
import { pairId, today } from "@/lib/yeonPick";
import { 맺기 } from "@/lib/yeonMatch";
import { 알림쓰기 } from "@/lib/alertsServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{6,64}$/;

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me = "", 주인 = false;
  try {
    const d = await getAuth(app).verifyIdToken(token);
    me = d.uid;
    주인 = isAdminAccount({ uid: d.uid, email: d.email, emailVerified: d.email_verified });
  } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const to = typeof b?.to === "string" ? b.to : "";
  const line = typeof b?.line === "string" ? b.line.trim().replace(/[<>]/g, "").slice(0, 80) : "";
  const sincere = b?.sincere === true;
  if (!ID.test(to) || to === me) return Response.json({ error: "bad-target" }, { status: 400 });
  // 샘플 글의 가짜 계정에는 아무것도 가지 않는다 — 값을 받고 없는 사람에게 보내면 기만이다
  if (to.startsWith("hwaduSample")) return Response.json({ error: "sample" }, { status: 409 });

  const db = getFirestore(app);
  const [내가막음, 쟤가막음, 내프] = await Promise.all([
    db.doc(`yeon-blocks/${me}/list/${to}`).get(),
    db.doc(`yeon-blocks/${to}/list/${me}`).get(),
    db.doc(`yeon-profiles/${me}`).get(),
  ]);
  if (내가막음.exists || 쟤가막음.exists) return Response.json({ error: "blocked" }, { status: 409 });
  const 내이름 = (내프.data()?.name as string) || "도반";

  // 오늘의 인연 카드에서 보냈다면 그 장은 오늘치에서 빠진다
  await db.doc(`yeon-daily/${me}_${today()}`).set({ done: FieldValue.arrayUnion(to) }, { merge: true }).catch(() => {});

  // 저쪽이 먼저 보내 두었다 — 「나도」는 값이 없다
  if (await 맺기(db, me, to, line)) return Response.json({ ok: true, matched: true, pair: pairId(me, to) });

  const 보낸 = db.doc(`yeon-likes/${me}_${to}`);
  const out = await db.runTransaction(async (tx) => {
    const 내것 = await tx.get(보낸);
    if (내것.exists && 내것.data()?.state === "sent") return "already" as const;
    const n = sincere ? LIKE_SINCERE : LIKE;
    if (!주인 && !(await 연꽃쓰기(tx, db, me, n, sincere ? "like-sincere" : "like"))) return "lotus" as const;
    tx.set(보낸, {
      from: me, to, line, sincere,
      fromName: 내이름,
      // 받은 호감함에서 가려진 채로 「나도·넘기기」를 누를 손잡이 — uid 를 드러내지 않는다
      key: randomBytes(12).toString("hex"),
      state: "sent",
      at: FieldValue.serverTimestamp(),
    });
    return "sent" as const;
  });
  if (out === "lotus") return Response.json({ error: "need-lotus" }, { status: 402 });
  if (out === "sent")
    // 받는 쪽엔 누군지 말하지 않는다 — 진심만 이름을 단다(누군지 보기 🪷1 이 값이다)
    await 알림쓰기(db, to, `like_${me}`, { kind: "like", text: sincere ? `${내이름}님이 진심을 보냈어요` : "누군가 호감을 보냈어요" }).catch(() => {});
  return Response.json({ ok: true, matched: false, already: out === "already" });
}
