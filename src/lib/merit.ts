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

/**
 * 장부는 **계정마다 따로 둔다.**
 *
 * 한동안 열쇠가 하나뿐이라 장부가 계정이 아니라 브라우저에 붙어 있었다.
 * 한 브라우저를 나눠 쓰면 앞사람이 한 일이 내 도량 칩에 그대로 남았다
 * (「한 적 없는 시절인연 58」이 뜨던 길).
 *
 * 처음엔 로그아웃할 때 장부를 지워 막으려 했는데, 그건 더 나쁜 짓이었다 —
 * 공덕은 아직 서버로 안 올라가니 서랍이 유일본이다. 단추 한 번에 반년
 * 쌓은 것이 사라진다. **지우지 말고 칸을 나눈다.**
 *   로그인 전 · 로그아웃 뒤 :  hwadu.merit.v1
 *   계정 A 로 들어와 있으면  :  hwadu.merit.v1:<A의 uid>
 * 그러면 지울 일이 없고, 다시 들어오면 제 것이 그대로 있다.
 */
let keyUid = "";
function meritKey(): string {
  return keyUid ? `${MERIT_KEY}:${keyUid}` : MERIT_KEY;
}

/**
 * 계정이 정해졌다 — 장부를 그 계정 칸으로 옮긴다. sync.ts 가 부른다.
 * @param uid   로그인한 계정(로그아웃이면 빈 문자열)
 * @param owned 바탕 칸(로그인 전 장부)이 **이 계정의 것**인가.
 *              sync.ts 가 Store.ownerUid 를 보고 판단한다. 남의 것이면
 *              건드리지 않는다 — 그 사람이 다시 들어오면 되찾아야 한다.
 */
export function setMeritAccount(uid: string, owned: boolean) {
  keyUid = uid;
  if (uid) {
    try {
      const k = meritKey();
      const base = window.localStorage.getItem(MERIT_KEY);
      // 이 브라우저에서 쭉 쓰던 사람이 처음 계정 칸으로 옮겨 오는 자리
      if (owned && base) {
        if (!window.localStorage.getItem(k)) window.localStorage.setItem(k, base);
        window.localStorage.removeItem(MERIT_KEY); // 바탕 칸은 비운다 — 다음 사람에게 안 새게
      }
    } catch {
      // 서랍이 막혀도 오늘은 수행할 수 있다
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(MERIT_EVENT));
  } catch {
    /* 서버에서는 창이 없다 */
  }
}
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
  | "moment" // 모멘트 — 절에서 찍은 한 장을 연지원에 건다
  | "bowl" // 싱잉볼 한 번 — 치고 여운을 듣는다
  | "candle" // 초 공양 — 남의 초에 같이 빌어 줌
  | "mandala" // 만다라 — 한 장을 끝까지 칠함
  | "fortune" // 오늘의 운세 — 하루 한 장
  | "mung" // 멍 — 아무것도 안 하고 가만히
  | "hasim" // 하심 — 획을 끝까지 내려감
  | "daily"; // 오늘의 세 가지를 다 마침

