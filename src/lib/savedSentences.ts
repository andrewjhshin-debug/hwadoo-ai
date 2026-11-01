export type SavedSentence = { key: string; text: string; source?: string; savedAt: number; updatedAt: number; removed?: boolean };
export const sentenceKey = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();

export function normalizeSavedSentences(raw: unknown): SavedSentence[] {
  if (!Array.isArray(raw)) return [];
  const result = new Map<string, SavedSentence>();
  for (const value of raw) {
    if (!value || typeof value.text !== "string" || !value.text.trim() || value.text.length > 5000 || !Number.isFinite(value.updatedAt) || !Number.isFinite(value.savedAt) || value.savedAt < 0 || value.savedAt > 8.64e15 || value.updatedAt < 0 || value.updatedAt > 8.64e15) continue;
    const item: SavedSentence = { key: sentenceKey(value.text), text: value.text.trim(), savedAt: value.savedAt, updatedAt: value.updatedAt };
    if (typeof value.source === "string" && value.source.trim()) item.source = value.source.trim().slice(0, 1000);
    if (value.removed === true) item.removed = true;
    const old = result.get(item.key);
    if (!old || item.updatedAt > old.updatedAt || (item.updatedAt === old.updatedAt && item.removed)) result.set(item.key, item);
  }
  return [...result.values()].sort((a, b) => b.savedAt - a.savedAt);
}

/** Removal markers prevent an older device from reviving a removed bookmark. */
export function mergeSavedSentences(a: unknown, b: unknown): SavedSentence[] {
  return normalizeSavedSentences([...normalizeSavedSentences(a), ...normalizeSavedSentences(b)]);
}

export function changeSavedSentence(current: unknown, text: string, source?: string | null, now = Date.now()): SavedSentence[] {
  const list = normalizeSavedSentences(current), key = sentenceKey(text), old = list.find(item => item.key === key);
  const item: SavedSentence = { key, text: text.trim(), savedAt: now, updatedAt: Math.max(now, (old?.updatedAt ?? 0) + 1) };
  if (source?.trim()) item.source = source.trim();
  if (old && !old.removed) item.removed = true;
  return normalizeSavedSentences([...list.filter(value => value.key !== key), item]);
}
