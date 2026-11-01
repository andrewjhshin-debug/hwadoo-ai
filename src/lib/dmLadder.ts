// 쪽지 값 — 화면과 서버가 같은 표를 본다.
// 형: 「쪽지 연꽃 1개는 너무 싸다. 번호는 맨 마지막에 꽁 숨겨 놓고 그 전까지」
export const DM_REQUEST = 3; // 쪽지 청하기
export const DM_SINCERE = 5; // 진심 쪽지 — 받는 쪽 맨 위, 금테
export const DM_FREE_MSGS = 10; // 한 방에서 둘이 합쳐 이만큼은 그냥 오간다
export const DM_PASSES = {
  day: { n: 2, days: 1, both: false, label: "하루" },
  week: { n: 8, days: 7, both: false, label: "7일" },
  both: { n: 14, days: 7, both: true, label: "둘 다 내가 · 7일" },
  reopen: { n: 3, days: 7, both: false, label: "다시 열기 · 7일" },
} as const;
export type DmPass = keyof typeof DM_PASSES;
export const DM_CONTACT = 5; // 연락처 열기 — 각자
export const DM_CONTACT_BOTH = 9; // 둘 다 내가

/** 이 방에서 지금 쪽지를 보낼 수 있나 */
export function 보낼수있나(t: { msgCount?: number; passUntil?: Record<string, number> }, uid: string, now = Date.now()) {
  return (t.msgCount ?? 0) < DM_FREE_MSGS || (t.passUntil?.[uid] ?? 0) > now;
}

/** 이용권이 있었다가 끝났나 — 「다시 열기」는 이때만 */
export function 끝난이용권(t: { passUntil?: Record<string, number> }, uid: string, now = Date.now()) {
  const u = t.passUntil?.[uid] ?? 0;
  return u > 0 && u <= now;
}
