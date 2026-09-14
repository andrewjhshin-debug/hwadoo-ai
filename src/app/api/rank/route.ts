// ─────────────────────────────────────────────────────────────
// 정진 순위 — 어제 하루 가장 많이 쌓은 이들, 그리고 반야심경 최단 시간.
//
// 왜 서버인가 —
// 공덕 장부는 브라우저에 있다. 순위는 남과 견주는 판이니 한곳에 모아야
// 한다. 다만 브라우저가 보내는 숫자는 믿을 게 못 되므로 —
//  · 하루에 올릴 수 있는 공덕에 상한(2000)을 둔다. 넘치면 잘라 낸다.
//  · 이름은 서버가 정한다. 클라이언트가 준 이름은 쳐다보지도 않는다.
//  · 점수는 올라가기만 한다. 기기를 바꿔 빈 장부로 덮어쓰는 일이 없게.
// 그래도 자판을 실제로 쳤는지는 알 수 없다 — 그건 받아들인다.
// 순위는 곁가지다. 여기서 이긴다고 얻는 것은 이름 한 줄뿐이다.
//
// 읽기도 이 라우트를 거친다. 그래야 Firestore 규칙을 손대지 않아도 되고
// (Admin SDK 는 규칙 밖이다), 남의 uid 를 밖으로 흘리지 않는다.
//
// POST  { merit, sutraBest?: { sutraId, seconds } }  · Bearer ID 토큰 필요
// GET   ?day=YYYY-MM-DD   그날 상위 100 (기본: 어제)
// GET   ?board=sutra      반야심경 최단 시간 상위 100
//       토큰을 얹으면 내 자리도 함께 돌려준다. 없으면 그냥 판만.
// ─────────────────────────────────────────────────────────────

import { getAuth } from "firebase-admin/auth";
import {
  FieldPath,
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { adminApp } from "@/lib/firebaseAdmin";
import { ANON_NAMES } from "@/lib/anonName";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 하루에 올릴 수 있는 공덕의 상한 — 하루 종일 해도 이만큼은 안 나온다 */
const DAILY_CAP = 2000;

/** 반야심경은 이백일흔 자다. 이보다 빠르면 사람이 친 게 아니다 */
const SUTRA_MIN = 20;
/** 한 시간을 넘겼으면 자리를 뜬 것이지 친 게 아니다 */
const SUTRA_MAX = 3600;

/** 몇 등까지 보여 주는가 */
const TOP = 100;

/** 하루치를 한 번에 훑는 상한 — 이 위로 커지면 색인을 따로 두어야 한다 */
const SCAN_MAX = 5000;

// ── 날짜 ────────────────────────────────────────────────────
// 서울 시각으로 하루를 끊는다. 브라우저의 현지 시각을 쓰면 시차가 있는
// 신도의 오늘과 서버의 오늘이 어긋나 순위가 두 날에 흩어진다.
// 한국은 서머타임이 없으므로 +9 를 더하고 잘라내면 그게 곧 서울 날짜다.

const KST = 9 * 60 * 60 * 1000;

function dayKey(back = 0): string {
  return new Date(Date.now() + KST - back * 86400000).toISOString().slice(0, 10);
}

/** 밖에서 들어온 날짜 — 꼴이 맞고 오늘을 넘지 않아야 한다 */
function safeDay(raw: string | null): string | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw > dayKey() ? null : raw;
}

// ── 법명 ────────────────────────────────────────────────────
// uid 를 흩어 백 가지 법명 중 하나로 옮긴다. 같은 사람은 늘 같은 법명이다 —
// 어제 일 등이 오늘 또 오르면 알아볼 수 있어야 재미가 붙는다.
// 법명이 백 가지뿐이라 겹치는 사람이 생기는데, 그 겹침이 곧 익명이다.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function nameFor(uid: string): string {
  return ANON_NAMES[hash(uid) % ANON_NAMES.length];
}