/**
 * 무엇을 하면 얼마나 쌓이는가 — 잣대는 한 번의 값이 아니라 **분당 공덕**이다.
 *
 * 예전 표는 한 번의 값만 보고 짰더니 이렇게 됐다:
 *   경전 130/분 > 목탁 75/분 > 절 45/분 > 호흡 10/분.
 * 몸을 쓰고 서두를 수 없는 일이 제일 손해였다. 앉아서 숨 쉬는 사람보다
 * 엄지로 두드리는 사람이 일곱 배 빨랐다. 그건 수행 앱의 저울이 아니다.
 *
 * 그래서 분당으로 다시 깔았다 — 서두를 수 없는 일일수록 후하게,
 * 손가락만 쓰는 일일수록 박하게. 연타(목탁·염주)만 띠의 맨 아래에 둔다.
 *   호흡 한 식 21 ÷ 10초  = 126/분  ← 가장 후하다. 대신 천장이 378(3분)로 제일 낮다
 *   경전 한 마디 54 ÷ 30초 = 108/분  (반야심경 여섯 마디 = 324, 3분)
 *   절 한 배   7 ÷ 4초    = 105/분  (삼배 21 · 스물한 배 147 · 백팔배 756)
 *   싱잉볼 한 번 21 ÷ 15초 = 84/분   (여운이 다 울기 전엔 다시 못 친다)
 *   목탁 1 ÷ 0.8초 = 75/분 · 염주 1 ÷ 1초 = 60/분   ← 일부러 맨 아래
 *   화두 회향 108 ÷ 3분 = 36/분    (본업이라 값은 한 바퀴, 대신 생각하는 시간이 든다)
 *   인연 한 줄 21 ÷ 40초 = 31/분   (글을 공덕으로 사면 도배가 된다)
 *   절 다녀오기 108 · 시절인연 54(그 자리면 한 번 더 얹어 108) — 발품은 분으로 안 잰다
 *   오늘의 세 가지 108 — 갈래를 고루 돌게 만드는 값이라 한 바퀴를 통째로
 *
 * 호흡은 '판'이 아니라 **'식(10초)'** 으로 센다. 판으로 주면 여섯 식에 끊고
 * 다시 여는 게 이득이 된다 — meditation.ts 가 addMerit("breath", 식수) 로 부른다.
 */
export const MERIT_VALUE: Record<MeritSource, number> = {
  bow: 7,
  moktak: 1,
  bead: 1,
  breath: 21, // 한 식(10초)
  hwadu: 108,
  temple: 108,
  gathering: 21,
  sutra: 54,
  moment: 54,
  bowl: 21,
  // 남의 초 앞에서 같이 손을 모으는 일.
  // 「공덕 → 연꽃 → 초 → 공덕」으로 돌아오니 순환 아니냐는 말이 있었는데,
  // 돌아오는 것은 초가 아니라 **마음**이다. 남이 지은 선을 기뻐하는 것이
  // 그 자체로 공덕이라는 게 수희공덕(隨喜功德) — 보현행원의 다섯째 원이다.
  // 그래서 값을 치른 초(연꽃)에는 공덕을 안 주고, 남의 초에 손 모으는 데만 준다.
  // 만다라 한 장 — 문양에 따라 백육십 칸 남짓을 손끝으로 채운다.
  // 이십 분 안팎이 걸리니 백팔배(756) 와 호흡 한 판(378) 사이가 맞다.
  mandala: 540,
  // 하심 — 일흔다섯 화면을 엄지로 끝까지 끌어내린다. 이삼 분이 걸리고
  // 중간에 얻는 것이 아무것도 없다(숫자도, 소리도, 말도 없앴다).
  //
  // 처음엔 378 로 두었다가 형이 「너무 많이 주는 거 아니노」 해서 낮췄다.
  // 맞다 — 엄지만 쓰는 일이다. 몸을 쓰는 절(백팔배 756)보다 한참 아래,
  // 손끝으로 세는 목탁(연타)보다는 위. 백팔로 잡는다.
  hasim: 108,
  candle: 9,
  // 오늘의 운세 — 패 한 장. 오래 「염주」 칸에 적혔다. 한 알(1)짜리 갈래를
  // 스물한 번 곱해 넣는 편법이었는데, 그러면 화면에 「염주 1,012」로 보이고
  // 염주 하루 천장(540)도 같이 깎였다. 한 일과 적히는 칸이 어긋나면
  // 숫자를 못 믿는다. 제 갈래를 냈다.
  fortune: 21,
  // 멍 — 일 분에 마흔둘.
  //
  // 「아무것도 안 하는데 왜 공덕을 주나」 — 아무것도 안 하는 일이 제일
  // 어렵다. 다만 후하게 주면 폰을 켜 두고 딴짓하는 사람이 이긴다.
  // 그래서 **분당으로 제일 박하게** 둔다(절 105/분 · 호흡 126/분 · 멍 42/분).
  // 십오 분을 꼬박 가만히 있어야 630 — 백팔배 한 번(756)에 못 미친다.
  mung: 42,
  daily: 108,
};

