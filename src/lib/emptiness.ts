// ─────────────────────────────────────────────────────────────
// 비움(空) 장부 — 무지출 · 무소유 · 무집착 · 무살생.
//
// 왜 점수가 아니라 일기인가 —
// 비움은 모으는 일이 아니다. 숫자가 올라가는 맛을 붙이면
// 덜어내려고 앉은 자리에서 다시 쌓게 된다. 그래서 여기서는
// 공덕을 주지 않는다. 대신 지난 날을 되볼 수 있게만 한다.
//
// 네 갈래는 손이 다르다 —
//  · 도장(stamp) — 무지출 · 무살생. 그런 날이었는가 아닌가, 예/아니오.
//  · 한 줄(note) — 무소유 · 무집착. 무엇을 놓았는지 적어야 남는다.
//
// 날짜는 "YYYY-MM-DD" 한 줄로 적는다. 발자국 장부와 같은 꼴이되
// VisitLedger 를 끌어오지 않는다 — 그 파일은 푸시·설치 모듈까지
// 딸려 오므로, 이 가벼운 장부가 짊어질 짐이 아니다.
// ─────────────────────────────────────────────────────────────

export const EMPTY_KEY = "hwadu.empty.v1";
export const EMPTY_EVENT = "hwadu-empty-updated";

/** 넘치면 오래된 것부터 버린다 — 일기는 최근이 쓸모 있다 */
const MAX_ENTRIES = 800;

/** 한 줄은 한 줄이다 — 길면 일기가 아니라 글이 된다 */
export const NOTE_MAX = 60;

// 무소유·무집착은 뺐다 — 매일 한 줄씩 적게 하면 아무도 안 적는다.
// 도장 둘만 남긴다. 누르기만 하면 되는 것이라야 매일 한다.
export type EmptyKind = "jichul" | "salsaeng";

/** 도장은 누르면 끝, 한 줄은 적어야 남는다 */
export type EmptyMode = "stamp" | "note";

export type Emptiness = {
  id: EmptyKind;
  name: string; // 무지출
  hanja: string; // 無支出
  mark: string; // 뱃지에 새길 한 글자
  mode: EmptyMode;
  ask: string; // 오늘 물어보는 한 줄
  act: string; // 누르는 자리에 적히는 말
  done: string; // 하고 난 뒤의 말
  unit: string; // 숫자 옆에 붙는 말
};

export const EMPTINESSES: Emptiness[] = [
  {
    id: "jichul",
    name: "무지출",
    hanja: "無支出",
    mark: "支",
    mode: "stamp",
    ask: "오늘 한 푼도 안 썼나요.",
    act: "안 썼어요",
    done: "안 쓴 날",
    unit: "일 이어 옴",
  },
  {
    id: "salsaeng",
    name: "무살생",
    hanja: "無殺生",
    mark: "生",
    mode: "stamp",
    ask: "오늘 고기를 안 먹었나요.",
    act: "안 먹었어요",
    done: "절밥 같은 날",
    unit: "일 이번 달",
  },
];

export const EMPTY_BY_ID: Record<EmptyKind, Emptiness> = Object.fromEntries(
  EMPTINESSES.map((e) => [e.id, e])
) as Record<EmptyKind, Emptiness>;

const VALID = new Set<string>(EMPTINESSES.map((e) => e.id));

/** 장부 한 줄 — 도장은 note 가 빈 칸이다 */
export type EmptyEntry = {
  day: string; // "YYYY-MM-DD"
  kind: EmptyKind;
  note: string;
  at?: number; // 적은 시각 — 같은 날 안에서 차례를 세울 때만 쓴다
};

// ── 날짜 ────────────────────────────────────────────────────

/** 그 시각의 로컬 날짜를 "YYYY-MM-DD" 꼴로 */
export function emptyDayKey(t: number = Date.now()): string {
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 그 해 그 달 그 날의 열쇠 — month 는 사람이 세는 1~12 */
export function dayKeyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dayBefore(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() - 1);
  return emptyDayKey(t.getTime());
}

/** 그 달이 며칠까지 있는가 — month 는 1~12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── 장부 ────────────────────────────────────────────────────

export function loadEmpty(): EmptyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EMPTY_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is EmptyEntry =>
        !!v &&
        typeof v === "object" &&
        typeof v.day === "string" &&
        VALID.has(v.kind) &&
        typeof v.note === "string"
    );
  } catch {
    return [];
  }
}

function save(list: EmptyEntry[]) {
  try {
    window.localStorage.setItem(
      EMPTY_KEY,
      JSON.stringify(list.slice(-MAX_ENTRIES))
    );
    window.dispatchEvent(new CustomEvent(EMPTY_EVENT));
  } catch {
    // 못 적어도 비움은 이미 했다
  }
}

/**
 * 한 줄 적는다(무소유·무집착). 빈 칸이면 아무 일도 없다 —
 * 무엇을 놓았는지 없이 놓았다고만 하는 것은 기록이 아니다.
 */
export function noteEmpty(
  kind: EmptyKind,
  note: string,
  day: string = emptyDayKey()
): boolean {
  if (typeof window === "undefined") return false;
  const text = note.trim().slice(0, NOTE_MAX);
  if (!text) return false;
  const list = loadEmpty();
  list.push({ day, kind, note: text, at: Date.now() });
  save(list);
  return true;
}

