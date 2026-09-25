// 인연 — 서버끼리 나눠 쓰는 값과 셈.
//
// Next 의 route.ts 는 **핸들러 말고는 못 내보낸다.** 상수나 헬퍼를 거기
// 두면 빌드가 타입에서 막힌다. 나눠 쓸 것은 여기로 뺀다.

/** 그냥 볼 수 있는 수. 더 보려면 연꽃 한 송이에 한 사람 */
export const FREE_PICKS = 1;
/** 연꽃을 써도 하루 이만큼까지. 무한 스와이프는 하지 않는다 */
export const MAX_PICKS = 3;
/** 한 번 뽑힌 사람은 이만큼 지나야 다시 온다 */
export const COOLDOWN_DAYS = 90;
/** 인연이 닿으면 양쪽에 붙는 공덕 — 만남도 수행이다 */
export const MERIT_ON_MATCH = 30;
/** 아무 말 없이 이만큼 지나면 방이 조용히 닫힌다 */
export const QUIET_HOURS = 72;

/** 오늘 — 한국 시각으로 가른다 */
export function today(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 둘을 늘 같은 순서로 — 방 이름이 하나여야 한다 */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}