// ── 하루에 쌓을 수 있는 몫 ──────────────────────────────────
// 목탁만 천 번 두드려 연꽃을 따 가는 판이 되면 안 된다. 그건 수행이
// 아니라 노동이고, 우리가 파는 재화(연꽃)도 같이 죽는다.
// 그래서 갈래마다 하루 천장을 두고, 하루 전체에도 천장을 둔다.
// 천장에 닿아도 소리는 나고 셈은 오른다 — 공덕만 더 붙지 않는다.
// 여러 가지를 고루 해야 하루치가 찬다. 그게 '오늘의 세 가지'의 결이다.

/**
 * 갈래마다 하루에 쌓을 수 있는 공덕.
 *
 * 처음엔 갈래 천장을 바짝 조였더니, 하루치(3,240)를 채우려면 열한 갈래를
 * 거의 다 돌아야 했다. 그건 수행이 아니라 숙제다. 그래서 천장을 열었다 —
 * 이제 두세 갈래만 붙들어도 스무 분이면 하루치가 찬다.
 * 다 더하면 6,318 이라 여전히 한 갈래만으로는 못 채운다.
 */
export const DAILY_CAP: Record<MeritSource, number> = {
  bow: 1944, // 백팔배 두 번 반(18분)
  // 연타는 여전히 눌러 둔다 — 목탁·염주를 합쳐도 하루치의 17%다.
  // TV 보면서 두 엄지로 되는 일에 더 큰 몫을 줄 수는 없다.
  moktak: 540,
  bead: 540,
  breath: 972, // 마흔여섯 식(8분)
  hwadu: 648,
  temple: 864, // 여덟 곳
  gathering: 324,
  sutra: 1620, // 반야심경 다섯 편(15분)
  moment: 864,
  bowl: 486,
  mandala: 1080, // 하루 두 장
  candle: 162,
  fortune: 21, // 패는 하루 한 장뿐이라 한 장 값이 곧 천장
  mung: 630, // 십오 분. 더 앉아도 되지만 공덕은 여기까지
  // 형: 「하심도 할 때마다 주도록 해. 너무 많이는 말고」
  // 하루 네 번까지. 다섯 번째부터는 내려가도 값이 안 붙는다 —
  // 그때부터는 공덕이 아니라 그냥 내려가는 일이다.
  hasim: 432,
  daily: 324, // 오늘의 세 가지 — 하루 한 번뿐
};

/**
 * 하루 전체 천장 — **연꽃 한 송이(6,480 = 백팔 예순 바퀴).**
 *
 * 2,160(스무 바퀴)이었다. 연꽃 한 송이가 6,480 이니 **꼬박 사흘**을 채워야
 * 한 송이가 여물었다. 사흘은 너무 멀다 — 오늘 뭘 해도 오늘은 아무 일도
 * 안 일어나니, 쌓이는 숫자가 무슨 뜻인지 손에 안 잡혔다.
 *
 * 그래서 **하루 몫과 연꽃 한 송이를 같은 수로 맞췄다.** 이러면 규칙이 한 줄로 준다 —
 *   「오늘 몫을 다 채우면 연꽃 한 송이. 하루 한 송이, 자정에 새로 시작.」
 * 설명할 것이 사라지고, 오늘 하는 일이 오늘 안에 끝난다.
 *
 * 얼마나 걸리나 — 갈래를 고루 돌아 한두 시간, 한 갈래만 붙들면 못 채운다.
 *   백팔배 두 번 반(18분) 1,944 · 반야심경 다섯 편(15분) 1,620 ·
 *   호흡 8분 972 · 목탁·염주 1,080 · 절 다녀오기 864 …
 * 갈래 천장을 다 더하면 9,288 = 이 수의 1.43배다. 대여섯 갈래는 돌아야 하고,
 * 제일 큰 갈래(bow 1,944)도 30%를 못 넘는다.
 *
 * 연꽃은 **하루 한 송이까지만** 바꿀 수 있다(/api/lotus/exchange). 천장이
 * 곧 한 송이라 두 규칙이 서로 어긋날 일도 없어졌다.
 */
