// ─────────────────────────────────────────────────────────────
// 합장(合掌) — 마음을 보낸다. 서로 보내면 인연이 닿는다.
//
// 형: 「인연에서 매칭되면 서로 쪽지합 열리게 하고」
//
// 왜 서버인가 —
//  · 「누가 나에게 합장했나」는 연꽃으로 파는 것이다. 클라이언트가
//    읽을 수 있으면 값이 통째로 무너진다
//  · 인연이 닿는 순간 **쪽지방을 여는 것**은 양쪽 문서를 한꺼번에
//    만드는 일이라 트랜잭션이 필요하다
//  · 공덕을 주는 것도 서버가 해야 속지 않는다
//
// POST { to: uid, act: "hap" | "pass" }
//   → { matched: bool, thread?: id }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { today } from "@/lib/yeonPick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let me: string;
  try {
    me = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { to?: unknown; act?: unknown }
    | null;
  const to = typeof body?.to === "string" ? body.to : "";
  const act = body?.act === "pass" ? "pass" : "hap";
  if (!/^[A-Za-z0-9]{6,64}$/.test(to) || to === me)
    return Response.json({ error: "bad-target" }, { status: 400 });

  const db = getFirestore(app);
  const day = today();

  // 오늘 뽑힌 사람에게만 할 수 있다 — 아무 uid 에나 합장하는 길을 막는다.
  // 붙박이(운영자) 한 장도 오늘 판에 선 사람이니 같이 본다.
  const 오늘 = await db.doc(`yeon-daily/${me}_${day}`).get();
  const 지금 = 오늘.exists ? 오늘.data()! : null;
  const picks: string[] = 지금?.picks ?? [];
  const pin: string[] = 지금?.pin ?? [];
  if (!picks.includes(to) && !pin.includes(to))
    return Response.json({ error: "not-today" }, { status: 409 });

  // 막은 사이면 아무 일도 없다
  const [내가막음, 쟤가막음] = await Promise.all([
    db.doc(`yeon-blocks/${me}/list/${to}`).get(),
    db.doc(`yeon-blocks/${to}/list/${me}`).get(),
  ]);
  if (내가막음.exists || 쟤가막음.exists)
    return Response.json({ error: "blocked" }, { status: 409 });

  await db.doc(`yeon-daily/${me}_${day}`).set(
    { done: FieldValue.arrayUnion(to) },
    { merge: true }
  );

  // 붙박이는 **날이 바뀌어도** 다시 안 선다. 하루치 칸(yeon-daily)은
  // 날마다 새로 생기니, 한 번 본 붙박이는 따로 적어 둔다.
  if (pin.includes(to))
    await db.doc(`yeon-pins/${me}`).set(
      { done: FieldValue.arrayUnion(to) },
      { merge: true }
    );

  if (act === "pass") return Response.json({ ok: true, matched: false });
  // 마음 보내기는 호감 하나로 모였다 — 형: 「호감 보내기가 하나뿐인 입구」(/api/yeon/like)
  return Response.json({ error: "use-like" }, { status: 410 });
}
