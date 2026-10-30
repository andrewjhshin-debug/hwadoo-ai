export const DECISIONS_KEY = "hwadu.investment.decisions.v2";
export const DECISION_DRAFT_KEY = "hwadu.investment.draft.v2";
export const DECISION_LIMIT = 500;
export const ACTIONS = { buy: "매수하려고", sell: "매도하려고", wait: "지켜보려고" } as const;
export const ACTUAL_ACTIONS = { buy: "샀다", sell: "팔았다", wait: "아무것도 하지 않았다" } as const;
export const MOODS = { rush: "놓칠까 조급해", recover: "잃은 걸 만회하고 싶어", noise: "남의 말에 흔들려", calm: "차분하게 판단 중" } as const;
export type DecisionAction = keyof typeof ACTIONS;
export type DecisionMood = keyof typeof MOODS;
export type DecisionDraft = { name: string; action: DecisionAction; mood: DecisionMood; intensity: number; reason: string; invalidation: string; delay: number; pauseUntil: number };
export type DecisionReview = { at: number; action: DecisionAction; rules: "yes" | "partly" | "no"; intensity: number; note: string };
export type Decision = { id: string; at: number; revisitAt: number; name: string; action: DecisionAction; mood: DecisionMood; intensity: number; reason: string; invalidation: string; principles: string[]; pauseSeconds: number; review: DecisionReview | null };
export type DecisionBook = { version: 2; records: Decision[] };
export const EMPTY_DECISION_BOOK: DecisionBook = { version: 2, records: [] };
export const DEFAULT_DECISION_DRAFT: DecisionDraft = { name: "", action: "buy", mood: "rush", intensity: 5, reason: "", invalidation: "", delay: 86400000, pauseUntil: 0 };
export type DecisionStorage = Pick<Storage, "getItem" | "setItem">;
const actions = new Set(Object.keys(ACTIONS)), moods = new Set(Object.keys(MOODS));
const score = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 10;
const time = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;
const str = (x: unknown, n: number): x is string => typeof x === "string" && x.length <= n;
function action(x: unknown): x is DecisionAction { return typeof x === "string" && actions.has(x); }
function mood(x: unknown): x is DecisionMood { return typeof x === "string" && moods.has(x); }
export function normalizeDecisionDraft(value: unknown): DecisionDraft {
  const p = value && typeof value === "object" ? value as Partial<DecisionDraft> : {};
  return { name: typeof p.name === "string" ? p.name.slice(0, 60) : "", reason: typeof p.reason === "string" ? p.reason.slice(0, 500) : "", invalidation: typeof p.invalidation === "string" ? p.invalidation.slice(0, 500) : "", action: action(p.action) ? p.action : "buy", mood: mood(p.mood) ? p.mood : "rush", intensity: score(p.intensity) ? p.intensity : 5, delay: [3600000, 86400000, 604800000].includes(p.delay ?? 0) ? p.delay! : 86400000, pauseUntil: typeof p.pauseUntil === "number" && Number.isFinite(p.pauseUntil) && p.pauseUntil > 0 ? Math.min(p.pauseUntil, Date.now() + 108000) : 0 };
}
function parseReview(value: unknown): DecisionReview | null {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new Error("돌아보기 기록 형식이 맞지 않아요.");
  const p = value as DecisionReview;
  if (!time(p.at) || !action(p.action) || !["yes", "partly", "no"].includes(p.rules) || !score(p.intensity) || !str(p.note, 600)) throw new Error("돌아보기 기록 형식이 맞지 않아요.");
  return { at: p.at, action: p.action, rules: p.rules, intensity: p.intensity, note: p.note };
}
export function parseDecisionBook(value: unknown): DecisionBook {
  if (!value || typeof value !== "object") throw new Error("불심투자 백업 파일이 아니에요.");
  const p = value as DecisionBook;
  if (p.version !== 2 || !Array.isArray(p.records) || p.records.length > DECISION_LIMIT) throw new Error("지원하지 않는 백업 형식이거나 기록이 너무 많아요.");
  const ids = new Set<string>();
  const records = p.records.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("판단 기록 형식이 맞지 않아요.");
    const r = raw as Decision;
    if (!str(r.id, 80) || !/^[a-zA-Z0-9_-]+$/.test(r.id) || ids.has(r.id) || !time(r.at) || !time(r.revisitAt) || r.revisitAt < r.at || !str(r.name, 60) || !action(r.action) || !mood(r.mood) || !score(r.intensity) || !str(r.reason, 500) || !r.reason.trim() || !str(r.invalidation, 500) || !r.invalidation.trim() || !Array.isArray(r.principles) || r.principles.length > 3 || !r.principles.every(s => str(s, 80)) || ![0, 108].includes(r.pauseSeconds)) throw new Error("판단 기록 형식이 맞지 않아요.");
    ids.add(r.id);
    const review = parseReview(r.review);
    if (review && review.at < r.at) throw new Error("돌아보기 시각이 원래 기록보다 빨라요.");
    return { id: r.id, at: r.at, revisitAt: r.revisitAt, name: r.name, action: r.action, mood: r.mood, intensity: r.intensity, reason: r.reason, invalidation: r.invalidation, principles: r.principles.slice(), pauseSeconds: r.pauseSeconds, review };
  });
  return { version: 2, records: records.sort((a, b) => b.at - a.at) };
}
export function readDecisionBook(storage: DecisionStorage = localStorage): DecisionBook {
  let raw: string | null;
  try { raw = storage.getItem(DECISIONS_KEY); }
  catch { throw new Error("이 브라우저의 저장 공간을 읽을 수 없어요. 개인정보 보호 설정을 확인해 주세요."); }
  if (!raw) return { version: 2, records: [] };
  try { return parseDecisionBook(JSON.parse(raw)); }
  catch { throw new Error("저장된 새 판단 기록을 읽지 못했어요. 기존 데이터는 덮어쓰지 않았어요."); }
}
export function writeDecisionBook(book: DecisionBook, storage: DecisionStorage = localStorage) {
  const checked = parseDecisionBook(book);
  try { storage.setItem(DECISIONS_KEY, JSON.stringify(checked)); }
  catch { throw new Error("저장 공간이 부족하거나 차단되어 기록을 저장하지 못했어요. 입력한 내용은 화면에 남아 있어요."); }
  return checked;
}
export function makeDecision(input: DecisionDraft, principles: readonly string[], now = Date.now(), id = globalThis.crypto?.randomUUID?.() ?? `${now.toString(36)}-${Math.random().toString(36).slice(2)}`): Decision {
  const d = normalizeDecisionDraft(input);
  const record: Decision = { id, at: now, revisitAt: now + d.delay, name: d.name.trim(), action: d.action, mood: d.mood, intensity: d.intensity, reason: d.reason.trim(), invalidation: d.invalidation.trim(), principles: principles.slice(0, 3).map(s => s.trim().slice(0, 80)), pauseSeconds: d.pauseUntil > 0 && d.pauseUntil <= now ? 108 : 0, review: null };
  return parseDecisionBook({ version: 2, records: [record] }).records[0];
}
export function addDecision(book: DecisionBook, record: Decision): DecisionBook {
  if (book.records.length >= DECISION_LIMIT) throw new Error("기록이 500개예요. 먼저 백업하고 필요 없는 기록을 정리해 주세요.");
  return parseDecisionBook({ version: 2, records: [record, ...book.records] });
}
export function reviewDecision(book: DecisionBook, id: string, review: DecisionReview): DecisionBook {
  if (!book.records.some(r => r.id === id)) throw new Error("돌아볼 기록을 찾지 못했어요.");
  return parseDecisionBook({ version: 2, records: book.records.map(r => r.id === id ? { ...r, review } : r) });
}
export function mergeDecisionBackup(book: DecisionBook, imported: unknown): DecisionBook {
  const checked = parseDecisionBook(imported), ids = new Set(book.records.map(r => r.id));
  const records = [...book.records, ...checked.records.filter(r => !ids.has(r.id))];
  return parseDecisionBook({ version: 2, records });
}
export function decisionStats(book: DecisionBook, now: number) {
  const records = book.records.filter(r => r.at <= now), reviewed = records.filter(r => r.review && r.review.at <= now);
  const kept = reviewed.filter(r => r.review!.rules === "yes").length;
  const last = records.slice(0, 10).reverse();
  return { count: records.length, pending: records.filter(r => !r.review).length, due: records.filter(r => !r.review && r.revisitAt <= now).length, reviewed: reviewed.length, kept, keptRate: reviewed.length ? Math.round(kept / reviewed.length * 100) : null, last };
}
