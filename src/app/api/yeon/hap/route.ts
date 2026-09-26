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
import { MERIT_ON_MATCH, QUIET_HOURS, pairId, today } from "@/lib/yeonPick";

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

  // 합장을 적는다
  await db.doc(`yeon-haps/${me}_${to}`).set({
    from: me,
    to,
    at: FieldValue.serverTimestamp(),
  });

  // 저쪽이 먼저 합장해 두었나 — 그러면 인연이 닿는다
  const 저쪽 = await db.doc(`yeon-haps/${to}_${me}`).get();
  if (!저쪽.exists) return Response.json({ ok: true, matched: false });

  const id = pairId(me, to);
  const 방 = db.doc(`yeon-matches/${id}`);
  const 이미 = await 방.get();
  // 짝 문서가 있어도 **방이 살아 있을 때만** 그 id 를 돌려준다.
  // 사흘 조용해서 걷힌 방은 thread 칸이 비어 있다(api/push/daily) —
  // 그걸 그대로 돌려주면 「인연이 닿았습니다」가 뜨는데 쪽지함엔 아무것도
  // 없고, 그 짝은 영영 새 방을 못 연다.
  const 옛방: string | undefined = 이미.exists ? 이미.data()!.thread : undefined;
  if (옛방) {
    const t = await db.doc(`dm-threads/${옛방}`).get();
    if (t.exists) return Response.json({ ok: true, matched: true, thread: 옛방 });
  }

  // 쪽지방을 연다 — 기존 dm-threads 를 그대로 쓴다.
  //
  // **모양을 꼭 맞춰야 한다.** 쪽지함(/letters)은 한 줄을 그릴 때
  // `t.ownerUid === 나 ? t.requesterName : t.ownerName` 로 상대 이름을
  // 집는다. 인연 방에 그 칸이 없으면 undefined 가 되고, 바로 다음 줄의
  // `.slice(0,1)` 에서 터져 **쪽지함 전체가 하얗게 죽는다** — 그 한 줄이
  // 아니라 판이 통째로.
  // 쪽지 보내기도 마찬가지다. sendMessage 가 방 문서를 갱신하는데,
  // 규칙이 `requesterUid` 가 그대로인지 보므로 그 칸이 없으면 거절된다.
  // 그래서 모임 글에서 열린 방과 **같은 칸을 다 채운다.**
  const [나문서, 저문서] = await Promise.all([
    db.doc(`yeon-profiles/${me}`).get(),
    db.doc(`yeon-profiles/${to}`).get(),
  ]);
  const 내이름 = (나문서.data()?.name as string) || "도반";
  const 저이름 = (저문서.data()?.name as string) || "도반";

  const thread = db.collection("dm-threads").doc();
  const 때 = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(thread, {
    members: [me, to],
    // 인연으로 열린 방은 청할 것이 없다 — 바로 이어진 사이다
    status: "accepted",
    requesterUid: me,
    requesterName: 내이름,
    ownerUid: to,
    ownerName: 저이름,
    // 모임 글에서 온 방이 아니다. 쪽지함이 제목 자리에 이것을 적는다
    postId: "",
    postTitle: "因緣 · 인연",
    intro: "",
    msgCount: 0,
    from: me,
    to,
    kind: "yeon",
    createdAt: 때,
    updatedAt: 때,
  });
  batch.set(방, {
    pair: [me, to],
    thread: thread.id,
    at: 때,
    // 아무 말 없이 사흘이 지나면 조용히 닫는다. 죽은 방이 쌓이면
    // 쪽지함이 쓸모없어진다
    quietUntil: Date.now() + QUIET_HOURS * 3600_000,
    closed: false,
  });
  await batch.commit();

  // 공덕은 양쪽에 — 만남도 수행이다.
  // 공덕 장부는 브라우저에 있으므로(merit.ts) 여기서는 「받을 것」만 적어
  // 두고, 각자 들어올 때 챙겨 간다
  const 몫 = { merit: MERIT_ON_MATCH, why: "yeon", at: 때 };
  await Promise.all([
    db.collection(`yeon-owed/${me}/list`).add(몫),
    db.collection(`yeon-owed/${to}/list`).add(몫),
  ]);

  return Response.json({ ok: true, matched: true, thread: thread.id });
}
