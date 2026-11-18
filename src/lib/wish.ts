// ─────────────────────────────────────────────────────────────
// 소원 — 소원 하나를 적고 스무하루를 채운다.
//
// 형(2026-11-18): 「소원성취랄까 뭔가 미션 주고」
// 날마다 미션 셋이 나오고, 셋을 다 하면 그날 동그라미 하나가 찬다.
// 미션은 **이미 하는 수행**을 센다(오늘 장부 daily.by) — 새 공덕 갈래를
// 만들지 않는다. 공덕은 수행할 때 이미 붙었으니 여기서 또 주지 않는다.
// 스무하루를 다 채우면 「회향」.
//
// 서랍은 hwadu.wish.v1 — kvSync 가 알아서 계정에 올린다.
// ─────────────────────────────────────────────────────────────

import { loadDaily, type DailyKey } from "./daily";
import { visitDayKey } from "@/components/VisitLedger";

export const WISH_KEY = "hwadu.wish.v1";
export const WISH_DAYS = 21;
export const WISH_TEXT_MAX = 60;

export type Wish = {
  text: string;
  /** 시작한 날 YYYY-MM-DD */
  start: string;
  /** 미션 셋을 다 한 날들 */
  done: string[];
  /** 회향한 날 — 있으면 끝난 소원 */
  closed?: string;
};

export type WishMission = { id: string; key: DailyKey; need: number; label: string; href: string };

// 소원을 마음에 두고 하는 것들 — 오 분 안팎
const POOL: WishMission[] = [
  { id: "bow21", key: "bow", need: 21, label: "스물한 배", href: "/bae" },
  { id: "mani21", key: "mani", need: 21, label: "마니차 스물한 바퀴", href: "/moktak?lane=mani" },
  { id: "moktak54", key: "moktak", need: 54, label: "목탁 쉰네 번", href: "/moktak" },
  { id: "bead108", key: "bead", need: 108, label: "염주 백여덟 알", href: "/moktak" },
  { id: "breath", key: "breath", need: 1, label: "호흡 한 판", href: "/breath" },
  { id: "sutra", key: "sutra", need: 1, label: "경전 한 편 외우기", href: "/sutra" },
  { id: "bowl", key: "bowl", need: 3, label: "싱잉볼 세 번", href: "/moktak" },
];

function seed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 그날의 미션 셋 — 같은 소원·같은 날이면 늘 같은 셋 */
export function wishMissions(w: Wish, day = visitDayKey()): WishMission[] {
  let s = seed(w.start + day);
  const rest = [...POOL];
  const out: WishMission[] = [];
  while (out.length < 3 && rest.length) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    out.push(rest.splice(s % rest.length, 1)[0]);
  }
  return out;
}

export function missionDone(m: WishMission, day = visitDayKey()): boolean {
  const b = loadDaily();
  return b.day === day && (b.by[m.key] ?? 0) >= m.need;
}

export function loadWish(): Wish | null {
  try {
    const w = JSON.parse(localStorage.getItem(WISH_KEY) || "null");
    return w && typeof w.text === "string" && Array.isArray(w.done) ? w : null;
  } catch {
    return null;
  }
}

function save(w: Wish | null) {
  try {
    if (w) localStorage.setItem(WISH_KEY, JSON.stringify(w));
    else localStorage.removeItem(WISH_KEY);
    window.dispatchEvent(new Event(WISH_EVENT));
  } catch {
    /* 서랍이 막혀도 소원은 마음에 있다 */
  }
}
export const WISH_EVENT = "hwadu-wish";

export function startWish(text: string): Wish {
  const w: Wish = { text: text.trim().slice(0, WISH_TEXT_MAX), start: visitDayKey(), done: [] };
  save(w);
  return w;
}

/** 오늘 미션 셋을 다 했으면 오늘을 찍는다. 찍혔으면 true */
export function markToday(w: Wish): Wish {
  const day = visitDayKey();
  if (w.closed || w.done.includes(day)) return w;
  if (!wishMissions(w, day).every((m) => missionDone(m, day))) return w;
  const next = { ...w, done: [...w.done, day] };
  if (next.done.length >= WISH_DAYS) next.closed = day;
  save(next);
  return next;
}

export function dropWish() {
  save(null);
}

/** 며칠째인가(시작한 날 = 1일째) */
export function dayIndex(w: Wish, day = visitDayKey()): number {
  return Math.floor((Date.parse(day) - Date.parse(w.start)) / 86_400_000) + 1;
}

/** 끊기지 않고 이어 온 날 */
export function streak(w: Wish, day = visitDayKey()): number {
  const set = new Set(w.done);
  let n = 0;
  for (let t = Date.parse(day); ; t -= 86_400_000) {
    const k = new Date(t).toISOString().slice(0, 10);
    if (set.has(k)) n++;
    else if (k !== day) break;
    if (n > WISH_DAYS) break;
  }
  return n;
}
