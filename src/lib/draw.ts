// ─────────────────────────────────────────────────────────────
// 오늘의 한 장(籤) — 하루에 딱 한 장 뒤집는 패.
//
// 왜 "뽑기"라 부르지 않는가 —
// 돈을 넣고 확률을 사는 판이 아니다. 하루가 지나면 한 장이 놓이고,
// 그 한 장을 뒤집는 것뿐이다. 그래서 여기에는 값도, 확률 표시도 없다.
// (확률형 상품으로 읽히는 순간 규제도 인심도 다 잃는다.)
// 연꽃을 쓰면 하루에 딱 한 장까지만 더 — 더는 못 산다.
//
// 패는 손잡고 절로(인연)와 물려 있다. 공덕만 주는 판이면 혼자 노는
// 화면이 되지만, 인연패·동행권·말문은 사람을 만나러 가게 만든다.
//
// 장부는 이 브라우저에 적는다(hwadu.draw.v1). 날이 바뀌면 오늘 뽑은 수만
// 비우고, 모은 것(동행권·부적 조각)과 자취는 그대로 둔다.
// ─────────────────────────────────────────────────────────────

import { visitDayKey } from "@/components/VisitLedger";
import { addMerit } from "./merit";
import { CHARMS, grantCharm, loadCharms, type Charm } from "./charm";
import { SAYINGS } from "./sayings";

export const DRAW_KEY = "hwadu.draw.v1";
export const DRAW_EVENT = "hwadu-draw-updated";

/** 하루에 거저 놓이는 장 수 */
export const FREE_PER_DAY = 1;
/** 연꽃으로 더 뒤집을 수 있는 장 수 — 하루 한 장까지만 */
export const MAX_EXTRA = 1;
/** 부적 조각 셋이면 부적 하나 */
export const PIECES_FOR_CHARM = 3;

// ── 패 ──────────────────────────────────────────────────────

export type CardKind =
  | "inyeon" // 인연패 — 오늘 하루 내 글이 맨 위
  | "donghaeng" // 동행권 — 쪽지 청하기 한 번
  | "malmun" // 말문 — 건넬 첫 마디
  | "merit" // 공덕패
  | "piece" // 부적 조각
  | "saying"; // 오늘의 말

export type Card = {
  kind: CardKind;
  name: string;
  hanja: string;
  /** 금색 동그라미에 새길 한 글자 */
  mark: string;
  /** 이 패가 무엇인지 한 줄 */
  say: string;
  /** 공덕패만 — 얹히는 공덕 */
  merit?: number;
  /** 나오는 무게. 밖으로 내보이지 않는다(확률을 광고하지 않는다) */
  weight: number;
};

const DECK: Card[] = [
  {
    kind: "inyeon",
    name: "인연패",
    hanja: "因緣牌",
    mark: "因",
    say: "오늘 하루, 인연에 올린 내 글이 맨 위에 놓여요",
    weight: 8,
  },
  {
    kind: "donghaeng",
    name: "동행권",
    hanja: "同行券",
    mark: "同",
    say: "쪽지 청하기를 연꽃 없이 한 번",
    weight: 10,
  },
  {
    kind: "malmun",
    name: "말문",
    hanja: "言門",
    mark: "言",
    say: "오늘 만난 사람에게 건넬 첫 마디",
    weight: 18,
  },
  { kind: "merit", name: "공덕패", hanja: "功德牌", mark: "功", say: "", merit: 21, weight: 26 },
  { kind: "merit", name: "공덕패", hanja: "功德牌", mark: "功", say: "", merit: 54, weight: 12 },
  { kind: "merit", name: "공덕패", hanja: "功德牌", mark: "功", say: "", merit: 108, weight: 4 },
  {
    kind: "piece",
    name: "부적 조각",
    hanja: "符籍片",
    mark: "符",
    say: "셋을 모으면 부적 한 장을 청할 수 있어요",
    weight: 8,
  },
  {
    kind: "saying",
    name: "오늘의 말",
    hanja: "今日一句",
    mark: "句",
    say: "",
    weight: 14,
  },
];

