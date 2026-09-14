// ─────────────────────────────────────────────────────────────
// 불심 투자(佛心投資) — 삼독(三毒)으로 보는 투자하는 마음.
//
// 왜 이걸 두는가 —
// 사람들이 돈 앞에서 가장 크게 흔들린다. 그 흔들림의 이름을 불교는
// 이미 이천오백 년 전에 지어 두었다. 貪(탐)·瞋(진)·癡(치).
// 우리가 다루는 것은 값이 아니라 그 세 가지가 움직이는 자리다.
//
// 넘지 않는 선 —
// 종목·수익률·매수매도 신호·시황은 이 파일에 한 줄도 없다.
// 있으면 유사투자자문이 된다. 여기 있는 것은 마음뿐이다.
// 그래서 참회록에도 금액·종목 칸을 두지 않았다 — 적을 수 없게 해야
// 안 적는다.
//
// 공덕(merit)은 주지 않는다. 호흡 명상과 섞이면 108초가 공덕 버는
// 단추가 되어 버리고, 그러면 멈추려고 세는 게 아니라 세려고 세게 된다.
// 이 자리의 기록은 이 파일 안에서만 센다.
// ─────────────────────────────────────────────────────────────

export const TAMJINCHI_KEY = "hwadu.tamjinchi.v1";
export const TAMJINCHI_EVENT = "hwadu-tamjinchi-updated";

/** 사기 전에 세는 시간 — 백팔번뇌의 수를 초로 센다 */
export const PAUSE_SECONDS = 108;

// ── 삼독 ────────────────────────────────────────────────────

export type Poison = "tam" | "jin" | "chi";

export type PoisonMeta = {
  id: Poison;
  hanja: string;
  name: string; // 탐
  full: string; // 탐욕
  trap: string; // 이 독이 시키는 짓 — 한 마디로
  line: string; // 진단 결과 한 마디
};

export const POISONS: PoisonMeta[] = [
  {
    id: "tam",
    hanja: "貪",
    name: "탐",
    full: "탐욕",
    trap: "쫓아 사기",
    line: "탐(貪)이 셉니다. 남의 속도에 내 돈을 맞추고 있어요.",
  },
  {
    id: "jin",
    hanja: "瞋",
    name: "진",
    full: "성냄",
    trap: "되갚으려 사기",
    line: "진(瞋)이 셉니다. 시장에 화풀이를 하고 있어요.",
  },
  {
    id: "chi",
    hanja: "癡",
    name: "치",
    full: "어리석음",
    trap: "남 따라 사기",
    line: "치(癡)가 셉니다. 왜 샀는지 말 못 하면 아직 산 게 아니에요.",
  },
];

export const POISON_BY_ID: Record<Poison, PoisonMeta> = {
  tam: POISONS[0],
  jin: POISONS[1],
  chi: POISONS[2],
};

// ── 자가진단 ─────────────────────────────────────────────────
// 갈래를 섞어서 늘어놓는다 — 같은 독이 연달아 나오면 답이 한쪽으로 쏠린다.

export type Question = { poison: Poison; ask: string };

export const QUESTIONS: Question[] = [
  { poison: "tam", ask: "남이 벌었다는 말을 들으면 마음이 급해진다" },
  { poison: "jin", ask: "잃고 나면 되찾을 생각이 먼저 든다" },
  { poison: "chi", ask: "왜 샀는지 스스로 설명하지 못할 때가 있다" },
  { poison: "tam", ask: "오를 때 더 넣고 싶어 밤에 잠이 얕아진다" },
  { poison: "jin", ask: "떨어지면 화가 나서 더 사 버린다" },
  { poison: "chi", ask: "누가 좋다고 하면 알아보기 전에 먼저 산다" },
  { poison: "tam", ask: "정해 둔 만큼만 넣기로 하고도 더 넣는다" },
  { poison: "jin", ask: "손해 이야기가 나오면 남 탓이 먼저 떠오른다" },
  { poison: "chi", ask: "잠깐 볼 생각이었는데 온종일 창을 들여다본다" },
];

/** 누르는 네 자리 — 점수판을 보여 주지 않으므로 눈금은 말로만 있다 */
export const CHOICES: { score: number; label: string }[] = [
  { score: 0, label: "아니다" },
  { score: 1, label: "가끔" },
  { score: 2, label: "자주" },
  { score: 3, label: "늘" },
];

export type Verdict = { poison: Poison | null; line: string };

/**
 * 답한 것으로 지금 무엇이 센지 본다.
 * 점수는 돌려주지 않는다 — 숫자를 보여 주면 사람이 점수를 관리하기 시작한다.
 * 셋 다 잠잠하면 독을 지목하지 않는다.
 */
