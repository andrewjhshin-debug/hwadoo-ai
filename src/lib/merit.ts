// ─────────────────────────────────────────────────────────────
// 공덕(功德) — 도량에서 하는 모든 일이 여기로 쌓인다.
//
// 왜 공덕인가 —
// 불교의 공덕은 혼자 쟁이는 재물이 아니다. 쌓아서 남에게 돌리는 것,
// 그게 회향(廻向)이고 그것이 대승(大乘)이다. 화두가 이미 "답을 쓰고
// 회향한다"는 말을 쓰고 있으니 결이 같다.
// 점수판이되 이기려고 모으는 점수판이 아니라, 나눠 주려고 모으는 판.
//
// 셈의 단위는 108 — 백팔번뇌의 수. 한 바퀴(108)가 곧 한 매듭이다.
// 장부는 이 브라우저에 적는다. 계정 동기화는 store 와 같은 결로 뒤에 잇는다.
// ─────────────────────────────────────────────────────────────

import { noteDaily } from "./daily";

export const MERIT_KEY = "hwadu.merit.v1";
export const MERIT_EVENT = "hwadu-merit-updated";

/** 한 바퀴 — 백팔번뇌의 수 */
export const ROUND = 108;

export type MeritSource =
  | "bow" // 절 한 배
  | "moktak" // 목탁 한 번
  | "bead" // 염주 한 알
  | "breath" // 호흡 명상 한 판
  | "hwadu" // 화두 회향
  | "temple" // 절에 다녀옴
  | "gathering" // 인연 — 글·댓글
  | "sutra" // 경전 외우기 — 한 마디(21)씩 곱해 쓴다
  | "daily"; // 오늘의 세 가지를 다 마침

/** 무엇을 하면 얼마나 쌓이는가 */
export const MERIT_VALUE: Record<MeritSource, number> = {
  bow: 3, // 백팔배를 마치면 324
  moktak: 1,
  bead: 1,
  breath: 21,
  hwadu: 108, // 화두 하나를 회향하면 한 바퀴
  temple: 54,
  gathering: 9,
  sutra: 21, // 경전 한 마디 — 삼귀의 1배, 사홍서원 2배, 반야심경 6배
  daily: 54, // 오늘의 세 가지 — 반 바퀴
};

export type MeritLedger = {
  total: number;
  /** 갈래별 누적 — 무엇으로 쌓았는지 되돌아볼 수 있게 */
  by: Partial<Record<MeritSource, number>>;
  /** 남에게 회향한 공덕 — 총합에서 빠지지 않는다. 준 만큼 따로 센다 */
  given: number;
};

const EMPTY: MeritLedger = { total: 0, by: {}, given: 0 };

export function loadMerit(): MeritLedger {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(MERIT_KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<MeritLedger>;
    return {
      total: typeof p.total === "number" && p.total > 0 ? Math.floor(p.total) : 0,
      by: p.by && typeof p.by === "object" ? p.by : {},
      given: typeof p.given === "number" && p.given > 0 ? Math.floor(p.given) : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(l: MeritLedger) {
  try {
    window.localStorage.setItem(MERIT_KEY, JSON.stringify(l));
    window.dispatchEvent(new CustomEvent(MERIT_EVENT));
  } catch {
    // 못 적어도 수행은 이어진다
  }
}

/**
 * 공덕을 쌓는다. 쌓기 전후로 한 바퀴(108)를 넘었으면 그 사실을 알려 준다 —
 * 화면이 축하를 띄울 수 있게.
 */
export function addMerit(
  source: MeritSource,
  times = 1
): { total: number; gained: number; crossed: boolean; round: number } {
  const gained = MERIT_VALUE[source] * times;
  const l = loadMerit();
  const before = l.total;
  l.total = before + gained;
  l.by[source] = (l.by[source] ?? 0) + gained;
  save(l);
  // 하루치도 같이 적는다 — 오늘의 세 가지가 이 셈을 읽는다.
  // 상 자체(daily)는 하루치에 넣지 않는다. 상이 상을 낳으면 안 된다.
  if (source !== "daily") noteDaily(source, times);
  return {
    total: l.total,
    gained,
    crossed: Math.floor(l.total / ROUND) > Math.floor(before / ROUND),
    round: Math.floor(l.total / ROUND),
  };
}

/** 남에게 돌린다 — 대승의 자리. 총합은 줄지 않고, 준 몫이 따로 쌓인다 */
export function giveMerit(n: number): MeritLedger {
  const l = loadMerit();
  l.given += Math.max(0, Math.floor(n));
  save(l);
  return l;
}

// ── 진화(進化) — 공덕이 쌓이면 두두가 자란다 ───────────────────
// 김부따는 옷을 갈아입지만 우리는 깨달아 간다. 화두 수행이 여덟 할인
// 서비스이니, 캐릭터도 옷이 아니라 자리가 바뀌어야 맞다.
// 마지막에 머리 위 물음표가 광배(光背)로 바뀐다 — 물음이 답이 되는 자리.

export const RANKS = [
  { need: 0, hanja: "童", name: "동자", say: "이제 막 산문에 들었어요" },
  { need: 108, hanja: "沙", name: "사미", say: "물음 하나를 품기 시작했어요" },
  { need: 540, hanja: "首", name: "수좌", say: "앉는 일이 몸에 붙었어요" },
  { need: 1080, hanja: "禪", name: "선사", say: "흔들림이 눈에 띄게 줄었어요" },
  { need: 3240, hanja: "薩", name: "보살", say: "이제 남의 몫까지 돕니다" },
  { need: 10800, hanja: "佛", name: "부처", say: "물음표가 광배가 되었어요" },
] as const;

export type Rank = (typeof RANKS)[number];

export function rankOf(total: number): Rank {
  let r: Rank = RANKS[0];
  for (const x of RANKS) if (total >= x.need) r = x;
  return r;
}

/** 지금 자리의 번호 — 0(동자) ~ 5(부처). 그림을 고를 때 쓴다 */
export function stageOf(total: number): number {
  let i = 0;
  RANKS.forEach((x, k) => {
    if (total >= x.need) i = k;
  });
  return i;
}

/** 다음 자리까지 얼마나 남았는가 — null 이면 끝자리 */
export function nextRank(total: number): { rank: Rank; left: number } | null {
  for (const x of RANKS) if (total < x.need) return { rank: x, left: x.need - total };
  return null;
}

/** 이 자리에서 다음 자리까지 얼마나 왔는가 (0~1) */
export function stageProgress(total: number): number {
  const here = rankOf(total);
  const next = nextRank(total);
  if (!next) return 1;
  const span = next.rank.need - here.need;
  return span > 0 ? (total - here.need) / span : 0;
}

/** 이번 바퀴에서 얼마나 왔는가 (0~107) */
export function inRound(total: number): number {
  return total % ROUND;
}

export const SOURCE_LABEL: Record<MeritSource, string> = {
  bow: "절",
  moktak: "목탁",
  bead: "염주",
  breath: "호흡 명상",
  hwadu: "화두 회향",
  temple: "절 다녀오기",
  gathering: "인연",
  sutra: "경전 외우기",
  daily: "오늘의 세 가지",
};