/** 말문 — 절에서 처음 만난 사람에게 건네기 좋은 것들 */
export const OPENERS = [
  "어느 절에 자주 가세요?",
  "처음 절에 간 날이 기억나세요?",
  "새벽 예불 가 보신 적 있어요?",
  "요즘 붙잡고 있는 물음이 있으세요?",
  "마음에 남은 경전 구절이 있으세요?",
  "혼자 가는 절과 같이 가는 절, 어느 쪽이 좋으세요?",
  "다음에 가 보고 싶은 절이 있어요?",
  "절밥 중에 제일 생각나는 게 뭐예요?",
];

// ── 장부 ────────────────────────────────────────────────────

export type Got = {
  at: number;
  kind: CardKind;
  name: string;
  hanja: string;
  mark: string;
  /** 말문·오늘의 말이면 그 문장 */
  text?: string;
  /** 오늘의 말을 남긴 이 */
  by?: string;
  merit?: number;
};

export type DrawBook = {
  day: string;
  /** 오늘 뒤집은 장 */
  drawn: number;
  /** 오늘 연꽃으로 더 얻은 장 */
  extra: number;
  /** 모아 둔 부적 조각 */
  pieces: number;
  /** 남은 동행권 */
  tickets: number;
  /** 인연패가 켜진 날 — 오늘이면 켜져 있다 */
  boost: string | null;
  /** 지나온 자취 — 최근 60장 */
  log: Got[];
};

const EMPTY = (day: string): DrawBook => ({
  day,
  drawn: 0,
  extra: 0,
  pieces: 0,
  tickets: 0,
  boost: null,
  log: [],
});

const num = (v: unknown) => (typeof v === "number" && v > 0 ? Math.floor(v) : 0);

export function loadDraw(): DrawBook {
  const today = visitDayKey();
  if (typeof window === "undefined") return EMPTY(today);
  try {
    const raw = window.localStorage.getItem(DRAW_KEY);
    if (!raw) return EMPTY(today);
    const p = JSON.parse(raw) as Partial<DrawBook>;
    const rolled = p.day !== today; // 날이 바뀌면 오늘치만 비운다
    return {
      day: today,
      drawn: rolled ? 0 : num(p.drawn),
      extra: rolled ? 0 : Math.min(num(p.extra), MAX_EXTRA),
      pieces: num(p.pieces),
      tickets: num(p.tickets),
      boost: typeof p.boost === "string" ? p.boost : null,
      log: Array.isArray(p.log) ? (p.log.filter((g) => g && typeof g === "object") as Got[]) : [],
    };
  } catch {
    return EMPTY(today);
  }
}

function save(b: DrawBook) {
  try {
    window.localStorage.setItem(DRAW_KEY, JSON.stringify(b));
    window.dispatchEvent(new CustomEvent(DRAW_EVENT));
  } catch {
    // 못 적어도 화면은 굴러간다
  }
}

/** 오늘 남은 장 */
export function leftToday(b: DrawBook = loadDraw()): number {
  return Math.max(0, FREE_PER_DAY + b.extra - b.drawn);
}

export function canDraw(b: DrawBook = loadDraw()): boolean {
  return leftToday(b) > 0;
}

/** 연꽃을 이미 쓴 날인가 — 더 살 수 있는지 화면이 묻는다 */
export function canBuyExtra(b: DrawBook = loadDraw()): boolean {
  return b.extra < MAX_EXTRA;
}

/** 오늘 뒤집은 그 장 — 다시 들어와도 같은 패가 놓여 있게 */
export function todaysGot(b: DrawBook = loadDraw()): Got | null {
  const g = b.log[0];
  return g && visitDayKey(g.at) === b.day ? g : null;
}

// ── 뒤집기 ──────────────────────────────────────────────────

function pick(): Card {
  const sum = DECK.reduce((a, c) => a + c.weight, 0);
  let r = Math.random() * sum;
  for (const c of DECK) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return DECK[0];
}

