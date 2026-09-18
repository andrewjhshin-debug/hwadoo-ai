// ─────────────────────────────────────────────────────────────
// 오늘의 운세(運勢) — 하루 한 장, 자정에 새로.
//
// 길흉을 점치지 않는다. 불교는 점보는 종교가 아니다.
// 대신 오늘 어느 마음을 조심할지 짚어 준다 — 삼독(貪瞋癡) 중 하나.
// 맞히는 것이 아니라 살피게 하는 것이라, 틀릴 일이 없다.
// 운을 파는 순간 규제도 인심도 다 잃는다. 값도 확률도 여기에 없다.
//
// 뒤집으면 넷이 나온다 — 오늘의 독 · 처방 · 선사의 한 마디 · 공덕 21.
// 처방은 반드시 우리 기능으로 데려간다(비움·호흡·외우기).
// 운세만 보고 나가면 이 화면은 아무것도 아니다.
//
// 삼독 낱말은 tamjinchi.ts 에도 있지만 가져다 쓰지 않는다 —
// 저기는 돈 앞의 마음이고 여기는 하루의 마음이라 할 말이 다르다.
//
// 장부는 이 브라우저에 적는다. 날이 바뀌면 다시 한 장.
// ─────────────────────────────────────────────────────────────

import { visitDayKey } from "@/components/VisitLedger";
import { MERIT_VALUE } from "./merit";
import { SAYINGS } from "./sayings";

export const DRAW_KEY = "hwadu.fortune.v1";
export const DRAW_EVENT = "hwadu-draw-updated";

/** 뒤집으면 그 자리에서 쌓이는 공덕 — 값은 공덕 장부가 쥔다(두 벌로 두지 않는다) */
/** 예전에 운세 한 장에 붙던 공덕. 이제 0 이다 — 장부 갈래는 그대로 둔다
 *  (지난 기록에 이미 적힌 값이 있어 갈래를 지우면 옛 장부가 깨진다) */
export const FORTUNE_MERIT = 0;

/** 자취를 남기는 날 수 */
const LOG_MAX = 30;

// ── 삼독 ────────────────────────────────────────────────────

export type Poison = "tam" | "jin" | "chi";

export type PoisonCard = {
  id: Poison;
  hanja: string;
  name: string;
  /** 패 앞면에 적는 판결 한 줄 */
  verdict: string;
  /** 오늘 이 독이 오는 모양 — 이 중 하나가 뽑힌다 */
  signs: string[];
  /** 처방 한 줄 */
  cure: string;
  /** 처방이 데려가는 자리 */
  href: string;
  go: string;
};

export const POISONS: PoisonCard[] = [
  {
    id: "tam",
    hanja: "貪",
    name: "탐",
    verdict: "탐욕이 셉니다",
    signs: [
      "사고 싶은 게 눈에 밟히는 날",
      "하나만 더, 가 자꾸 붙는 날",
      "남이 가진 것이 유난히 커 보이는 날",
      "장바구니를 이유 없이 열어 보는 날",
    ],
    cure: "오늘 하나는 안 사요. 안 산 것을 한 줄 남겨 두면 그게 남습니다.",
    href: "/empty",
    go: "비움으로",
  },
  {
    id: "jin",
    hanja: "瞋",
    name: "진",
    verdict: "성냄이 셉니다",
    signs: [
      "말끝이 뾰족해지는 날",
      "작은 소리에도 속이 달아오르는 날",
      "지난 일을 되갚고 싶어지는 날",
      "미워할 사람을 먼저 찾는 날",
    ],
    cure: "숨 한 판 쉬어요. 날숨을 길게 하면 말보다 먼저 가라앉습니다.",
    href: "/breath",
    go: "호흡으로",
  },
  {
    id: "chi",
    hanja: "癡",
    name: "치",
    verdict: "어리석음이 셉니다",
    signs: [
      "왜 하는지 잊은 채 손이 먼저 가는 날",
      "화면만 넘기다 저녁이 오는 날",
      "듣고 싶은 말만 귀에 남는 날",
      "남의 말에 내 하루를 맡기는 날",
    ],
    cure: "경전 한 마디를 손으로 쳐 봐요. 흐린 날은 몸이 먼저 압니다.",
    href: "/sutra",
    go: "외우기로",
  },
];

export const POISON_BY_ID: Record<Poison, PoisonCard> = {
  tam: POISONS[0],
  jin: POISONS[1],
  chi: POISONS[2],
};

