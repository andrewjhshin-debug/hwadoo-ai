// ─────────────────────────────────────────────────────────────
// 걸음 — 얻은 자리(뱃지). 육도(六道)에서 빌린 이름, 회향 수로 오른다.
// 내 도량의 뱃지 격자와 사이드바의 한 글자 뱃지가 같은 임계값을 쓴다.
// 뒷방 주인은 늘 천상도 — 도량 주인의 자리.
// ─────────────────────────────────────────────────────────────

import { ADMIN_UID } from "./config";

export const BADGES = [
  { hanja: "人", name: "인간도", full: "人間道", need: 1, cond: "첫 회향" },
  { hanja: "修", name: "수라도", full: "修羅道", need: 5, cond: "회향 5 이상" },
  { hanja: "天", name: "천상도", full: "天上道", need: 15, cond: "회향 15 이상" },
] as const;

// 걸음 뱃지 — 회향 수로 오른 자리 중 최고 한 글자. 회향이 없으면 null.
export function rankHanja(returned: number): string | null {
  for (let i = BADGES.length - 1; i >= 0; i--) {
    if (returned >= BADGES[i].need) return BADGES[i].hanja;
  }
  return null;
}

// 계정을 함께 살피는 판 — 뒷방 주인이면 회향 수와 무관하게 천상도.
export function rankHanjaFor(
  returned: number,
  uid?: string | null
): string | null {
  if (uid === ADMIN_UID) return "天";
  return rankHanja(returned);
}
