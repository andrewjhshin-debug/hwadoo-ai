// ─────────────────────────────────────────────────────────────
// 오늘 하루 — 연속 출석(精進)과 오늘의 세 가지.
//
// 매일 들어올 이유를 만드는 자리다. 다만 우리 식으로 만든다 —
// 놓치면 벌을 주는 판이 아니라, 이어 온 날을 세어 주는 판.
// 끊겨도 총 공덕은 그대로다(회향이 줄지 않는 것과 같은 이치).
//
// 셈은 addMerit 한 곳에서 흘러든다. 목탁을 치든 절을 하든
// 이미 전부 addMerit 을 거치므로, 여기에 손을 대면 하루치가 저절로 쌓인다.
// ─────────────────────────────────────────────────────────────

import type { MeritSource } from "./merit";
import { loadVisits, visitDayKey } from "@/components/VisitLedger";
import { streakShield } from "./charmPower";

export const DAILY_KEY = "hwadu.daily.v1";
export const DAILY_EVENT = "hwadu-daily-updated";

/** 하루치로 세는 것 — 공덕의 갈래에 '도량에 들름'을 하나 더한다 */
export type DailyKey = MeritSource | "visit";

export type DailyBook = {
  day: string; // "YYYY-MM-DD"
  by: Partial<Record<DailyKey, number>>;
  claimed: boolean; // 세 가지를 다 마치고 공덕을 받았는가
};

const EMPTY = (day: string): DailyBook => ({ day, by: {}, claimed: false });

// ── 오늘의 세 가지 ──────────────────────────────────────────

export type Mission = {
  id: string;
  key: DailyKey;
  need: number;
  label: string;
  href: string;
};

// 고르는 통 — 무겁지 않게, 오 분 안에 끝나는 것들만 둔다
const POOL: Mission[] = [
  { id: "bow21", key: "bow", need: 21, label: "스물한 배", href: "/bae" },
  { id: "bow54", key: "bow", need: 54, label: "쉰네 배", href: "/bae" },
  { id: "moktak", key: "moktak", need: 54, label: "목탁 쉰네 번", href: "/moktak" },
  { id: "bead", key: "bead", need: 108, label: "염주 백여덟 알", href: "/moktak" },
  { id: "breath", key: "breath", need: 1, label: "호흡 한 판", href: "/breath" },
  { id: "hwadu", key: "hwadu", need: 1, label: "화두 하나 회향", href: "/" },
  { id: "gathering", key: "gathering", need: 1, label: "인연에 한 줄", href: "/community" },
  { id: "sutra", key: "sutra", need: 1, label: "경전 한 편 외우기", href: "/sutra" },
];

// 언제나 첫 자리에 놓는 것 — 들르기만 해도 하나는 켜진다
const VISIT: Mission = {
  id: "visit",
  key: "visit",
  need: 1,
  label: "도량에 들르기",
  href: "/settings",
};

/** 다 마치면 받는 공덕 — 반 바퀴 */
export const DAILY_REWARD = 54;

// 날짜를 숫자 하나로 — 같은 날이면 늘 같은 세 가지가 나오게
function seedOf(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 그날의 세 가지 — 들르기 하나 + 통에서 둘 */
export function missionsOf(day: string = visitDayKey()): Mission[] {
  let s = seedOf(day);
  const rest = [...POOL];
  const out: Mission[] = [VISIT];
  for (let n = 0; n < 2 && rest.length; n++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const [m] = rest.splice(s % rest.length, 1);
    // 같은 갈래를 두 번 내지 않는다 (절 두 개가 겹치면 시시하다)
    for (let i = rest.length - 1; i >= 0; i--) if (rest[i].key === m.key) rest.splice(i, 1);
    out.push(m);
  }
  return out;
}

// ── 장부 ────────────────────────────────────────────────────

export function loadDaily(): DailyBook {
  const today = visitDayKey();
  if (typeof window === "undefined") return EMPTY(today);
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return EMPTY(today);
    const p = JSON.parse(raw) as Partial<DailyBook>;
    // 날이 바뀌면 하루치는 비운다 — 연속 출석은 발자국 장부가 따로 센다
    if (p.day !== today) return EMPTY(today);
    return {
      day: today,
      by: p.by && typeof p.by === "object" ? p.by : {},
      claimed: p.claimed === true,
    };
  } catch {
    return EMPTY(today);
  }
}

function save(b: DailyBook) {
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify(b));
    window.dispatchEvent(new CustomEvent(DAILY_EVENT));
  } catch {
    // 못 적어도 수행은 이어진다
  }
}

/** 하루치에 한 획 — addMerit 이 부른다. 여기 말고 따로 부를 일은 없다 */
export function noteDaily(key: DailyKey, times = 1) {
  if (typeof window === "undefined") return;
  const b = loadDaily();
  b.by[key] = (b.by[key] ?? 0) + times;
  save(b);
}

/** 오늘 얼마나 했나 — 들르기는 이 화면을 보고 있다는 것으로 갈음한다 */
export function doneOf(m: Mission, b: DailyBook = loadDaily()): number {
  if (m.key === "visit") return 1;
  return Math.min(b.by[m.key] ?? 0, m.need);
}

export function allDone(b: DailyBook = loadDaily()): boolean {
  return missionsOf(b.day).every((m) => doneOf(m, b) >= m.need);
}

/**
 * 세 가지를 다 마쳤으면 공덕을 받아 간다.
 * 이미 받았거나 아직이면 0 — 화면이 두 번 주지 않게.
 */
export function claimDaily(): number {
  const b = loadDaily();
  if (b.claimed || !allDone(b)) return 0;
  b.claimed = true;
  save(b);
  return DAILY_REWARD;
}

// ── 연속 출석(精進) ─────────────────────────────────────────

function dayBefore(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() - 1);
  return visitDayKey(t.getTime());
}

/**
 * 며칠째 이어 왔는가. 오늘 들렀으면 오늘부터, 아직이면 어제부터 센다
 * (아직 안 들른 날 때문에 어제까지의 걸음이 0으로 보이면 야박하다).
 */
export function streakOf(visits: string[] = loadVisits()): number {
  const set = new Set(visits);
  const today = visitDayKey();
  let cur = set.has(today) ? today : dayBefore(today);
  if (!set.has(cur)) return 0;
  let n = 0;
  let shield = streakShield(); // 정진부 상품 — 한 번은 건너뛴다
  while (true) {
    if (set.has(cur)) {
      n++;
      cur = dayBefore(cur);
      continue;
    }
    // 하루 비었다 — 부적이 있으면 한 칸만 건너뛰고 이어 센다
    if (!shield) break;
    const skipped = dayBefore(cur);
    if (!set.has(skipped)) break;
    shield = false;
    cur = skipped;
  }
  return n;
}

/** 이어 온 날에 건네는 한 마디 */
export function streakSay(n: number): string {
  if (n <= 0) return "오늘 첫 걸음이에요";
  if (n === 1) return "첫 날이에요";
  if (n < 3) return "이틀째, 시작이 반이에요";
  if (n < 7) return "사흘을 넘겼어요";
  if (n < 21) return "이레를 넘겼어요 — 몸에 붙는 중";
  if (n < 49) return "삼칠일을 넘겼어요";
  if (n < 108) return "칠칠일을 넘겼어요";
  return "백일을 넘겼어요 — 이건 수행입니다";
}

/** 다음 매듭까지 며칠 — null 이면 백일을 이미 넘었다 */
export function nextKnot(n: number): { at: number; left: number } | null {
  for (const at of [3, 7, 21, 49, 108]) if (n < at) return { at, left: at - n };
  return null;
}
