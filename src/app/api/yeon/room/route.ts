// ─────────────────────────────────────────────────────────────
// 쪽지방 열기 — 청실홍실 둘 사이에 한 번만.
//
// 형: 「쪽지방 파는 거만 연꽃 받고, 쪽지 보낼 때마다는 과금 안 한다」
// 먼저 여는 쪽이 🪷3, 이미 열렸으면 그냥 들어간다. 그 뒤 쪽지는 무제한 무료.
//
// POST { pair } → { thread } | 402 need-lotus
// ─────────────────────────────────────────────────────────────
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { isAdminAccount } from "@/lib/config";
import { 연꽃쓰기 } from "@/lib/walletSpend";
import { ROOM } from "@/lib/dmLadder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  let uid = "", 주인 = false;
  try {
    const d = await getAuth(app).verifyIdToken(token);
    uid = d.uid;
    주인 = isAdminAccount({ uid: d.uid, email: d.email, emailVerified: d.email_verified });
  } catch { return Response.json({ error: "bad-token" }, { status: 401 }); }
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const pairKey = typeof b?.pair === "string" && /^[A-Za-z0-9]{6,64}_[A-Za-z0-9]{6,64}$/.test(b.pair) ? b.pair : "";
  if (!pairKey) return Response.json({ error: "bad-pair" }, { status: 400 });
  const db = getFirestore(app);
  const 짝 = db.doc(`yeon-pairs/${pairKey}`);
  const out = await db.runTransaction(async (tx) => {
    const p = (await tx.get(짝)).data();
    if (!p || !(p.pair as string[]).includes(uid)) return { error: "not-member", status: 403 };
    if (p.thread) return { thread: p.thread as string };
    const 저 = (p.pair as string[]).find((m) => m !== uid)!;
    // 서로 막은 사이면 방을 안 연다(막은 뒤에 남은 짝 문서로 우회 금지) — 읽기는 쓰기보다 먼저
    const [내막음, 쟤막음] = await Promise.all([tx.get(db.doc(`yeon-blocks/${uid}/list/${저}`)), tx.get(db.doc(`yeon-blocks/${저}/list/${uid}`))]);
    if (내막음.exists || 쟤막음.exists) return { error: "blocked", status: 409 };
    if (!주인 && !(await 연꽃쓰기(tx, db, uid, ROOM, "dm-room"))) return { error: "need-lotus", status: 402 };
    const 방 = db.collection("dm-threads").doc();
    const 때 = FieldValue.serverTimestamp();
    // 쪽지함(/letters)이 읽는 칸을 다 채운다 — 이름 칸이 비면 목록이 터진다
    tx.set(방, {
      members: [uid, 저],
      status: "accepted",
      requesterUid: uid,
      requesterName: p.names?.[uid] || "도반",
      ownerUid: 저,
      ownerName: p.names?.[저] || "도반",
      postId: "",
      postTitle: "청실홍실",
      intro: "",
      msgCount: 0,
      kind: "yeon",
      pair: pairKey,
      createdAt: 때,
      updatedAt: 때,
    });
    tx.set(짝, { state: "room", thread: 방.id, roomBy: uid }, { merge: true });
    return { thread: 방.id };
  });
  if ("error" in out) return Response.json({ error: out.error }, { status: out.status });
  return Response.json({ ok: true, thread: out.thread });
}