export function poisonOf(id: Poison): PoisonCard {
  return POISON_BY_ID[id] ?? POISONS[0];
}

/** 말문 — 절에서 처음 만난 사람에게 건네기 좋은 것들 */
/**
 * 오늘의 말문 — 하루를 데리고 갈 한 마디.
 *
 * 형: 「오늘의 말문 진짜로 의미 있는 말을 써줘. 지금 뭐 딴 거 유도하지 말고」
 *
 * 맞는 말이다. 여태 여기 있던 것은 죄다 「어느 절에 자주 가세요?」 같은
 * **다른 방으로 끌고 가는 미끼**였다. 운세를 뽑은 사람이 읽고 싶은 건
 * 우리 앱의 다음 화면이 아니라 오늘 하루에 쓸 한 마디다.
 *
 * 그래서 선가(禪家)와 경전에서 **하루를 견디게 하는 말**만 골랐다.
 * 설명하지 않고, 시키지 않고, 다음 화면으로 밀지 않는다.
 */
export const OPENERS = [
  "오늘 하루도 남의 삶을 대신 살지는 말 것.",
  "급한 일과 중요한 일은 대개 다른 것이다.",
  "지는 것이 반드시 잃는 것은 아니다.",
  "화가 났다면, 화를 낸 것이 아니라 화가 온 것이다.",
  "말은 한 번 더 삼키면 대개 안 해도 되는 말이었다.",
  "잘 안 되는 날은, 잘 안 되는 날인 채로 지나가게 둔다.",
  "무엇을 더 가질까보다 무엇을 안 가져도 되는가.",
  "몸이 피곤한 것과 마음이 지친 것을 헷갈리지 말 것.",
  "미루는 일에는 대개 두려움이 하나 붙어 있다.",
  "오늘 만난 사람도 저마다의 짐을 지고 나왔다.",
  "비교는 남을 아는 일이 아니라 나를 잃는 일이다.",
  "좋은 일도 지나가고 나쁜 일도 지나간다. 그게 다행이다.",
  "완벽하게 하려다 시작을 못 하는 날이 제일 아깝다.",
  "누가 알아주지 않아도 한 일은 한 일이다.",
  "쉬는 것도 해야 하는 일이다.",
  "지금 내가 붙잡고 있는 것, 정말 내 것인가.",
  "답이 안 나올 때는 물음이 틀렸을 때가 많다.",
  "하루에 한 번은 아무것도 아닌 시간을 남겨 둘 것.",
  "용서는 상대를 위한 것이 아니라 나를 내려놓는 일이다.",
  "오늘의 나는 어제의 내가 만든 것이고, 내일의 나는 지금 만든다.",
];

// ── 장부 ────────────────────────────────────────────────────

export type Fortune = {
  at: number;
  /** 뒤집은 날 — 자정을 넘겼는지 이걸로 본다 */
  day: string;
  poison: Poison;
  /** 오늘 이 독이 오는 모양 */
  sign: string;
  /** 선사의 한 마디 */
  saying: string;
  by: string;
  /** 오늘의 말문 — 손잡고 절로로 이어지는 끈 */
  opener: string;
  merit: number;
};

export type DrawBook = {
  day: string;
  /** 오늘 뒤집은 것 — 없으면 아직 안 뒤집었다 */
  today: Fortune | null;
  /** 지나온 자취 */
  log: Fortune[];
};

const EMPTY = (day: string): DrawBook => ({ day, today: null, log: [] });

const POISON_OK = (v: unknown): v is Poison => v === "tam" || v === "jin" || v === "chi";

function sane(v: unknown): v is Fortune {
  const f = v as Fortune;
  return (
    !!f &&
    typeof f === "object" &&
    typeof f.at === "number" &&
    typeof f.day === "string" &&
    POISON_OK(f.poison)
  );
}

// 옛 장부(동행권·부적 조각)는 쓸 데가 없어졌다 — 서랍에 남겨 두면
// 지운 기능이 브라우저에만 살아 있는 꼴이 된다. 한 번만 쓸어낸다.
let swept = false;
function sweepOld() {
  if (swept) return;
  swept = true;
  try {
    window.localStorage.removeItem("hwadu.draw.v1");
  } catch {
    // 못 지워도 이 장부와는 상관없다
  }
}

