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

import { loadDaily, noteDaily } from "./daily";
import { visitDayKey } from "@/components/VisitLedger";
import { meritMultiplier } from "./charmPower";

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
  // 경전은 빡세다 — 반야심경을 끝까지 치려면 몇 분은 걸린다.
  // 목탁 한 번과 같은 저울에 올리면 아무도 안 외운다.
  sutra: 54, // 경전 한 마디 — 삼귀의 1배, 사홍서원 2배, 반야심경 6배
  daily: 54, // 오늘의 세 가지 — 반 바퀴
};

// ── 하루에 쌓을 수 있는 몫 ──────────────────────────────────
// 목탁만 천 번 두드려 연꽃을 따 가는 판이 되면 안 된다. 그건 수행이
// 아니라 노동이고, 우리가 파는 재화(연꽃)도 같이 죽는다.
// 그래서 갈래마다 하루 천장을 두고, 하루 전체에도 천장을 둔다.
// 천장에 닿아도 소리는 나고 셈은 오른다 — 공덕만 더 붙지 않는다.
// 여러 가지를 고루 해야 하루치가 찬다. 그게 '오늘의 세 가지'의 결이다.

/** 갈래마다 하루에 쌓을 수 있는 공덕 */
export const DAILY_CAP: Record<MeritSource, number> = {
  bow: 324, // 백팔배 한 번이면 찬다
  moktak: 108, // 목탁 백여덟 번
  bead: 108, // 염주 한 바퀴
  breath: 63, // 호흡 세 판
  hwadu: 216, // 화두는 하루 둘까지
  temple: 108, // 절은 하루 두 곳까지
  gathering: 27, // 인연 글·댓글 셋
  sutra: 324, // 경전 여섯 마디 — 반야심경 한 번이면 참다
  daily: 54, // 오늘의 세 가지 — 하루 한 번뿐
};

/** 하루 전체 천장 — 갈래 천장을 다 더한 것보다 낮게 잡는다 */
export const DAILY_TOTAL_CAP = 540;

/** 오늘 이 갈래로 얼마나 쌓았는지 (하루 장부의 횟수 × 갈래값) */
function earnedToday(): { by: Partial<Record<MeritSource, number>>; sum: number } {
  const book = loadDaily();
  const by: Partial<Record<MeritSource, number>> = {};
  let sum = 0;
  for (const [k, times] of Object.entries(book.by)) {
    if (k === "visit") continue;
    const per = MERIT_VALUE[k as MeritSource];
    if (!per || !times) continue;
    const v = Math.min(DAILY_CAP[k as MeritSource] ?? 0, per * times);
    by[k as MeritSource] = v;
    sum += v;
  }
  return { by, sum };
}

/** 지금 이 갈래로 더 쌓을 수 있는 공덕 */
export function roomToday(source: MeritSource): number {
  const { by, sum } = earnedToday();
  const perLeft = (DAILY_CAP[source] ?? 0) - (by[source] ?? 0);
  const allLeft = DAILY_TOTAL_CAP - sum;
  return Math.max(0, Math.min(perLeft, allLeft));
}

/** 오늘 쌓은 공덕과 남은 여지 — 화면이 '오늘 몫이 찼어요'를 말할 수 있게 */
export function todayRoom(): { earned: number; cap: number; left: number } {
  const { sum } = earnedToday();
  return { earned: sum, cap: DAILY_TOTAL_CAP, left: Math.max(0, DAILY_TOTAL_CAP - sum) };
}

// ── 퇴전(退轉) — 닦지 않으면 흐려진다 ───────────────────────
// 하루는 봐준다. 이틀째부터 깎이고, 비운 날이 길수록 더 크게 깎인다.
// 천상도(10,800)에 앉았어도 두 주쯤 손을 놓으면 지옥도로 돌아온다.
//   2일 4% · 3일 8% · 4일 12% … 7일 이상 25% (하루당)
// 최소 한 줌(54)은 늘 깎아, 적게 쌓은 사람도 멈춰 있지 않게 한다.

/** 비운 날수에 따른 하루 감쇠율 */
function decayRate(missed: number): number {
  return Math.min(0.25, 0.04 * (missed - 1));
}

/** 하루 최소 감쇠 — 반 바퀴의 반 */
const DECAY_FLOOR = 54;

export type MeritLedger = {
  total: number;
  /** 갈래별 누적 — 무엇으로 쌓았는지 되돌아볼 수 있게 */
  by: Partial<Record<MeritSource, number>>;
  /** 남에게 회향한 공덕 — 총합에서 빠지지 않는다. 준 만큼 따로 센다 */
  given: number;
  /** 연꽃으로 바꾸며 쓴 공덕 — 총합은 그대로 두고 잔고에서만 뺀다.
      쓴다고 자리가 내려가면 아무도 안 쓴다. */
  spent?: number;
  /** 마지막으로 공덕이 움직인 날 (YYYY-MM-DD) — 퇴전을 셈하는 기준 */
  day?: string;
  /** 퇴전으로 깎인 누계 */
  faded?: number;
  /** 이번에 흐려진 몫 — 한 번 보여 주고 다음 정진에서 지운다 */
  lastFade?: number;
  /** 며칠 쉬었는가 */
  lastGap?: number;
};