// 한 판에 같은 법명이 여럿이면 뒤엣사람에게 숫자를 붙인다 —
// 지혜가 셋 나란히 서면 고장 난 것처럼 보인다.
const NUMERAL = ["", "", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** 줄 순서대로 부를 이름을 지어 준다 — 겹치는 두 번째부터 숫자가 붙는다 */
function distinct(rows: { name: string }[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const nth = (seen.get(r.name) ?? 0) + 1;
    seen.set(r.name, nth);
    return nth === 1 ? r.name : `${r.name} ${NUMERAL[nth] || nth}`;
  });
}

// ── 누구인가 ────────────────────────────────────────────────

async function whoIs(req: Request): Promise<string | null> {
  const app = adminApp();
  if (!app) return null;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    return (await getAuth(app).verifyIdToken(header.slice(7))).uid;
  } catch {
    // 읽기는 로그인 없이도 된다 — 상한 토큰은 그냥 손님으로 친다
    return null;
  }
}

// ── 올리기 ──────────────────────────────────────────────────

type Body = {
  merit?: unknown;
  sutraBest?: { sutraId?: unknown; seconds?: unknown } | null;
};

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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad-body" }, { status: 400 });
  }

  // 터무니없는 값은 물리치지 않고 잘라 낸다 — 순위는 곁가지다
  const raw =
    typeof body.merit === "number" && Number.isFinite(body.merit) ? body.merit : 0;
  const merit = Math.min(DAILY_CAP, Math.max(0, Math.floor(raw)));

  const day = dayKey();
  const name = nameFor(uid);
  const db = getFirestore(app);

  try {
    // 정진 — 오늘치. 이미 올린 것보다 낮으면 그대로 둔다
    // (기기를 바꿔 빈 장부로 들어와도 오늘의 자리를 잃지 않게).
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`rank-daily/${day}_${uid}`);
      const cur = await tx.get(ref);
      const was = cur.exists ? Number(cur.get("merit") ?? 0) : -1;
      // 오늘 아직 아무것도 안 한 사람으로 빈 줄을 만들지 않는다
      if (merit <= 0 || was >= merit) return;
      tx.set(ref, { uid, name, day, merit, at: FieldValue.serverTimestamp() });
    });

    // 외우기 — 반야심경만 센다. 짧은 두 편은 순위가 될 만큼 길지 않다
    const best = body.sutraBest;
    let seconds: number | null = null;
    if (
      best &&
      best.sutraId === "banya" &&
      typeof best.seconds === "number" &&
      Number.isFinite(best.seconds)
    ) {
      const s = Math.round(best.seconds);
      if (s >= SUTRA_MIN && s <= SUTRA_MAX) {
        await db.runTransaction(async (tx) => {
          const ref = db.doc(`rank-sutra/${uid}`);
          const cur = await tx.get(ref);
          const was = cur.exists ? Number(cur.get("seconds") ?? Infinity) : Infinity;
          if (was <= s) return;
          tx.set(ref, {
            uid,
            name,
            sutraId: "banya",
            seconds: s,
            at: FieldValue.serverTimestamp(),
          });
        });
        seconds = s;
      }
    }

    return Response.json({ ok: true, day, merit, seconds });
  } catch {
    return Response.json({ error: "write-failed" }, { status: 500 });
  }
}

// ── 읽기 ────────────────────────────────────────────────────

type Raw = { uid: string; name: string; merit: number };

// 그날의 줄을 통째로 훑는다. 문서 이름이 날짜_uid 라서 이름 범위만으로
// 하루를 잘라낼 수 있고, 그러면 복합 색인을 따로 만들지 않아도 된다.
// 대신 공덕순 정렬은 여기서 한다 — 하루 참여가 만 단위로 늘면
// (day == , merit desc) 복합 색인을 만들어 질의로 옮겨야 한다.
// 같은 판을 여럿이 동시에 보는 일이 잦으니 잠깐 손에 들고 있는다.
const held = new Map<string, { at: number; rows: Raw[] }>();

