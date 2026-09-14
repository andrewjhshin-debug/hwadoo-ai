// ─────────────────────────────────────────────────────────────
// 삼배(三拜) — 세 번의 절.
//
// 백팔배는 마음먹어야 한다. 삼배는 서른 초면 된다.
// 매일 들어올 이유로는 이쪽이 훨씬 세다 — 문턱이 없어야 매일 한다.
//
// 세 번에 각각 뜻이 있다(삼귀의) —
//   첫 배 부처님께 · 둘째 배 가르침에 · 셋째 배 스님들께.
// 절할 때마다 광배가 한 겹씩 밝아지고, 셋을 채우면 금빛이 퍼진다.
// ─────────────────────────────────────────────────────────────

import { visitDayKey } from "@/components/VisitLedger";

export const SAMBAE_KEY = "hwadu.sambae.v1";
export const SAMBAE_EVENT = "hwadu-sambae-updated";

/** 한 판은 세 배 */
export const BOWS = 3;

/** 배마다 무엇에 절하는가 — 삼귀의 그대로 */
export const TO: { hanja: string; name: string; say: string }[] = [
  { hanja: "佛", name: "부처님께", say: "거룩한 부처님께 귀의합니다" },
  { hanja: "法", name: "가르침에", say: "거룩한 가르침에 귀의합니다" },
  { hanja: "僧", name: "스님들께", say: "거룩한 스님들께 귀의합니다" },
];

type Book = {
  /** 마지막으로 삼배를 마친 날 */
  day: string;
  /** 그날 몇 판 */
  rounds: number;
  /** 모두 합쳐 몇 판 */
  total: number;
};

const EMPTY: Book = { day: "", rounds: 0, total: 0 };

export function loadSambae(): Book {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(SAMBAE_KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<Book>;
    const today = visitDayKey();
    return {
      day: typeof p.day === "string" ? p.day : "",
      // 날이 바뀌면 오늘 몫은 0 부터
      rounds: p.day === today && typeof p.rounds === "number" ? p.rounds : 0,
      total: typeof p.total === "number" && p.total > 0 ? Math.floor(p.total) : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

/** 한 판을 마쳤다 — 오늘 몇 판째인지 돌려준다 */
export function finishSambae(): number {
  if (typeof window === "undefined") return 0;
  const b = loadSambae();
  const next: Book = {
    day: visitDayKey(),
    rounds: b.rounds + 1,
    total: b.total + 1,
  };
  try {
    window.localStorage.setItem(SAMBAE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SAMBAE_EVENT));
  } catch {
    // 못 적어도 절은 이미 했다
  }
  return next.rounds;
}

/** 오늘 벌써 했는가 */
export function doneToday(b: Book = loadSambae()): boolean {
  return b.day === visitDayKey() && b.rounds > 0;
}