// 어제 본 문장이 오늘 또 나오면 김이 샌다 — 직전 것만 피한다
function other(list: string[], last?: string): string {
  const pool = list.length > 1 && last ? list.filter((s) => s !== last) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 한 장 뒤집는다. 남은 장이 없으면 null.
 * 얻은 것은 그 자리에서 먹인다 — 공덕은 공덕 장부로, 나머지는 이 장부로.
 */
export function drawOne(): Got | null {
  if (typeof window === "undefined") return null;
  const b = loadDraw();
  if (!canDraw(b)) return null;

  const c = pick();
  const got: Got = {
    at: Date.now(),
    kind: c.kind,
    name: c.name,
    hanja: c.hanja,
    mark: c.mark,
    merit: c.merit,
  };

  if (c.kind === "malmun") {
    got.text = other(
      OPENERS,
      b.log.find((g) => g.kind === "malmun")?.text
    );
  }
  if (c.kind === "saying") {
    const last = b.log.find((g) => g.kind === "saying")?.text;
    const pool = SAYINGS.length > 1 && last ? SAYINGS.filter((s) => s.text !== last) : SAYINGS;
    const s = pool[Math.floor(Math.random() * pool.length)];
    got.text = s.text;
    got.by = s.name;
  }

  b.drawn += 1;
  b.log = [got, ...b.log].slice(0, 60);
  if (c.kind === "inyeon") b.boost = b.day;
  if (c.kind === "donghaeng") b.tickets += 1;
  if (c.kind === "piece") b.pieces += 1;
  save(b);

  // 공덕은 공덕 장부가 셈한다. 21·54·108 을 그대로 얹으려면 한 알(1)짜리
  // 갈래를 곱하는 수밖에 없어 염주로 넣는다 — merit.ts 에 '뽑기' 갈래가
  // 생기면 그때 갈아 끼우면 된다.
  if (got.merit) addMerit("bead", got.merit);

  return got;
}

/** 연꽃 한 송이를 치른 뒤에 부른다 — 오늘 한 장이 더 놓인다 */
export function addExtra(): boolean {
  if (typeof window === "undefined") return false;
  const b = loadDraw();
  if (!canBuyExtra(b)) return false;
  b.extra += 1;
  save(b);
  return true;
}

// ── 모은 것 ─────────────────────────────────────────────────

// 이름을 use- 로 짓지 않는다 — 리액트가 훅으로 오해해 부르는 자리를 막는다
/** 동행권 한 장을 쓴다 — 쪽지 청하기가 이 셈을 읽는다 */
export function spendTicket(): boolean {
  if (typeof window === "undefined") return false;
  const b = loadDraw();
  if (b.tickets <= 0) return false;
  b.tickets -= 1;
  save(b);
  return true;
}

export function ticketCount(): number {
  return loadDraw().tickets;
}

/** 인연패가 오늘 켜져 있는가 — 게시판이 이 표식을 읽어 맨 위로 올린다 */
export function inyeonBoostOn(): boolean {
  const b = loadDraw();
  return b.boost === b.day;
}

/** 아직 못 받은 부적 중 다음 것 — 조각이 모자라도 무엇이 올지는 보여 준다 */
export function nextCharm(): Charm | null {
  const have = loadCharms();
  return CHARMS.find((c) => !have[c.id]) ?? null;
}

/** 조각 셋을 치르고 부적 한 장을 청한다 */
export function claimCharm(): Charm | null {
  if (typeof window === "undefined") return null;
  const b = loadDraw();
  if (b.pieces < PIECES_FOR_CHARM) return null;
  const next = nextCharm();
  if (!next || !grantCharm(next.id)) return null;
  b.pieces -= PIECES_FOR_CHARM;
  save(b);
  return next;
}

// ── 자정까지 ────────────────────────────────────────────────

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

/** 그 갈래의 패가 무엇인지 한 줄 — 앞면에 적는다 */
export function sayOf(kind: CardKind): string {
  return DECK.find((c) => c.kind === kind)?.say ?? "";
}

/** 자취 한 줄 — 목록에 쓰는 짧은 말 */
export function gotLine(g: Got): string {
  if (g.kind === "merit") return `공덕 ${g.merit}`;
  if (g.kind === "saying" || g.kind === "malmun") return g.text ?? "";
  if (g.kind === "donghaeng") return "쪽지 한 번";
  if (g.kind === "piece") return "조각 하나";
  return "맨 위에 하루";
}
