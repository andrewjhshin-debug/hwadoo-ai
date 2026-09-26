// ─────────────────────────────────────────────────────────────
// 공감 · 공덕 나누기 — 남의 공양 앞에서.
//
// 형: 「사연 보여지고 그거 눌리고 공감이나 댓 쓸 수 있게 하고」
//     「사람들이 내 공덕 나눠주기 기능 넣어서 얼마간 정도면 하루
//      늘어나도록. 그게 얼마나 하는 게 좋을지는 니가 판단해봐」
//
// ■ 공감(cheer)
//   한 사람이 한 번. 두 번 누르면 거둔다. 누가 눌렀나는
//   `candle-cheers/{초id}_{uid}` 한 칸으로 기억한다 — 세는 것은
//   문서의 `cheers` 한 수다(읽을 때 세면 백 명이면 백 번 읽는다).
//
// ■ 공덕 나누기(pour) — **왜 3,240 인가**
//   공덕 장부는 브라우저에 있다(merit.ts). 그러니 서버는 「얼마를
//   보냈다」를 받아 적을 수밖에 없다 — 대신 **한 번에 한 바퀴(108)**만
//   받는다. 거짓으로 백만을 보내도 108 만 적힌다.
//
//   하루를 늘리는 데 서른 바퀴(3,240)다. 까닭 —
//    · 한 사람이 한 자리에 하루 한 번(108) 준다. 그러니 **서른 사람**이
//      손을 모으면 하루가 는다. 혼자서는 못 늘린다 — 그게 이 기능의 뜻이다
//    · 연꽃 한 송이가 32,400 이고 사흘이니 하루가 10,800 이다.
//      공덕 나눔은 그 3분의 1 — **남이 대신 걸어 주는 수고**만큼 싸다.
//      더 싸면 아무도 연꽃을 안 사고, 같으면 아무도 안 나눈다
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// POST { id, act: "cheer" | "pour" }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { POUR_PER_DAY, POUR_UNIT } from "@/lib/candleSpec";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });
  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { id?: unknown; act?: unknown }
    | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const act = body?.act === "pour" ? "pour" : "cheer";
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(id))
    return Response.json({ error: "bad-id" }, { status: 400 });

  const db = getFirestore(app);
  const 초 = db.doc(`candles/${id}`);
  const s = await 초.get();
  if (!s.exists) return Response.json({ error: "no-candle" }, { status: 404 });
  // 제 것에는 못 준다 — 제 등에 제 공덕을 부으면 그건 나눔이 아니다
  if (s.data()!.uid === uid)
    return Response.json({ error: "mine" }, { status: 409 });

  if (act === "cheer") {
    const 표 = db.doc(`candle-cheers/${id}_${uid}`);
    const 있나 = await 표.get();
    if (있나.exists) {
      await Promise.all([
        표.delete(),
        초.set({ cheers: FieldValue.increment(-1) }, { merge: true }),
      ]);
      return Response.json({ ok: true, on: false });
    }
    await Promise.all([
      표.set({ id, uid, at: FieldValue.serverTimestamp() }),
      초.set({ cheers: FieldValue.increment(1) }, { merge: true }),
    ]);
    return Response.json({ ok: true, on: true });
  }

  // ── 공덕 나누기 ──
  // 한 자리에 하루 한 번.
  //
  // **그 검사가 트랜잭션 밖에 있었다.** 밖에서 한 번 보고 안에서 쓰면,
  // 한꺼번에 서른 번을 쏘면 서른 번 다 「없다」를 보고 서른 번 다 적힌다 —
  // 혼자서 하루를 늘릴 수 있었다. 「서른 사람이 손을 모아야」가 그 자리에서
  // 깨진다. 읽는 것도 쓰는 것도 **한 트랜잭션 안**에서 한다.
  const 날 = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const 자국 = db.doc(`candle-pours/${id}_${uid}_${날}`);

  let 이미 = false;
  const 늘었나 = await db.runTransaction(async (tx) => {
    // 트랜잭션은 **읽기를 다 하고** 쓴다
    const [자국s, 초s] = await Promise.all([tx.get(자국), tx.get(초)]);
    if (자국s.exists) {
      이미 = true;
      return false;
    }
    const d = 초s.data()!;
    // 이미 꺼진 것에는 안 붓는다 — 부어도 살아나지 않는다
    const until = typeof d.until === "number" ? d.until : 0;
    if (until <= Date.now()) {
      이미 = true;
      return false;
    }
    const 모인 = (typeof d.pool === "number" ? d.pool : 0) + POUR_UNIT;
    const 하루 = 모인 >= POUR_PER_DAY;
    tx.set(
      초,
      하루
        ? { pool: 모인 - POUR_PER_DAY, until: until + DAY }
        : { pool: 모인 },
      { merge: true }
    );
    tx.set(자국, { id, uid, day: 날, at: FieldValue.serverTimestamp() });
    return 하루;
  });

  if (이미) return Response.json({ error: "already-today" }, { status: 409 });
  return Response.json({ ok: true, added: 늘었나, unit: POUR_UNIT });
}
