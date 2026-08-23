// ─────────────────────────────────────────────────────────────
// 비움 일기 — 무지출·무소유·무집착·무살생, 하루 하나씩 체크하는
// 아주 작은 달력. 발자국 장부(VisitLedger)·명상 장부(meditation)와
// 같은 결 — 브라우저 서랍에 조용히 적어 두고, 내 도량의 이달의 마음이
// 이걸 읽어 그래프로 보여 준다.
// ─────────────────────────────────────────────────────────────

export type EmptyingKind = "nospend" | "nopossess" | "noattach" | "nokill";

export const EMPTYING_KINDS: { key: EmptyingKind; hanja: string; name: string }[] = [
  { key: "nospend", hanja: "無支出", name: "무지출" },
  { key: "nopossess", hanja: "無所有", name: "무소유" },
  { key: "noattach", hanja: "無執着", name: "무집착" },
  { key: "nokill", hanja: "無殺生", name: "무살생" },
];

export const EMPTYING_KEY = "hwadu.emptying.v1";

// 날짜("YYYY-MM-DD") -> 그날 실천한 갈래들
type Log = Record<string, EmptyingKind[]>;

function load(): Log {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EMPTYING_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Log) : {};
  } catch {
    return {};
  }
}

function save(log: Log) {
  try {
    window.localStorage.setItem(EMPTYING_KEY, JSON.stringify(log));
  } catch {
    // 못 적어도 화면 상태로는 그대로 보인다
  }
}

// 그날 이 갈래를 실천했는지
export function isEmptyingChecked(day: string, kind: EmptyingKind): boolean {
  return (load()[day] ?? []).includes(kind);
}

// 켜고 끄기 — 다시 누르면 거둔다. 바뀐 장부를 그대로 돌려준다.
export function toggleEmptying(day: string, kind: EmptyingKind): Log {
  const log = load();
  const today = new Set(log[day] ?? []);
  if (today.has(kind)) today.delete(kind);
  else today.add(kind);
  const next: Log = { ...log };
  if (today.size === 0) delete next[day];
  else next[day] = [...today];
  save(next);
  return next;
}

export function loadEmptyingLog(): Log {
  return load();
}

// 구간 [fromDay, toDay] 안에서, 하루라도 무언가 비운 날의 수 — 날짜별 셈에 쓴다
export function emptyingCountByDay(days: string[]): number[] {
  const log = load();
  return days.map((d) => (log[d] ?? []).length > 0 ? 1 : 0);
}

// 장부 비우기 — 계정이 바뀔 때 부른다
export function resetEmptying() {
  try {
    window.localStorage.removeItem(EMPTYING_KEY);
  } catch {
    // 못 지워도 지장 없도록
  }
}