/** 도장이 찍혀 있는가 */
export function hasStamp(
  kind: EmptyKind,
  day: string = emptyDayKey(),
  list: EmptyEntry[] = loadEmpty()
): boolean {
  return list.some((e) => e.kind === kind && e.day === day);
}

/**
 * 도장을 찍거나 지운다(무지출·무살생). 지운 자리가 남는다 —
 * 잘못 누른 것을 못 지우면 일기가 아니라 성적표가 된다.
 * 오지 않은 날에는 찍을 수 없다.
 */
export function toggleStamp(
  kind: EmptyKind,
  day: string = emptyDayKey()
): boolean {
  if (typeof window === "undefined") return false;
  if (day > emptyDayKey()) return false; // 내일 일은 내일 안다
  const list = loadEmpty();
  const on = list.some((e) => e.kind === kind && e.day === day);
  const next = on
    ? list.filter((e) => !(e.kind === kind && e.day === day))
    : [...list, { day, kind, note: "", at: Date.now() }];
  save(next);
  return !on;
}

/** 한 줄을 지운다 — 같은 글이 여럿이면 그날 마지막 것 하나만 */
export function eraseEmpty(kind: EmptyKind, day: string, note: string) {
  if (typeof window === "undefined") return;
  const list = loadEmpty();
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.kind === kind && e.day === day && e.note === note) {
      list.splice(i, 1);
      break;
    }
  }
  save(list);
}

/** 그날 그 갈래로 적은 것들 — 적은 차례대로 */
export function entriesOf(
  kind: EmptyKind,
  day: string = emptyDayKey(),
  list: EmptyEntry[] = loadEmpty()
): EmptyEntry[] {
  return list.filter((e) => e.kind === kind && e.day === day);
}

/** 지난 것 — 최근 날부터, 날짜별로 묶어서 */
export function recentDays(
  limit = 12,
  list: EmptyEntry[] = loadEmpty()
): { day: string; entries: EmptyEntry[] }[] {
  const by = new Map<string, EmptyEntry[]>();
  for (const e of list) {
    const arr = by.get(e.day);
    if (arr) arr.push(e);
    else by.set(e.day, [e]);
  }
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, limit)
    .map(([day, entries]) => ({ day, entries }));
}

// ── 셈 ──────────────────────────────────────────────────────

/**
 * 며칠째 이어 왔는가. 오늘 적었으면 오늘부터, 아직이면 어제부터 센다
 * (아직 안 적은 날 때문에 어제까지의 걸음이 0으로 보이면 야박하다).
 */
export function streakOf(
  kind: EmptyKind,
  list: EmptyEntry[] = loadEmpty()
): number {
  const set = new Set(list.filter((e) => e.kind === kind).map((e) => e.day));
  const today = emptyDayKey();
  let cur = set.has(today) ? today : dayBefore(today);
  if (!set.has(cur)) return 0;
  let n = 0;
  while (set.has(cur)) {
    n++;
    cur = dayBefore(cur);
  }
  return n;
}

/** 이번 달에 몇 번 — 갈래를 안 주면 네 갈래 모두 */
export function countInMonth(
  year: number,
  month: number,
  kind?: EmptyKind,
  list: EmptyEntry[] = loadEmpty()
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return list.filter(
    (e) => e.day.startsWith(prefix) && (!kind || e.kind === kind)
  ).length;
}

/** 이번 달에 무언가 비운 날이 며칠인가 — 날 수로 센다(횟수가 아니라) */
export function daysTouchedInMonth(
  year: number,
  month: number,
  kind?: EmptyKind,
  list: EmptyEntry[] = loadEmpty()
): number {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const set = new Set(
    list
      .filter((e) => e.day.startsWith(prefix) && (!kind || e.kind === kind))
      .map((e) => e.day)
  );
  return set.size;
}

/**
 * 달력·그래프에 물릴 한 달치 — month 는 사람이 세는 1~12.
 * 그 달의 1일부터 말일까지 빠짐없이 돌려준다(빈 날은 count 0).
 * 갈래를 주면 그 갈래만, 안 주면 네 갈래를 합쳐 센다.
 *
 * 내 도량의 그래프가 이 함수를 그대로 읽는다.
 */
export function monthlyEmptiness(
  year: number,
  month: number,
  kind?: EmptyKind,
  list: EmptyEntry[] = loadEmpty()
): { day: number; count: number }[] {
  const last = daysInMonth(year, month);
  const tally = new Array<number>(last + 1).fill(0);
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  for (const e of list) {
    if (!e.day.startsWith(prefix)) continue;
    if (kind && e.kind !== kind) continue;
    const d = Number(e.day.slice(8, 10));
    if (d >= 1 && d <= last) tally[d]++;
  }
  return Array.from({ length: last }, (_, i) => ({
    day: i + 1,
    count: tally[i + 1],
  }));
}

/** 장부 비우기 — 계정이 바뀔 때. 앞사람의 일기가 새지 않도록 */
export function resetEmptiness() {
  try {
    window.localStorage.removeItem(EMPTY_KEY);
    window.dispatchEvent(new CustomEvent(EMPTY_EVENT));
  } catch {
    // 못 지워도 수행에 지장이 없도록
  }
}
