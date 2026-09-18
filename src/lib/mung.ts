"use client";

// ────────────────────────────────────────────────────────────────
// 멍(㝱) — 아무것도 하지 않는 일.
//
// 이 앱의 방들은 다 할 일이 있다. 목탁은 치고, 절은 하고, 호흡은 숨을
// 센다. 멍만은 **할 일이 없다.** 그게 이 방의 전부이고, 그래서 제일 어렵다.
//
// ■ 규칙은 셋뿐이다
//   · 화면을 건드리면 끝난다
//   · 앱을 나가거나 화면을 끄면 끝난다
//   · 그동안 숫자는 안 보여 준다 — 숫자를 보면 그건 멍이 아니라 기다림이다
//
// ■ 왜 숫자를 감추나
//   한강 멍때리기 대회는 심박을 잰다. 우리는 못 재니 대신 **정직한 규칙**을
//   둔다. 초를 세어 보여 주면 사람은 그 수를 쳐다본다. 쳐다보는 동안은
//   멍이 아니다. 그래서 끝난 뒤에만 알려 준다.
//
// ■ 공덕
//   분당 마흔둘 — 이 앱에서 제일 박하다(절 105/분 · 호흡 126/분).
//   가만히 있는 것으로 많이 쌓게 하면 폰을 켜 두고 딴짓하는 사람이 이긴다.
//   하루 천장 630(십오 분). 더 앉아도 되지만 공덕은 거기까지다.
//
// 장부는 이 기기에만 둔다. 서버로 올릴 것이 없다 — 남에게 보일 기록이
// 아니라 제가 얼마나 못 견디는지 보는 자리다.
// ────────────────────────────────────────────────────────────────

import { addMerit } from "./merit";
import { visitDayKey } from "@/components/VisitLedger";

const MUNG_KEY = "hwadu.mung.v1";
export const MUNG_EVENT = "hwadu-mung-updated";

/** 이만큼도 못 앉았으면 셈에 안 넣는다 — 잘못 누른 것과 가른다 */
export const MUNG_MIN_SEC = 20;

export type MungBook = {
  /** 가장 오래 앉은 기록(초) */
  best: number;
  /** 오늘 얼마나(초) */
  todaySec: number;
  /** 오늘이 언제인가 */
  day: string;
  /** 지금까지 몇 번 앉았나 */
  times: number;
};

const EMPTY: MungBook = { best: 0, todaySec: 0, day: "", times: 0 };

export function loadMung(): MungBook {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(MUNG_KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<MungBook>;
    const today = visitDayKey();
    const same = p.day === today;
    return {
      best: typeof p.best === "number" && p.best > 0 ? Math.floor(p.best) : 0,
      // 날이 바뀌면 오늘치는 0 부터 — 기록(best)은 남는다
      todaySec: same && typeof p.todaySec === "number" ? Math.floor(p.todaySec) : 0,
      day: today,
      times: typeof p.times === "number" && p.times > 0 ? Math.floor(p.times) : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(b: MungBook) {
  try {
    window.localStorage.setItem(MUNG_KEY, JSON.stringify(b));
    window.dispatchEvent(new CustomEvent(MUNG_EVENT));
  } catch {
    // 못 적어도 앉은 것은 앉은 것이다
  }
}

/**
 * 한 판을 마쳤다.
 * @returns 이번에 실제로 붙은 공덕과, 제 기록을 넘겼는지
 */
export function endMung(sec: number): { gained: number; record: boolean } {
  const n = Math.floor(sec);
  if (n < MUNG_MIN_SEC) return { gained: 0, record: false };
  const b = loadMung();
  const record = n > b.best;
  save({
    best: Math.max(b.best, n),
    todaySec: b.todaySec + n,
    day: visitDayKey(),
    times: b.times + 1,
  });
  // 공덕은 분 단위로 — 한 판을 한 번으로 센다(hits 1).
  // 삼십 초를 앉았으면 반 분이니 반 몫. 이십 초 밑은 위에서 걸렀다.
  const minutes = n / 60;
  const { gained } = addMerit("mung", minutes, 1);
  return { gained, record };
}

/** 초를 사람 말로 — 「3분 12초」 */
export function sayDuration(sec: number): string {
  const n = Math.max(0, Math.floor(sec));
  const m = Math.floor(n / 60);
  const s = n % 60;
  if (m <= 0) return `${s}초`;
  if (s === 0) return `${m}분`;
  return `${m}분 ${s}초`;
}