export const DAILY_TOTAL_CAP = 6480;

/**
 * 오늘 이 갈래로 **실제로 붙은** 공덕.
 *
 * 예전엔 「횟수 × 갈래값」으로 셌다. 그런데 addMerit 이 적립하는 값은
 * 거기에 부적 배수와 회향 배수를 먹인 것이다. 그래서 배수를 가진 사람은
 * 천장을 맨값으로 깎으면서 장부에는 곱한 값을 넣고 있었다 —
 *   절 108배, 부적 1.8 : 적립 13×108 = 1,404, 천장 소모 7×108 = 756.
 *   648 이 그냥 샜다. 배수 상한(부적 2.0 × 회향 1.2 = 2.4)까지 가면
 *   하루 천장 2,160 이 실질 5,184 가 된다 — 천장이 천장이 아니었다.
 *
 * 이제 daily.got(붙은 값)을 그대로 합산한다. 옛 장부에는 got 이 없으니
 * 그때만 예전 셈으로 받쳐 준다(오늘 하루치라 다음 날이면 사라진다).
 */
function earnedToday(): { by: Partial<Record<MeritSource, number>>; sum: number } {
  const book = loadDaily();
  const by: Partial<Record<MeritSource, number>> = {};
  let sum = 0;
  for (const [k, times] of Object.entries(book.by)) {
    if (k === "visit") continue;
    const per = MERIT_VALUE[k as MeritSource];
    if (!per || !times) continue;
    // got 이 있으면 그게 참이다 — 0 이어도 참이다(천장에 걸려 안 붙은 것).
    // 「값×횟수」는 got 칸이 아예 없는 **옛 장부**를 받쳐 줄 때만 쓴다.
    const got = book.got?.[k as MeritSource];
    const raw = typeof got === "number" ? got : per * times;
    const v = Math.min(DAILY_CAP[k as MeritSource] ?? 0, raw);
    by[k as MeritSource] = v;
    sum += v;
  }
  // 오늘 몫은 천장을 넘을 수 없다 — 넘은 수가 화면에 찍히면
  // 「6,642 / 6,480」 같은 말이 안 되는 줄이 된다.
  return { by, sum: Math.min(DAILY_TOTAL_CAP, sum) };
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
  /** 갈래별 누적 **공덕** — 무엇으로 쌓았는지 되돌아볼 수 있게 */
  by: Partial<Record<MeritSource, number>>;
  /**
   * 갈래별 누적 **횟수** — 몇 번 했는지.
   *
   * by 만 있던 시절, 화면에 「시절인연 58」이라 떴다. 사용자는 이걸 58번으로
   * 읽었는데 실은 **한 장**을 건 공덕(54 × 부적 1.05 × 회향 1.03 = 58)이었다.
   * 숫자가 자기가 한 일과 안 맞으면 숫자를 통째로 못 믿는다. 횟수를 따로
   * 센다 — 이제 화면이 「시절인연 1번 · 58」이라 말할 수 있다.
   */
  hits?: Partial<Record<MeritSource, number>>;
  /**
   * 횟수를 세기 시작했다는 표시.
   *
   * 옛 장부에는 hits 가 없다. 그 사람이 다음에 목탁을 한 번 치면 hits.moktak
   * 이 1 이 되는데, by.moktak 에는 그동안 쌓인 12,000 이 들어 있다.
   * 그러면 칩이 「목탁 1번 · 공덕 12,000」이 된다 — 안 세느니만 못하다.
   * 이 표시가 없는 장부에서는 화면이 횟수를 아예 안 적는다.
   */
  hitsFrom?: string;
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
  hits: {},
  hitsFrom: "",
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
    const raw = window.localStorage.getItem(meritKey());
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<MeritLedger>;
    return {
      total: typeof p.total === "number" && p.total > 0 ? Math.floor(p.total) : 0,
      by: p.by && typeof p.by === "object" ? p.by : {},
      hits: p.hits && typeof p.hits === "object" ? p.hits : {},
      hitsFrom: typeof p.hitsFrom === "string" ? p.hitsFrom : "",
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

  const before = l.total;
  l.total = Math.max(0, t);
  // 갈래별 몫도 같은 비율로 흐려진다. 총합만 깎았더니 칩을 다 더한 수가
  // 「지금까지 쌓은 공덕」보다 커졌다 — 사흘 쉬었다 온 사람일수록 더.
  // 한 화면에 나란히 선 두 숫자가 안 맞으면 숫자를 통째로 못 믿는다.
  if (before > 0) {
    const keep = l.total / before;
    for (const k of Object.keys(l.by) as MeritSource[]) {
      const v = l.by[k];
      if (typeof v === "number") l.by[k] = Math.max(0, Math.round(v * keep));
    }
  }
  l.faded = (l.faded ?? 0) + cut;
  l.lastFade = cut;
  l.lastGap = gap;
  // 쓴 몫이 남은 몫보다 커지지 않게 — 잔고가 음수로 뒤집히지 않도록
  if ((l.spent ?? 0) > l.total) l.spent = l.total;
  l.day = today;
  save(l, false);
  return l;
}

/**
 * 공덕 장부를 통째로 비운다 — 계정이 바뀌거나 로그아웃할 때.
 *
 * 이게 없어서 장부가 **계정이 아니라 브라우저**에 붙어 있었다.
 * 한 브라우저에서 계정을 바꾸면 앞사람이 한 일이 내 도량 칩에 그대로
 * 남았다 — 「한 적 없는 시절인연 58」이 뜨는 길이 여기다.
 * 하루 장부도 같이 비운다(sync.ts 가 함께 부른다).
 */
export function resetMerit() {
  try {
    window.localStorage.removeItem(meritKey());
    window.dispatchEvent(new CustomEvent(MERIT_EVENT));
  } catch {
    // 못 지워도 수행에 지장이 없도록
  }
}

/** 마지막 갈무리 뒤로 흐려진 공덕 — 화면이 한 줄로 알린다 */
export function fadedSoFar(l: MeritLedger = loadMerit()): number {
  return l.faded ?? 0;
}

function save(l: MeritLedger, shout = true) {
  try {
    window.localStorage.setItem(meritKey(), JSON.stringify(l));
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
  times = 1,
  /**
   * 「몇 번 했나」 — 값을 곱하는 수(times)와 **다를 수 있다.**
   *
   * 호흡은 판 하나에 열여덟 식이 붙으니 times 는 18 이지만 한 판이고,
   * 시절인연은 도장이 찍히면 한 몫을 더 얹느라 두 번 부르지만 사진은
   * 한 장이다. times 를 그대로 세었더니 칩에 「시절인연 2번」이 떴다 —
   * 고치려던 바로 그 증상이다. 세는 단위를 따로 받는다.
   */
  hits = times
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
  // 횟수는 공덕이 0 이어도 센다 — 천장에 걸렸을 뿐 한 일은 한 일이다
  if (!l.hits) l.hits = {};
  // 빈 장부라면 오늘부터 센 것이니 처음부터 맞는 수다. 쌓인 것이 있는
  // 장부는 「오늘부터 셈」이라고 적어 두고, 화면이 그 갈래만 횟수를 적는다.
  if (l.hitsFrom === undefined || l.hitsFrom === "") {
    l.hitsFrom = before > 0 ? visitDayKey() : "처음부터";
  }
  if (hits > 0) l.hits[source] = (l.hits[source] ?? 0) + Math.round(hits);
  l.day = visitDayKey(); // 오늘 움직였다 — 퇴전 시계를 다시 감는다
  l.lastFade = 0; // 흐려진 몫은 한 번 보여 주면 지운다
  l.lastGap = 0;
  save(l);
  // 하루치도 같이 적는다 — 오늘의 세 가지가 이 셈을 읽는다.
  // 상 자체(daily)도 적는다. 예전엔 「상이 상을 낳으면 안 된다」고 뺐는데,
  // 미션 판정(missionsOf)에 daily 키가 없으니 그럴 일이 애초에 없었다.
  // 빼 두었더니 상으로 받은 108 이 「오늘 N / 6,480」 막대에서 통째로
  // 사라져, 총 공덕만 108 오르고 오늘 줄은 꿈쩍도 안 했다.
  noteDaily(source, times, gained);
  return {
    total: l.total,
    gained,
    crossed: Math.floor(l.total / ROUND) > Math.floor(before / ROUND),
    round: Math.floor(l.total / ROUND),
  };
}

// ── 연꽃으로 바꾸기 ────────────────────────────────────────
// 연꽃은 천 원에 파는 재화다. 환율만 크게 잡아 막으려 하면 목탁을
// 천 번 두드리는 사람이 생긴다 — 천 원 벌자고 그 짓을 하게 만드는 건
// 수행 앱이 할 일이 아니다. 그래서 막는 자리를 **하루 천장**에 두었다.
//
// 값은 하루 천장의 **세 배**(2,160 × 3 = 108 × 60).
//   하루도 안 빠지고 스물다섯 분씩 꽉 채운 사람: 한 달에 딱 열 송이.
//   보통 사람(하루 1,600 남짓): 서너 달에 한 번 열 송이 — 아홉천 원짜리
//   묶음이 죽지 않는다.
//   가볍게 하는 사람: 아흐레에 한 송이.
// 한 송이는 3~4일이면 손에 쥔다. 써 보지 않은 사람은 살 이유도 못 찾는다 —
// 처음 한 송이는 반드시 벌리게 두고, 열 송이는 못 벌게 막는다.
export const LOTUS_PRICE = 6480;

/**
 * 공덕을 「바퀴」로 읽는다 — 108 이 이 앱의 하나뿐인 단위다.
 *
 * 화면에 6,480 · 2,160 · 432 · 108 이 한꺼번에 떠 있으면 통화가 여럿으로
 * 보인다. 실은 전부 108 의 배수다(6,480 = 108×60, 2,160 = 108×20).
 * 한 번이라도 그렇게 적어 두면 「108 이 뭔지」를 따로 설명할 일이 없다.
 */
export function rounds(n: number): number {
  return Math.floor(Math.max(0, n) / ROUND);
}

/** 연꽃 한 송이가 몇 바퀴인가 — 예순 */
export const LOTUS_ROUNDS = LOTUS_PRICE / ROUND;

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
// 처음엔 그 말을 그대로 옮겨 한 톨도 안 줄게 두었다. 그랬더니 회향이
// **안 누를 이유가 없는 단추**가 됐다 — 공짜고, 하루 세 번이고, 배수까지 붙으니
// 눌러 두는 게 언제나 이득이다. 선택이 아닌 것은 기능이 아니다.
//
// 그래서 값을 붙였다. 다만 **어느 셈에서 나가는지**를 갈랐다 —
//   · 쌓은 공덕(total)  자리(육도·계급)가 보는 수. 여기선 **한 톨도 안 준다.**
//                        남을 위해 빌었다고 자리가 내려가면 그건 회향이 아니다.
//   · 쥔 공덕(balance)  연꽃으로 바꿀 수 있는 몫. 여기서 108 이 나간다.
//   불을 나눠 줘도 내 불은 안 꺼지지만, 초는 닳는다. 그 말이 맞다.
//
// 그리고 돌아온다 — 돌린 만큼 앞으로의 적립이 빨라진다(108마다 +2%, 최대 +20%).
// 쓰면 느려지는 게 아니라 빨라진다. "나눌수록 커진다"를 숫자로 만든 자리다.
// 누구에게 돌렸는지는 법당에 등(燈)으로 이레 동안 걸린다.

/** 한 번 돌리는 몫 */
export const GIVE_UNIT = 108;

/**
 * 하루에 돌릴 수 있는 횟수.
 *
 * **막는 일은 이제 서버가 한다** — 한 자리에 하루 한 번, 자리가 여섯이라
 * 하루 여섯 번이다(hallSpec.POUR_PER_SEAT_PER_DAY, /api/merit/give).
 * 기기의 셈으로 막으면 기기를 바꿔 우회할 수 있고, 무엇보다 「오늘 몇 명」이
 * 부풀어 버린다. 이 상수는 옛 화면이 남아 있을 때를 받쳐 주는 값으로만 둔다.
 */
export const GIVE_PER_DAY = 6;

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
 * 남에게 돌린다 — **내 공덕은 한 톨도 안 줄어든다.**
 *
 * 한동안 손에 쥔 몫에서 108 을 깎았다. 「안 누를 이유가 없는 단추는 기능이
 * 아니다」는 까닭이었는데, 그 값이 결국 이 앱이 무엇인지를 흐렸다 —
 * 공덕이 계급이면서 동시에 지갑이 되어, 쓰면 등급이 내려가는지 아닌지조차
 * 아무도 몰랐다.
 *
 * 그래서 선을 다시 그었다. 교리가 원래 갈라 놓은 대로다 —
 *   · 회향(廻向)  촛불로 촛불을 붙여도 내 불은 안 꺼진다. **안 줄어든다.**
 *   · 퇴전(退轉)  닦지 않으면 물러난다. 발길이 뜸하면 **스스로 흐려진다.**
 * 남 때문에 줄어드는 일은 없고, 나 때문에만 줄어든다.
 *
 * 그럼 회향을 막는 것은 무엇인가 — 값이 아니라 **하루 세 번**과
 * **누구에게 돌릴지 이름을 적는 일**이다. 마찰은 거기 있으면 된다.
 * 회향은 우리가 바라는 행동이라, 값을 붙여 막을 자리가 아니었다.
 *
 * 쓰는 몫(연꽃)은 따로 있다 — 초·등·쪽지. 그게 「남을 위해 쓰는 것」이다.
 */
export function giveMerit(to: string, n: number = GIVE_UNIT): MeritLedger | null {
  if (giveLeftToday() <= 0) return null;
  const give = Math.max(0, Math.floor(n));
  const l = loadMerit();
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
 * 회향으로 얻는 적립 배수 — **최근 이레 중 회향한 날수**로 잰다.
 *
 * 한동안 누적(given)으로 쟀다. 108 돌릴 때마다 +2%, 최대 +20% —
 * 그러면 상한이 회향 열 번이고, 하루 세 번이면 **나흘째에 천장**이다.
 * 설정에 묻혀 있을 땐 아무도 몰랐지만, 회향을 법당 맨 앞으로 끌어올리는
 * 순간 「돌릴수록 빨라진다」는 약속이 나흘 만에 끝나고 닷새째부터는
 * 아무 보람 없는 단추가 된다. 매일 올 자리를 만들면서 나흘짜리 곡선을
 * 붙여 둘 수는 없다.
 *
 * 그래서 「얼마나 많이 했나」가 아니라 「요즘 하고 있나」로 바꿨다.
 * 천장에 닿아도 유지하려면 계속 와야 하고, 하루 쉬면 이레 뒤 저절로
 * 내려간다. 닦지 않으면 물러난다는 퇴전(退轉)과 같은 결이다.
 *
 * 값은 날마다 +3%, 이레를 다 채우면 ×1.21 — 옛 천장(×1.20)과 비슷하다.
 * 부적 배수와 곱해 쓴다.
 */
export const GIVE_WINDOW = 7;

export function giveBonus(_l: MeritLedger = loadMerit()): number {
  void _l; // 셈이 장부에서 등(燈)으로 옮겨 갔다 — 부르던 쪽은 안 고치려고 남겨 둔다
  const cut = Date.now() - GIVE_WINDOW * 86_400_000;
  const days = new Set(loadLamps().filter((l) => l.at >= cut).map((l) => dayOf(l.at)));
  return 1 + Math.min(0.21, days.size * 0.03);
}

/** 최근 이레 중 회향한 날수 — 화면에 「이레 중 나흘」로 적는다 */
export function giveDays(): number {
  const cut = Date.now() - GIVE_WINDOW * 86_400_000;
  return new Set(loadLamps().filter((l) => l.at >= cut).map((l) => dayOf(l.at))).size;
}

// ── 진화(進化) — 공덕이 쌓이면 나무가 자란다 ───────────────────
// 김부따는 옷을 갈아입지만 우리는 깨달아 간다. 화두 수행이 여덟 할인
// 서비스이니, 캐릭터도 옷이 아니라 자리가 바뀌어야 맞다.
// 마지막에 머리 위 물음표가 광배(光背)로 바뀐다 — 물음이 답이 되는 자리.

// 문턱은 육도(realm.ts REALMS)와 **같다.** 전에는 따로 놀아서 10,800 에
// 이미 부처가 되었는데 천상도는 한참 남아 있었다 — 사다리가 둘이면
// 어느 쪽을 봐야 할지 알 수 없다. 이름만 둘이고 자리는 하나다.
//   나무 자리는 「내 그림이 얼마나 자랐나」, 육도는 「내가 어디에 서 있나」.
export const RANKS = [
  { need: 0, hanja: "童", name: "동자", say: "이제 막 산문에 들었어요" },
  { need: 432, hanja: "沙", name: "사미", say: "물음 하나를 품기 시작했어요" },
  { need: 1620, hanja: "首", name: "수좌", say: "앉는 일이 몸에 붙었어요" },
  { need: 21600, hanja: "禪", name: "선사", say: "흔들림이 눈에 띄게 줄었어요" },
  { need: 84000, hanja: "薩", name: "보살", say: "이제 남의 몫까지 돕니다" },
  { need: 194400, hanja: "佛", name: "부처", say: "물음표가 광배가 되었어요" },
] as const;

export type Rank = (typeof RANKS)[number];

/**
 * 문턱이 같은 자리를 찾는다 — 육도(realm.ts)와 이 사다리는 **문턱이 같다.**
 *
 * 화면에는 이쪽 이름만 쓴다. 육도는 오르는 계단이 아니라 벗어나야 할
 * 굴레이고(목표는 천상도가 아니라 그 밖이다), 무엇보다 사람에게
 * 「지금 당신은 아귀도입니다, 다음은 축생도입니다」라고 말할 수는 없다.
 * 자리를 재는 셈(공덕 + 회향한 화두 수)은 realm.ts 가 그대로 쥐고,
 * 이 함수는 그 결과에 붙일 **이름만** 바꿔 준다.
 */
export function rankByNeed(need: number): Rank {
  return RANKS.find((r) => r.need === need) ?? RANKS[0];
}

// ── 뒷방 주인 ────────────────────────────────────────────────
// 주인은 이 도량의 모든 자리를 열어 두고 본다. 자리를 올리려고 목탁을
// 두드리고 있을 수는 없다 — 화면을 고치려면 꼭대기가 어떻게 보이는지
// 늘 눈앞에 있어야 한다. 그래서 자리·그림·연꽃만 얹는다.
// **장부(loadMerit)는 건드리지 않는다.** 숫자를 부풀리면 저울이 망가진다.
let owner = false;

/** 로그인 흐름(sync.ts watchAuth)이 한 번 켜 준다 */
export function setOwner(v: boolean) {
  owner = v;
}
export function isOwner(): boolean {
  return owner;
}

export function rankOf(total: number): Rank {
  if (owner) return RANKS[RANKS.length - 1];
  let r: Rank = RANKS[0];
  for (const x of RANKS) if (total >= x.need) r = x;
  return r;
}

/** 지금 자리의 번호 — 0(동자) ~ 5(부처). 그림을 고를 때 쓴다 */
export function stageOf(total: number): number {
  if (owner) return RANKS.length - 1;
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
  moment: "시절인연",
  bowl: "싱잉볼",
  candle: "초 공양",
  fortune: "오늘의 운세",
  mung: "멍 때리기",
  hasim: "하심",
  daily: "오늘의 세 가지",
  mandala: "만다라",
};
