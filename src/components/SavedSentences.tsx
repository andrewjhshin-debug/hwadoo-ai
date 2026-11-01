"use client";

import { useState, useSyncExternalStore } from "react";
import { loadStore, saveStore } from "@/lib/store";
import { changeSavedSentence, normalizeSavedSentences, sentenceKey } from "@/lib/savedSentences";

function subscribe(refresh: () => void) {
  window.addEventListener("hwadoo-store-updated", refresh);
  window.addEventListener("storage", refresh);
  return () => { window.removeEventListener("hwadoo-store-updated", refresh); window.removeEventListener("storage", refresh); };
}
function snapshot() {
  const store = loadStore();
  return JSON.stringify({ owner: store.ownerUid ?? "", items: store.savedSentences ?? [] });
}
const serverSnapshot = () => '{"items":[]}';
function useSavedSentences() {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return normalizeSavedSentences(JSON.parse(value).items);
}
function Bookmark({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 20 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 2h12v20l-6-4-6 4V2Z" strokeLinejoin="round" /></svg>;
}

export function KeepSentence({ text, source }: { text: string; source?: string | null }) {
  const items = useSavedSentences(), [error, setError] = useState("");
  const saved = items.some(item => item.key === sentenceKey(text) && !item.removed);
  return <div className="sentence-keep">
    <button type="button" aria-pressed={saved} onClick={() => {
      const current = loadStore();
      const ok = saveStore({ ...current, savedSentences: changeSavedSentence(current.savedSentences, text, source) });
      setError(ok ? "" : "저장하지 못했어요. 다시 눌러주세요.");
    }} aria-label={saved ? "간직한 문장 — 다시 누르면 취소" : "이 문장 간직하기"}><Bookmark filled={saved} /></button>
    {error && <span role="status" className="sentence-error">{error}</span>}
  </div>;
}

export function SavedSentenceList() {
  const items = useSavedSentences().filter(item => !item.removed), [error, setError] = useState("");
  return <section id="saved-sentences" className="saved-sentences" aria-labelledby="saved-sentences-title">
    <h2 id="saved-sentences-title"><Bookmark />간직한 문장 <small>{items.length}</small></h2>
    {items.length === 0 ? <p className="saved-empty">간직한 문장이 없습니다.</p> : <ul>{items.map(item => <li key={item.key}>
      <p>{item.text}</p>
      {item.source && <small>{item.source}</small>}
      <div><time dateTime={new Date(item.savedAt).toISOString()}>{new Date(item.savedAt).toLocaleDateString("ko-KR")}</time>
        <button type="button" aria-label={`${item.text} 간직 취소`} onClick={() => {
          const current = loadStore();
          if (!current.savedSentences?.some(value => value.key === item.key && !value.removed)) return;
          const ok = saveStore({ ...current, savedSentences: changeSavedSentence(current.savedSentences, item.text, item.source) });
          setError(ok ? "" : "취소하지 못했어요. 다시 눌러주세요.");
        }}>간직 취소</button></div>
    </li>)}</ul>}
    {error && <p role="status" className="sentence-error">{error}</p>}
  </section>;
}
