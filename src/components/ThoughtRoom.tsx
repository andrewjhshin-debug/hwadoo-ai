"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 — 오간 말.
//
// 여느 AI 창은 왼쪽에서 기계가 답하고 오른쪽에서 사람이 묻는다.
// 여기는 뒤집는다. **오른쪽에서 화두가 묻고, 왼쪽에 내가 적는다.**
// 묻는 쪽이 기계가 아니라 물음이고, 답하는 쪽이 나이기 때문이다.
//
// 한 줄씩 보내면 그대로 쌓인다 — 지우거나 고칠 수 있고, 저장은 자동이다.
// 실제 저장 자리는 예전 그대로 session.notes 다(서고·관리자가 그걸 읽는다).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dayCount, loadStore, saveStore } from "@/lib/store";
import { sessionQuestion } from "@/lib/hwadu";
import { todayGuide } from "@/lib/guidance";
import {
  appendThought,
  editThought,
  parseThoughts,
  whenLabel,
  type Thought,
} from "@/lib/thoughts";
import { Banga } from "./icons";

// 화두가 없을 때 쓴 글을 잠시 맡아 두는 자리 — 어떤 경우에도 글이 사라지지 않게
const DRAFT_KEY = "hwadoo-notes-draft";

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeDraft(v: string) {
  try {
    if (v.trim()) localStorage.setItem(DRAFT_KEY, v);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경 — 화면의 글은 그대로 둔다
  }
}

