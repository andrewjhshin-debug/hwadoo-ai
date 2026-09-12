// ─────────────────────────────────────────────────────────────
// 예불 종(鐘) — 하루 네 번, 정해진 시각의 알림.
// · 어떤 종을 받을지는 이 브라우저(localStorage)에 적고,
//   푸시 토큰 문서(push-tokens/{token}.bells)에도 함께 새긴다.
// · 실제 발송은 /api/push/bell — 깃허브 액션 크론이 시각마다 두드린다.
// ─────────────────────────────────────────────────────────────

export type Bell = {
  id: string; // "0400" — KST 시각 그대로
  label: string;
  time: string; // 화면 표시용
};

export const BELLS: Bell[] = [
  { id: "0400", label: "새벽 예불", time: "04:00" },
  { id: "0700", label: "모닝 삼귀의", time: "07:00" },
  { id: "1130", label: "발우공양", time: "11:30" },
  { id: "1800", label: "저녁 예불", time: "18:00" },
];

const BELLS_KEY = "hwadu.bells.v1";

// 이 브라우저가 고른 종들 — 서랍에서 꺼낸다
export function loadBellsLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BELLS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(BELLS.map((b) => b.id));
    return parsed.filter((v): v is string => typeof v === "string" && valid.has(v));
  } catch {
    return [];
  }
}

export function saveBellsLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BELLS_KEY, JSON.stringify(ids));
  } catch {
    /* 서랍이 없어도 토큰 문서에는 남는다 */
  }
}
