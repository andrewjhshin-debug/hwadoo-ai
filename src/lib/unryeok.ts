// ─────────────────────────────────────────────────────────────
// 운력(運力) — 절에서 몸으로 한 일을 시간으로 남긴다.
// 형(2026-11-18): 「운력 기록하도록 하고」
// 스스로 적는 장부라 공덕은 붙이지 않는다(적기만 하면 공덕이 되면 장부가 아니라 단추가 된다).
// 신도증에 「운력 N시간」으로 실린다. 절 확인(QR)은 다음 단계 — 지금은 confirmed 칸만 둔다.
// 서랍 hwadu.unryeok.v1 — kvSync 가 계정에 올린다.
// ─────────────────────────────────────────────────────────────

export const UNRYEOK_KEY = "hwadu.unryeok.v1";
export const UNRYEOK_EVENT = "hwadu-unryeok";

export type Unryeok = {
  id: string;
  day: string; // YYYY-MM-DD
  temple: string;
  what: string;
  hours: number; // 0.5 단위
  confirmed?: boolean;
};

export function loadUnryeok(): Unryeok[] {
  try {
    const v = JSON.parse(localStorage.getItem(UNRYEOK_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(list: Unryeok[]) {
  try {
    localStorage.setItem(UNRYEOK_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(UNRYEOK_EVENT));
  } catch {
    /* 서랍이 막혀도 한 일은 한 일이다 */
  }
}

export function addUnryeok(e: Omit<Unryeok, "id">): Unryeok[] {
  const hours = Math.max(0.5, Math.min(12, Math.round(e.hours * 2) / 2));
  const item: Unryeok = { ...e, temple: e.temple.trim().slice(0, 30), what: e.what.trim().slice(0, 40), hours, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
  const list = [item, ...loadUnryeok()].sort((a, b) => b.day.localeCompare(a.day));
  save(list);
  return list;
}

export function removeUnryeok(id: string): Unryeok[] {
  const list = loadUnryeok().filter((u) => u.id !== id);
  save(list);
  return list;
}

export function unryeokHours(list = loadUnryeok()): number {
  return list.reduce((s, u) => s + u.hours, 0);
}