export function loadDraw(): DrawBook {
  const today = visitDayKey();
  if (typeof window === "undefined") return EMPTY(today);
  sweepOld();
  try {
    const raw = window.localStorage.getItem(DRAW_KEY);
    if (!raw) return EMPTY(today);
    const p = JSON.parse(raw) as Partial<DrawBook>;
    const log = Array.isArray(p.log) ? p.log.filter(sane) : [];
    const head = log[0] ?? null;
    return {
      day: today,
      today: head && head.day === today ? head : null,
      log,
    };
  } catch {
    return EMPTY(today);
  }
}

function save(b: DrawBook) {
  try {
    window.localStorage.setItem(DRAW_KEY, JSON.stringify({ day: b.day, log: b.log }));
    window.dispatchEvent(new CustomEvent(DRAW_EVENT));
  } catch {
    // 못 적어도 화면은 굴러간다
  }
}

/** 오늘 뒤집을 것이 남았는가 — 하루 한 장뿐이다 */
export function canDraw(b: DrawBook = loadDraw()): boolean {
  return b.today === null;
}

/** 오늘 뒤집은 그 장 — 다시 들어와도 같은 것이 놓여 있게 */
export function todaysFortune(b: DrawBook = loadDraw()): Fortune | null {
  return b.today;
}

// ── 뒤집기 ──────────────────────────────────────────────────

// 어제 본 것이 오늘 또 나오면 김이 샌다 — 직전 것만 피한다
function other<T>(list: T[], last: T | undefined, key: (t: T) => string): T {
  const pool = list.length > 1 && last ? list.filter((t) => key(t) !== key(last)) : list;
  return pool[Math.floor(Math.random() * pool.length)] ?? list[0];
}

/**
 * 오늘의 운세를 연다. 이미 뒤집었으면 null.
 * 공덕은 그 자리에서 쌓인다 — 뒤집는 맛과 상이 붙어 있어야 한다.
 */
export function drawFortune(): Fortune | null {
  if (typeof window === "undefined") return null;
  const b = loadDraw();
  if (!canDraw(b)) return null;

  const last = b.log[0];
  const p = other(POISONS, last && poisonOf(last.poison), (c) => c.id);
  const s = other(SAYINGS, last && SAYINGS.find((x) => x.text === last.saying), (x) => x.text);

  const f: Fortune = {
    at: Date.now(),
    day: b.day,
    poison: p.id,
    sign: other(p.signs, last?.sign, (t) => t),
    saying: s.text,
    by: s.name,
    opener: other(OPENERS, last?.opener, (t) => t),
    merit: 0,
  };

  b.today = f;
  b.log = [f, ...b.log].slice(0, LOG_MAX);
  save(b);

  // 오래 「염주」 칸에 적었다 — 한 알(1)짜리 갈래를 스물한 번 곱하는
  // 편법이었는데, 내 도량에 「염주 1,012」로 뜨고 염주 하루 천장까지
  // 깎였다. 한 일과 적히는 칸은 같아야 한다. 이제 제 갈래로 넣는다.
  // 운세에는 공덕을 안 준다 — 형: 「운세는 공덕 주지마」
  // 한 장 뒤집는 데 값을 매기면 하루 한 번 눌러야 하는 숙제가 된다.
  // 공덕은 몸으로 한 것에만 붙는다.

  return f;
}

// ── 이어 온 날 ──────────────────────────────────────────────

/** 하루 뒤로 — "2026-09-14" 를 하루씩 물린다 */
function back(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return visitDayKey(new Date(y, m - 1, d - n).getTime());
}

/**
 * 이어서 며칠째인가.
 * 오늘 아직 안 뒤집었으면 어제부터 센다 — 하루가 다 가기도 전에
 * 줄이 끊긴 것처럼 보이면 사람은 그날로 그만둔다.
 */
export function streakDays(b: DrawBook = loadDraw()): number {
  if (!b.log.length) return 0;
  const seen = new Set(b.log.map((f) => f.day));
  let cur = seen.has(b.day) ? b.day : back(b.day, 1);
  let n = 0;
  while (seen.has(cur) && n <= LOG_MAX) {
    n += 1;
    cur = back(cur, 1);
  }
  return n;
}

// ── 자정까지 ────────────────────────────────────────────────

/** 오늘 — 화면이 자정을 넘겼는지 이걸로 견준다 */
export function dayKey(): string {
  return visitDayKey();
}

/** 다음 자정까지 남은 밀리초 */
export function msToMidnight(now: number = Date.now()): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now);
}

/** 07:12:44 */
export function fmtLeft(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}

/** 09.14 — 자취에 찍는 날짜 */
export function stampOf(day: string): string {
  return day.slice(5).replace("-", ".");
}