export default function ThoughtRoom({
  onLeave,
  className = "",
}: {
  /** 방을 떠날 때(서랍이면 닫기) — 없으면 그냥 페이지 이동만 한다 */
  onLeave?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [guide, setGuide] = useState("");
  const [day, setDay] = useState(0);
  const [list, setList] = useState<Thought[]>([]);
  const [draft, setDraft] = useState("");
  const [hasHwadu, setHasHwadu] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [err, setErr] = useState("");
  const bottom = useRef<HTMLDivElement | null>(null);
  const box = useRef<HTMLTextAreaElement | null>(null);

  const read = useCallback(() => {
    const s = loadStore();
    setHasHwadu(!!s.current);
    setList(parseThoughts(s.current?.notes));
    setQuestion(s.current ? sessionQuestion(s.current) : "");
    if (s.current) {
      const d = dayCount(s.current);
      setDay(d);
      setGuide(todayGuide(d));
    }
    if (!s.current) setDraft((v) => v || readDraft());
  }, []);

  useEffect(() => {
    read();
    window.addEventListener("hwadoo-store-updated", read);
    return () => window.removeEventListener("hwadoo-store-updated", read);
  }, [read]);

  // 말이 늘면 아래로 따라 내려간다
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  /** 지금 저장된 글을 통째로 갈아 끼운다 */
  const write = (next: string): boolean => {
    const s = loadStore();
    if (!s.current) {
      writeDraft(draft);
      setHasHwadu(false);
      return false;
    }
    if (!saveStore({ ...s, current: { ...s.current, notes: next } })) {
      setErr("저장하지 못했습니다 — 저장 공간을 확인해 주세요.");
      return false;
    }
    setErr("");
    writeDraft("");
    setList(parseThoughts(next));
    return true;
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const s = loadStore();
    if (!s.current) {
      writeDraft(body);
      setHasHwadu(false);
      return;
    }
    if (write(appendThought(s.current.notes, body))) setDraft("");
  };

  const commitEdit = () => {
    if (editing === null) return;
    const s = loadStore();
    write(editThought(s.current?.notes, editing, editText));
    setEditing(null);
  };

  const leave = () => {
    onLeave?.();
    router.push("/");
  };

  const empty = !hasHwadu && list.length === 0;

  // ── 아직 물음이 없다 ──
  if (empty) {
    return (
      <div className={`flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-10 text-center ${className}`}>
        <div className="breathe opacity-70">
          <Banga className="h-16 w-16 text-gold-soft" />
        </div>
        <p className="mt-6 font-serif text-base font-light leading-8 text-hanji">
          방은 비어 있고, 물음이 그대를 기다립니다.
        </p>
        <button
          onClick={leave}
          className="btn-obang mt-8 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
        >
          화두를 받으러 가다
        </button>
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <style>{`
        @keyframes tr-in { from{opacity:0; transform:translateY(8px)} to{opacity:1;transform:none} }
        .tr-say { animation: tr-in .28s ease-out both }
      `}</style>

      {/* ── 오간 말 ── */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {/* 오른쪽 — 화두가 묻는다 */}
        {question && (
          <div className="tr-say flex justify-end">
            <div className="max-w-[85%]">
              <p className="mb-1.5 text-right text-[10px] tracking-[0.3em] text-gold-soft">
                話頭
              </p>
              <div className="rounded-[16px] rounded-tr-[4px] border border-gold/35 bg-gold/[0.08] px-4 py-3.5">
                <p className="whitespace-pre-line break-keep font-serif text-[15px] font-light leading-8 text-hanji">
                  {question.replace(/\n+/g, "\n")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 오른쪽 — 오늘의 참구법. 화두가 건네는 두 번째 말 */}
        {guide && (
          <div className="tr-say flex justify-end">
            <div className="max-w-[85%]">
              <div className="rounded-[16px] rounded-tr-[4px] border border-ink-3 bg-ink-2/60 px-4 py-3">
                <p className="text-[10px] tracking-[0.28em] text-gold-soft">
                  {day}일째
                </p>
                <p className="mt-1.5 break-keep text-[13px] leading-7 text-hanji-dim">
                  {guide}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 왼쪽 — 내가 적는다 */}
        {list.map((t, i) => (
          <div key={`${t.at}-${i}`} className="tr-say flex justify-start">
            <div className="max-w-[85%]">
              {editing === i ? (
                <div className="rounded-[16px] rounded-tl-[4px] border border-gold/50 bg-ink/50 p-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={Math.min(10, editText.split("\n").length + 1)}
                    className="w-full resize-none bg-transparent px-2 py-1 text-[16px] leading-8 text-hanji outline-none"
                  />
                  <div className="flex justify-end gap-2 px-1 pb-1">
                    <button
                      onClick={() => setEditing(null)}
                      className="text-[11px] text-hanji-faint transition-colors hover:text-hanji-dim"
                    >
                      그만
                    </button>
                    <button
                      onClick={commitEdit}
                      className="text-[11px] text-gold transition-opacity hover:opacity-80"
                    >
                      고침
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditing(i);
                    setEditText(t.text);
                  }}
                  className="block w-full rounded-[16px] rounded-tl-[4px] border border-ink-3 bg-ink-2/70 px-4 py-3 text-left transition-colors hover:border-gold/35"
                >
                  <p className="whitespace-pre-line break-keep text-[14.5px] leading-8 text-hanji">
                    {t.text}
                  </p>
                </button>
              )}
              <p className="mt-1 pl-1 text-[10.5px] text-hanji-faint">
                {whenLabel(t.at)}
              </p>
            </div>
          </div>
        ))}

        <div ref={bottom} />
      </div>

      {/* ── 적는 자리 ── */}
      <div className="shrink-0 border-t border-ink-3 px-4 pb-4 pt-3">
        {!hasHwadu && (
          <p className="mb-2 rounded-lg border border-vermilion/40 px-3 py-2 text-[11.5px] leading-6 text-hanji-dim">
            아직 화두가 없어 묶어 둘 곳이 없습니다. 글은 맡아 두었다가 화두를
            받으시면 그 화두의 단상으로 이어집니다.
          </p>
        )}
        {err && <p className="mb-2 text-[11px] text-vermilion">{err}</p>}
        <div className="flex items-end gap-2 rounded-[16px] border border-gold/30 bg-ink/40 px-3 py-2 focus-within:border-gold/60">
          <textarea
            ref={box}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // 줄바꿈은 Shift+Enter — 그냥 Enter 는 보낸다
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="떠오르는 것을 적어 두세요"
            aria-label="떠오르는 것을 적어 두세요"
            className="max-h-40 min-h-[34px] w-full resize-none bg-transparent py-1.5 text-[16px] leading-7 text-hanji outline-none placeholder:text-hanji-faint"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(160, el.scrollHeight)}px`;
            }}
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            aria-label="적다"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/45 text-gold transition-all hover:bg-gold/15 disabled:border-ink-3 disabled:text-hanji-faint"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
