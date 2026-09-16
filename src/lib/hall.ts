// ─────────────────────────────────────────────────────────────
// 함께 켜는 초 — 브라우저 쪽.
//
// 읽기는 그냥 읽는다(hall 문서는 누구나 본다). 쓰기는 /api/merit/give 로만.
// 여섯 자리를 낱개로 읽으면 왕복이 여섯 번이라, 컬렉션을 통째로 한 번 읽는다.
//
// 「오늘 어느 자리에 다녀왔나」는 서버가 참이다(giving/{uid}_{날짜}).
// 규칙이 **제 문서만** 읽게 열어 두었으므로 브라우저가 직접 본다 —
// localStorage 로 재면 기기를 바꿨을 때 여섯 자리가 다시 다 열린다.
// ─────────────────────────────────────────────────────────────

import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { EMPTY_SEAT, SEATS, kstDay, type SeatCount, type SeatId } from "./hallSpec";

export * from "./hallSpec";

export type HallCounts = Record<string, SeatCount>;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** 여섯 자리의 셈. 못 읽으면 빈 셈을 돌려준다 — 법당이 안 열리는 것보단 낫다. */
export async function fetchHall(): Promise<HallCounts> {
  const out: HallCounts = {};
  for (const s of SEATS) out[s.id] = { ...EMPTY_SEAT };
  try {
    const snap = await getDocs(collection(db, "hall"));
    for (const d of snap.docs) {
      if (!(d.id in out)) continue; // 모르는 자리는 안 쓴다
      const v = d.data();
      out[d.id] = {
        merit: num(v.merit),
        givers: num(v.givers),
        day: typeof v.day === "string" ? v.day : "",
        todayMerit: num(v.todayMerit),
        todayGivers: num(v.todayGivers),
      };
    }
  } catch {
    /* 못 읽으면 다 0 으로 보인다 */
  }
  return out;
}

/** 오늘 내가 다녀온 자리들 */
export async function fetchDone(): Promise<string[]> {
  const u = auth.currentUser;
  if (!u) return [];
  try {
    const snap = await getDoc(doc(db, "giving", `${u.uid}_${kstDay()}`));
    const raw = snap.data()?.done as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return [];
    const m = raw as Record<string, unknown>;
    return Object.keys(m).filter((k) => m[k] === true);
  } catch {
    return [];
  }
}

export type PourResult =
  | { ok: true; again: boolean; done: string[]; seat: SeatCount }
  | { ok: false; why: "no-login" | "already-today" | "failed"; done: string[] };

/**
 * 한 자리에 손을 모은다 — 값은 안 든다.
 *
 * 표(key)는 여기서 뽑는다 — 같은 표로 두 번 보내면 서버가 한 번만 센다.
 * 그리기(render) 중이 아니라 누른 뒤에 뽑으므로 난수를 써도 된다.
 * 날짜는 **안 보낸다** — 기기 시계로 하루 한 번을 우회할 길을 아예 없앤다.
 */
export async function pour(seat: SeatId): Promise<PourResult> {
  const u = auth.currentUser;
  if (!u) return { ok: false, why: "no-login", done: [] };
  const key = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
  try {
    const res = await fetch("/api/merit/give", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await u.getIdToken()}`,
      },
      body: JSON.stringify({ seat, key }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      again?: boolean;
      done?: string[];
      seat?: SeatCount;
    };
    const done = Array.isArray(j.done) ? j.done : [];
    if (res.status === 409) return { ok: false, why: "already-today", done };
    if (!res.ok || !j.seat) return { ok: false, why: "failed", done };
    return { ok: true, again: j.again === true, done, seat: j.seat };
  } catch {
    return { ok: false, why: "failed", done: [] };
  }
}