function heldMs(day: string): number {
  // 지난 날의 판은 더 바뀌지 않는다 — 길게 들고 있어도 된다
  return day === dayKey() ? 45_000 : 600_000;
}

async function dayRows(db: Firestore, day: string): Promise<Raw[]> {
  const hit = held.get(day);
  if (hit && Date.now() - hit.at < heldMs(day)) return hit.rows;

  // 문서 이름은 "2026-09-13_abc..." — 그 앞머리로 하루를 통째로 집는다.
  // 뒤 끝을 U+F8FF 로 막는 것은 파이어스토어에서 쓰는 관용이다
  // (어떤 uid 글자보다도 뒤에 온다).
  const snap = await db
    .collection("rank-daily")
    .orderBy(FieldPath.documentId())
    .startAt(`${day}_`)
    .endAt(`${day}_\uf8ff`)
    .limit(SCAN_MAX)
    .get();

  const rows: Raw[] = [];
  for (const d of snap.docs) {
    const merit = Number(d.get("merit") ?? 0);
    const uid = String(d.get("uid") ?? "");
    if (!uid || !Number.isFinite(merit) || merit <= 0) continue;
    rows.push({ uid, name: String(d.get("name") ?? nameFor(uid)), merit });
  }
  // 같은 공덕이면 늘 같은 차례로 — 새로고침마다 자리가 바뀌면 이상하다
  rows.sort((a, b) => b.merit - a.merit || (a.uid < b.uid ? -1 : 1));

  if (held.size > 8) held.clear();
  held.set(day, { at: Date.now(), rows });
  return rows;
}

export async function GET(req: Request) {
  const app = adminApp();
  if (!app) return Response.json({ error: "server-not-ready" }, { status: 503 });

  const db = getFirestore(app);
  const params = new URL(req.url).searchParams;
  const me = await whoIs(req);

  try {
    // ── 외우기 판 ──
    if (params.get("board") === "sutra") {
      const snap = await db
        .collection("rank-sutra")
        .orderBy("seconds", "asc")
        .limit(TOP)
        .get();

      const all = snap.docs.map((d) => ({
        uid: String(d.get("uid") ?? d.id),
        name: String(d.get("name") ?? nameFor(d.id)),
        seconds: Number(d.get("seconds") ?? 0),
      }));

      const names = distinct(all);
      const rows = all.map((r, i) => ({
        rank: i + 1,
        name: names[i],
        seconds: r.seconds,
        me: r.uid === me,
      }));

      let mine: { rank: number; name: string; seconds: number } | null = null;
      if (me) {
        const doc = await db.doc(`rank-sutra/${me}`).get();
        const s = doc.exists ? Number(doc.get("seconds") ?? 0) : 0;
        if (s > 0) {
          // 나보다 빠른 사람이 몇인가 — 백 등 밖이어도 제 자리를 알 수 있게
          const faster = await db
            .collection("rank-sutra")
            .where("seconds", "<", s)
            .count()
            .get();
          mine = { rank: faster.data().count + 1, name: nameFor(me), seconds: s };
        }
      }

      const people = (await db.collection("rank-sutra").count().get()).data().count;
      return Response.json({ board: "sutra", people, rows, mine });
    }

    // ── 정진 판 — 어제가 기본이다. 오늘은 아직 안 끝났다 ──
    const day = safeDay(params.get("day")) ?? dayKey(1);
    const all = await dayRows(db, day);

    const top = all.slice(0, TOP);
    const names = distinct(top);
    const rows = top.map((r, i) => ({
      rank: i + 1,
      name: names[i],
      merit: r.merit,
      me: r.uid === me,
    }));

    let mine: { rank: number; name: string; merit: number } | null = null;
    if (me) {
      const at = all.findIndex((r) => r.uid === me);
      if (at >= 0) mine = { rank: at + 1, name: nameFor(me), merit: all[at].merit };
    }

    return Response.json({ day, people: all.length, rows, mine });
  } catch {
    return Response.json({ error: "read-failed" }, { status: 500 });
  }
}