export function verdictOf(answers: number[]): Verdict {
  const sum: Record<Poison, number> = { tam: 0, jin: 0, chi: 0 };
  answers.forEach((v, i) => {
    const q = QUESTIONS[i];
    if (q) sum[q.poison] += v;
  });
  const top = (Object.keys(sum) as Poison[]).reduce((a, b) =>
    sum[b] > sum[a] ? b : a
  );
  // 한 갈래 최대 9점. 4점을 못 넘으면 지금은 잠잠한 것으로 본다.
  if (sum[top] < 4) {
    return {
      poison: null,
      line: "셋 다 잠잠합니다. 지금 정한 것을 적어 두세요.",
    };
  }
  return { poison: top, line: POISON_BY_ID[top].line };
}

// ── 손실 났을 때 여는 화두 ───────────────────────────────────
// 위로하지 않는다. 위로는 하루 가고 물음은 남는다.

export const LOSS_HWADU: string[] = [
  "잃은 것은 무엇이고, 잃지 않은 것은 무엇인가",
  "값이 반이 되었다. 나는 반이 되었는가",
  "오르기 전의 나와 내린 뒤의 나는 같은 사람인가",
  "이 돈이 없던 때에 나는 무엇으로 살았는가",
  "지금 아픈 것은 잃은 돈인가, 틀렸다는 사실인가",
  "놓지 못하게 붙드는 것은 값인가, 내 말인가",
];

/** 한 장 뽑는다 — 방금 본 것은 다시 주지 않는다 */
export function drawHwadu(prev: number | null = null): number {
  if (LOSS_HWADU.length < 2) return 0;
  let i = -1;
  while (i < 0 || i === prev) i = Math.floor(Math.random() * LOSS_HWADU.length);
  return i;
}

// ── 참회록(懺悔錄) ───────────────────────────────────────────
// 매매일지이되 값을 적지 않는다. 무엇을 했고 그때 어떤 독이 움직였는가.

export type Deed = "buy" | "sell" | "hold";

export const DEED_LABEL: Record<Deed, string> = {
  buy: "샀다",
  sell: "팔았다",
  hold: "참았다",
};

export type Entry = {
  id: string;
  at: number;
  deed: Deed;
  poison: Poison | null;
  text: string;
};

export type TamjinchiBook = {
  /** 108초를 끝까지 센 횟수 */
  pauses: number;
  /** 그중 세고 나서 사지 않기로 한 횟수 — 이게 이 기능이 한 일이다 */
  held: number;
  entries: Entry[];
};

const EMPTY: TamjinchiBook = { pauses: 0, held: 0, entries: [] };

// 참회록은 오래 쌓인다 — 브라우저 서랍이 터지지 않게 끊는다
const MAX_ENTRIES = 300;
export const TEXT_MAX = 140;

export function loadTamjinchi(): TamjinchiBook {
  if (typeof window === "undefined") return { ...EMPTY, entries: [] };
  try {
    const raw = window.localStorage.getItem(TAMJINCHI_KEY);
    if (!raw) return { ...EMPTY, entries: [] };
    const p = JSON.parse(raw) as Partial<TamjinchiBook>;
    const list = Array.isArray(p.entries) ? p.entries : [];
    return {
      pauses: num(p.pauses),
      held: num(p.held),
      entries: list.filter(isEntry),
    };
  } catch {
    return { ...EMPTY, entries: [] };
  }
}

function num(v: unknown): number {
  return typeof v === "number" && v > 0 ? Math.floor(v) : 0;
}

function isEntry(v: unknown): v is Entry {
  const e = v as Entry;
  return (
    !!e &&
    typeof e.id === "string" &&
    typeof e.at === "number" &&
    (e.deed === "buy" || e.deed === "sell" || e.deed === "hold") &&
    typeof e.text === "string"
  );
}

function save(b: TamjinchiBook): TamjinchiBook {
  try {
    window.localStorage.setItem(TAMJINCHI_KEY, JSON.stringify(b));
    window.dispatchEvent(new CustomEvent(TAMJINCHI_EVENT));
  } catch {
    // 못 적어도 세는 일은 이어진다
  }
  return b;
}

/** 108초를 끝까지 셌다. held 면 세고 나서 사지 않기로 한 것 */
export function notePause(held: boolean): TamjinchiBook {
  const b = loadTamjinchi();
  b.pauses += 1;
  if (held) b.held += 1;
  return save(b);
}

/** 참회록 한 줄 — 새것이 위로 온다 */
export function addEntry(
  deed: Deed,
  poison: Poison | null,
  text: string
): TamjinchiBook {
  const b = loadTamjinchi();
  b.entries.unshift({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    deed,
    poison,
    text: text.trim().slice(0, TEXT_MAX),
  });
  b.entries = b.entries.slice(0, MAX_ENTRIES);
  return save(b);
}

export function removeEntry(id: string): TamjinchiBook {
  const b = loadTamjinchi();
  b.entries = b.entries.filter((e) => e.id !== id);
  return save(b);
}

/** 목록에 적을 날짜 — 올해면 달·일까지만 */
export function dayLabel(at: number): string {
  const d = new Date(at);
  const now = new Date();
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}년 ${md}`;
}
