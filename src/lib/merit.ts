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
  | "gathering"; // 인연 — 글·댓글

/** 무엇을 하면 얼마나 쌓이는가 */
export const MERIT_VALUE: Record<MeritSource, number> = {
  bow: 3, // 백팔배를 마치면 324
  moktak: 1,
  bead: 1,
  breath: 21,
  hwadu: 108, // 화두 하나를 회향하면 한 바퀴
  temple: 54,
  gathering: 9,
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

// ── 자리(位) — 공덕이 쌓이며 오르는 이름 ───────────────────────
// 보살의 계위에서 빌렸다. 마지막은 보살 — 남을 위해 도는 자리다.

export const RANKS = [
  { need: 0, hanja: "初", name: "첫 걸음", say: "이제 막 나섰습니다" },
  { need: 108, hanja: "發", name: "발심", say: "마음을 냈습니다" },
  { need: 540, hanja: "精", name: "정진", say: "쉬지 않고 갑니다" },
  { need: 1080, hanja: "定", name: "선정", say: "흔들림이 줄었습니다" },
  { need: 3240, hanja: "慧", name: "지혜", say: "보이는 것이 달라집니다" },
  { need: 10800, hanja: "薩", name: "보살", say: "이제 남의 몫까지 돕니다" },
] as const;

export type Rank = (typeof RANKS)[number];

export function rankOf(total: number): Rank {
  let r: Rank = RANKS[0];
  for (const x of RANKS) if (total >= x.need) r = x;
  return r;
}

/** 다음 자리까지 얼마나 남았는가 — null 이면 끝자리 */
export function nextRank(total: number): { rank: Rank; left: number } | null {
  for (const x of RANKS) if (total < x.need) return { rank: x, left: x.need - total };
  return null;
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
};