const EMPTY: MeritLedger = {
  total: 0,
  by: {},
  given: 0,
  spent: 0,
  day: "",
  faded: 0,
  lastFade: 0,
  lastGap: 0,
};

function readRaw(): MeritLedger {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(MERIT_KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<MeritLedger>;
    return {
      total: typeof p.total === "number" && p.total > 0 ? Math.floor(p.total) : 0,
      by: p.by && typeof p.by === "object" ? p.by : {},
      given: typeof p.given === "number" && p.given > 0 ? Math.floor(p.given) : 0,
      spent: typeof p.spent === "number" && p.spent > 0 ? Math.floor(p.spent) : 0,
      day: typeof p.day === "string" ? p.day : "",
      faded: typeof p.faded === "number" && p.faded > 0 ? Math.floor(p.faded) : 0,
      lastFade: typeof p.lastFade === "number" && p.lastFade > 0 ? Math.floor(p.lastFade) : 0,
      lastGap: typeof p.lastGap === "number" && p.lastGap > 0 ? Math.floor(p.lastGap) : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

/** 두 날 사이의 날수 */
function daysBetween(a: string, b: string): number {
  const x = Date.parse(`${a}T00:00:00Z`);
  const y = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  return Math.max(0, Math.round((y - x) / 86400000));
}

/**
 * 장부를 읽는다. 읽는 김에 **퇴전을 셈한다** —
 * 마지막으로 움직인 날로부터 이틀 넘게 비었으면 그만큼 깎아 적는다.
 * 읽을 때마다 하므로 따로 도는 시계가 필요 없다.
 */
export function loadMerit(): MeritLedger {
  const l = readRaw();
  if (typeof window === "undefined") return l;

  const today = visitDayKey();
  if (!l.day) {
    // 옛 장부 — 오늘부터 센다. 소급해서 깎지 않는다.
    if (l.total > 0) {
      l.day = today;
      save(l, false);
    }
    return l;
  }
  const gap = daysBetween(l.day, today);
  if (gap < 2 || l.total <= 0) return l;

  // 하루는 봐준다 — 이틀째부터 하루씩 깎아 내려간다
  let t = l.total;
  let cut = 0;
  for (let d = 2; d <= gap; d++) {
    const bite = Math.max(DECAY_FLOOR, Math.round(t * decayRate(d)));
    const step = Math.min(t, bite);
    t -= step;
    cut += step;
    if (t <= 0) break;
  }
  if (cut <= 0) return l;

  l.total = Math.max(0, t);
  l.faded = (l.faded ?? 0) + cut;
  l.lastFade = cut;
  l.lastGap = gap;
  // 쓴 몫이 남은 몫보다 커지지 않게 — 잔고가 음수로 뒤집히지 않도록
  if ((l.spent ?? 0) > l.total) l.spent = l.total;
  l.day = today;
  save(l, false);
  return l;
}

/** 마지막 갈무리 뒤로 흐려진 공덕 — 화면이 한 줄로 알린다 */
export function fadedSoFar(l: MeritLedger = loadMerit()): number {
  return l.faded ?? 0;
}

function save(l: MeritLedger, shout = true) {
  try {
    window.localStorage.setItem(MERIT_KEY, JSON.stringify(l));
    // 퇴전 갈무리는 조용히 적는다 — 읽는 도중에 다시 읽히면 끝이 없다
    if (shout) window.dispatchEvent(new CustomEvent(MERIT_EVENT));
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
  // 부적이 붙이는 몫 — 가진 부적과 등급만큼 공덕이 불어난다.
  // 서버에서는 서랍이 비어 있어 1 이 나온다(곱해도 그대로).
  // 부적 배수 × 회향 배수 — 나눌수록 빨라진다
  const raw = Math.round(
    MERIT_VALUE[source] * times * meritMultiplier(source) * giveBonus()
  );
  // 하루 천장 — 넘치는 몫은 쌓이지 않는다(소리도 셈도 그대로 나간다)
  const gained = Math.max(0, Math.min(raw, roomToday(source)));
  const l = loadMerit();
  const before = l.total;
  l.total = before + gained;
  if (gained > 0) l.by[source] = (l.by[source] ?? 0) + gained;
  l.day = visitDayKey(); // 오늘 움직였다 — 퇴전 시계를 다시 감는다
  l.lastFade = 0; // 흐려진 몫은 한 번 보여 주면 지운다
  l.lastGap = 0;
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

// ── 연꽃으로 바꾸기 ────────────────────────────────────────
// 연꽃은 천 원에 파는 재화다. 예전엔 환율만 크게 잡아 막으려 했는데,
// 그러면 목탁을 천 번 두드리는 사람이 생긴다. 천 원 벌자고 그 짓을
// 하게 만드는 건 수행 앱이 할 일이 아니다.
//
// 그래서 막는 자리를 바꿨다 — **하루에 쌓을 수 있는 공덕에 천장(540)을**
// 두고, 환율은 그 천장 기준으로 잡는다. 백팔의 서른 배 —
// 하루를 꽉 채워도 엿새, 사람이 사는 대로면 열흘쯤에 한 송이.
// 더 하고 싶어도 더 못 쌓으니 갈아 넣을 일이 없다.
export const LOTUS_PRICE = 3240;

/** 지금 쓸 수 있는 공덕 — 쌓은 것에서 쓴 것을 뺀다 */
export function meritBalance(l: MeritLedger = loadMerit()): number {
  return Math.max(0, l.total - (l.spent ?? 0));
}

/** 바꿀 수 있는 연꽃 수 */
export function exchangeable(l: MeritLedger = loadMerit()): number {
  return Math.floor(meritBalance(l) / LOTUS_PRICE);
}

/**
 * 공덕을 쓴다. 모자라면 아무 일도 없다(false).
 * 자리(rank)는 총합으로 매기므로 바꿔도 내려가지 않는다.
 */
export function spendMerit(n: number): boolean {
  const l = loadMerit();
  if (n <= 0 || meritBalance(l) < n) return false;
  l.spent = (l.spent ?? 0) + Math.floor(n);
  save(l);
  return true;
}

// ── 회향(廻向) — 돌려 향하게 하다 ───────────────────────────
//
// 교리로는 내 공덕이 줄지 않는다. 촛불로 촛불을 붙여도 내 불은 그대로다.
// 그런데 그것만으로는 **아무 일도 안 일어나는 단추**가 된다 —
// 안 줄고, 받는 이도 없고, 나한테 돌아오는 것도 없으니 누를 이유가 없다.
//
// 그래서 셋을 붙였다 —
//   · 값이 있다   한 번에 108(백팔번뇌 한 바퀴). 아무 때나 누르는 게 아니다.
//   · 비용이 있다 공덕이 아니라 **횟수**. 하루 세 번. 교리는 지키고 남발은 막는다.
//   · 돌아온다   돌린 만큼 내 적립이 빨라진다(108마다 +2%, 최대 +20%).
//                "나눌수록 커진다"를 말이 아니라 숫자로 만든 자리.
// 누구에게 돌렸는지는 등(燈)처럼 남겨 둔다 — 이름을 적으면 그 이름으로.

/** 한 번 돌리는 몫 */
export const GIVE_UNIT = 108;

/** 하루에 돌릴 수 있는 횟수 */
export const GIVE_PER_DAY = 3;

export const GIVE_KEY = "hwadu.give.v1";

export type Lamp = { at: number; to: string; merit: number };

function loadLamps(): Lamp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GIVE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .filter(
        (x): x is Lamp =>
          !!x &&
          typeof (x as Lamp).at === "number" &&
          typeof (x as Lamp).to === "string" &&
          typeof (x as Lamp).merit === "number"
      )
      .slice(-200);
  } catch {
    return [];
  }
}

/** 밝혀 둔 등 — 최근 것이 앞에 온다 */
export function lamps(): Lamp[] {
  return [...loadLamps()].reverse();
}

/** 오늘 몇 번 돌렸는가 */
export function gaveToday(): number {
  const today = visitDayKey();
  return loadLamps().filter((l) => dayOf(l.at) === today).length;
}

/** 오늘 더 돌릴 수 있는 횟수 */
export function giveLeftToday(): number {
  return Math.max(0, GIVE_PER_DAY - gaveToday());
}

function dayOf(at: number): string {
  const d = new Date(at);
  const q = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}`;
}

/**
 * 남에게 돌린다. 총합은 줄지 않는다 — 대신 하루 세 번뿐이다.
 * 돌리면 등이 하나 켜지고, 앞으로 쌓는 공덕이 조금 빨라진다.
 * 오늘 몫을 다 썼으면 아무 일도 일어나지 않는다(null).
 */
export function giveMerit(to: string, n: number = GIVE_UNIT): MeritLedger | null {
  if (giveLeftToday() <= 0) return null;
  const l = loadMerit();
  const give = Math.max(0, Math.floor(n));
  l.given += give;
  save(l);
  try {
    const list = loadLamps();
    list.push({ at: Date.now(), to: to.trim().slice(0, 24) || "모든 중생", merit: give });
    window.localStorage.setItem(GIVE_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    // 등을 못 적어도 회향은 이미 했다
  }
  return l;
}

/**
 * 회향으로 얻는 적립 배수 — 108 돌릴 때마다 2%, 최대 20%.
 * 부적 배수와 곱해 쓴다.
 */
export function giveBonus(l: MeritLedger = loadMerit()): number {
  const steps = Math.floor((l.given ?? 0) / GIVE_UNIT);
  return 1 + Math.min(0.2, steps * 0.02);
}

// ── 진화(進化) — 공덕이 쌓이면 나무가 자란다 ───────────────────
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
