// ─────────────────────────────────────────────────────────────
// 회향 — 쌓은 공덕을 여섯 자리 중 하나에 붓는다.
//
// ■ 왜 서버인가
//   이 셈은 **모두가 같이 보는 수**다. 브라우저가 직접 쓰게 두면
//   콘솔 한 줄로 오늘 공덕 백만이 된다. 초 공양과 달리 되돌릴 문서도
//   없고(한 자리에 모두가 겹쳐 쓴다), 한 번 더러워지면 못 씻는다.
//
// ■ 무엇을 막고 무엇을 안 막나
//   · 막는다 — **한 자리에 하루 한 번.** 계정마다, 자리마다 서버가 센다.
//     그래서 「오늘 몇 명」이 부풀지 않는다 — 한 번이 곧 한 사람이다.
//   · 막는다 — 같은 요청 두 번(멱등표).
//   · 안 막는다 — 「정말 공덕을 쌓았는가」. 회향은 **값이 드는 일이 아니다.**
//     공덕 한 톨도 안 줄고, 그래서 공덕 0 인 사람도 할 수 있다(발심).
//     서버가 막을 것은 같은 자리를 여러 번 세는 일뿐이다.
//
// ■ 날짜 키는 **서버가 만든다**
//   브라우저가 보낸 날짜를 쓰면 기기 시계를 돌려 하루 한 번을 우회한다.
//   몸통에는 날짜가 아예 없고, 여기서 kstDay(Date.now()) 로만 잰다.
//
// ■ 날은 한국 시각으로 센다(hallSpec.kstDay)
//   서버는 UTC 다. 그대로 두면 아침 아홉 시에 하루가 바뀐다.
//
// 인증: Authorization: Bearer <파이어베이스 ID 토큰>
// 몸통: { seat, key }
// 답:   { ok, again, done: string[], seat: SeatCount }
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { POUR, SEAT_IDS, kstDay } from "@/lib/hallSpec";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEATS = new Set(SEAT_IDS);

export async function POST(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return Response.json({ error: "no-token" }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "bad-token" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 1000) return Response.json({ error: "too-big" }, { status: 413 });
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return Response.json({ error: "bad-body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  const seatId = typeof body.seat === "string" ? body.seat : "";
  if (!SEATS.has(seatId)) return Response.json({ error: "bad-seat" }, { status: 400 });

  // 멱등표 — 초 공양과 같은 방식(/api/candle/light).
  // 답을 못 받고 다시 누르면 백팔이 두 번 들어간다. 브라우저가 뽑은 표를
  // 문서 이름으로 써서 두 번째 요청은 「이미 부었다」로 끝낸다.
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) {
    return Response.json({ error: "bad-key" }, { status: 400 });
  }

  const db = getFirestore(app);
  const now = Date.now();
  const day = kstDay(now);

  const mark = db.doc(`gifts/${uid}_${key}`);
  const tally = db.doc(`giving/${uid}_${day}`);
  const seat = db.doc(`hall/${seatId}`);

  try {
    const out = await db.runTransaction(async (tx) => {
      // 읽기가 먼저다(Firestore 규약)
      const [m, t, s] = await tx.getAll(mark, tally, seat);

      const after = (v: unknown, add: number) => (typeof v === "number" ? v : 0) + add;
      const cur = s.data() ?? {};
      const sameDay = cur.day === day;
      const snapshot = (extra: number, extraGivers: number) => ({
        merit: after(cur.merit, extra),
        givers: after(cur.givers, extraGivers),
        day,
        todayMerit: (sameDay ? after(cur.todayMerit, 0) : 0) + extra,
        todayGivers: (sameDay ? after(cur.todayGivers, 0) : 0) + extraGivers,
      });

      // 오늘 이미 돈 자리들
      const raw = t.data()?.done as unknown;
      const done: Record<string, boolean> =
        typeof raw === "object" && raw !== null && !Array.isArray(raw)
          ? (raw as Record<string, boolean>)
          : {};
      const listOf = (extra?: string) => {
        const set = new Set(Object.keys(done).filter((k) => done[k]));
        if (extra) set.add(extra);
        return [...set].filter((k) => SEATS.has(k));
      };

      if (m.exists) {
        // 같은 표가 또 왔다 — 이미 센 일이다. 셈은 그대로 두고 지금 값만 돌려준다.
        return { ok: true as const, again: true, done: listOf(), seat: snapshot(0, 0) };
      }

      if (done[seatId] === true) {
        // 오늘 이 자리엔 이미 왔다. 한 자리에 두 번 빌 까닭이 없다.
        return { ok: false as const, again: false, done: listOf(), seat: snapshot(0, 0) };
      }

      // 이틀 뒤면 셀 일이 없는 표들이다. 지우는 일꾼을 두느니 만료를 적어 두고
      // Firestore TTL 에 맡긴다(콘솔 > Firestore > TTL 에서 gifts.expire,
      // giving.expire 두 개를 켠다. 안 켜도 셈은 맞고 문서만 쌓인다).
      tx.set(mark, {
        uid,
        seat: seatId,
        at: FieldValue.serverTimestamp(),
        expire: new Date(now + 2 * 86_400_000),
      });
      tx.set(
        tally,
        {
          uid,
          day,
          done: { [seatId]: true },
          expire: new Date(now + 30 * 86_400_000),
        },
        { merge: true }
      );

      // 자리 하나에 모두가 겹쳐 쓴다. 지금 규모(하루 몇 십)에서는 트랜잭션
      // 하나로 넉넉하지만, 문서 하나의 쓰기는 초당 한 번쯤이 한도다.
      // 손이 몰리면 hall/{seatId}/acts/{autoId} 로 쓰기를 흩고 집계만
      // 함수로 떼면 된다 — 그때 고칠 자리라 여기 적어 둔다.
      tx.set(
        seat,
        sameDay
          ? {
              merit: FieldValue.increment(POUR),
              givers: FieldValue.increment(1),
              todayMerit: FieldValue.increment(POUR),
              todayGivers: FieldValue.increment(1),
              at: FieldValue.serverTimestamp(),
            }
          : {
              // 날이 바뀌었다 — 오늘치는 이 한 번으로 새로 시작한다
              merit: FieldValue.increment(POUR),
              givers: FieldValue.increment(1),
              day,
              todayMerit: POUR,
              todayGivers: 1,
              at: FieldValue.serverTimestamp(),
            },
        { merge: true }
      );

      return {
        ok: true as const,
        again: false,
        done: listOf(seatId),
        seat: snapshot(POUR, 1),
      };
    });

    if (!out.ok) return Response.json({ error: "already-today", done: out.done }, { status: 409 });
    return Response.json({ ok: true, again: out.again, done: out.done, seat: out.seat });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}
