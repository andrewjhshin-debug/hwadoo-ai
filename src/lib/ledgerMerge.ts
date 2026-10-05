// ─────────────────────────────────────────────────────────────
// 장부 합치기 — 두 기기의 공덕을 한 몸으로.
//
// 값만 다루고 **아무것도 import 하지 않는다**(타입만 빌린다). 그래서
// 브라우저도 서랍도 없이 따로 돌려 볼 수 있다 — ledgerMerge.check.mjs.
// 이 셈이 틀리면 사람의 공덕이 사라진다. 틀렸는지 알 길은 있어야 한다.
// ─────────────────────────────────────────────────────────────

import type { MeritLedger, MeritSource } from "./merit";
import type { DailyBook, DailyKey } from "./daily";

/** 칸마다 큰 쪽을 남긴다 */
function 큰칸<K extends string>(
  x: Partial<Record<K, number>> = {},
  y: Partial<Record<K, number>> = {}
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = { ...x };
  for (const [k, v] of Object.entries(y) as [K, number][]) {
    if (typeof v !== "number") continue;
    // `>=` 를 뒤집어 쓴다 — out[k] 가 undefined 면 비교가 false 라 그대로 들어간다
    if (!(out[k]! >= v)) out[k] = v;
  }
  return out;
}

/**
 * 두 장부를 합친다 — **큰 쪽을 남긴다.**
 *
 * 공덕은 줄지 않는 수다(퇴전은 faded 로 따로 센다). 그러니 칸마다 큰 값을
 * 고르면 어느 기기에서 쌓은 것도 안 잃는다. 폰에서 백팔배, 노트북에서
 * 목탁을 쳤으면 둘 다 남는다.
 * day·lastFade 처럼 **마지막 일**을 적는 칸은 최근 것을 따른다.
 */
export function mergeMerit(a: MeritLedger, b: MeritLedger | null): MeritLedger {
  if (!b) return a;
  const 늦은날 = (a.day ?? "") >= (b.day ?? "") ? a : b;
  const by = 큰칸<MeritSource>(a.by, b.by);
  // 머리의 총합이 갈래별 합보다 작으면 화면이 저 스스로를 반박한다
  const 갈래합 = Object.values(by).reduce<number>((t, v) => t + (v ?? 0), 0);
  return {
    total: Math.max(a.total, b.total, 갈래합),
    by,
    hits: 큰칸<MeritSource>(a.hits, b.hits),
    // 횟수를 세기 시작한 날은 **이른 쪽**이 맞다 — 늦은 쪽을 따르면
    // 그 전에 쌓은 by 가 횟수 없이 남아 「1번 · 12,000」이 된다
    hitsFrom:
      a.hitsFrom && b.hitsFrom
        ? a.hitsFrom < b.hitsFrom
          ? a.hitsFrom
          : b.hitsFrom
        : a.hitsFrom || b.hitsFrom,
    given: Math.max(a.given, b.given),
    spent: Math.max(a.spent ?? 0, b.spent ?? 0),
    faded: Math.max(a.faded ?? 0, b.faded ?? 0),
    day: 늦은날.day,
    lastFade: 늦은날.lastFade,
    lastGap: 늦은날.lastGap,
  };
}

/**
 * 두 하루 장부를 합친다 — **같은 날일 때만.**
 * 날이 다르면 오늘 것만 남긴다(어제 장부를 되살리면 천장이 풀린다).
 * 같은 날이면 칸마다 큰 쪽 — 폰에서 친 목탁과 노트북에서 한 절이 더해진다.
 * 천장은 earnedToday 가 다시 걸므로 합쳐도 하루 몫을 넘지 않는다.
 */
export function mergeDaily(a: DailyBook, b: DailyBook | null): DailyBook {
  if (!b) return a;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  return {
    day: a.day,
    by: 큰칸<DailyKey>(a.by, b.by),
    got: 큰칸<DailyKey>(a.got, b.got),
    claimed: a.claimed || b.claimed,
  };
}
