"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 서랍 — 화두를 화면에 둔 채, 오른쪽에서 열리는 메모장.
// 맨 위에 지금 든 화두가 적히고, 메모는 그 화두에 묶여 자동 저장된다.
// /room 페이지의 단상과 같은 곳에 저장되어 실시간으로 오간다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { loadStore, saveStore } from "@/lib/store";
import { sessionQuestion, sessionTitle } from "@/lib/hwadu";
import { Banga } from "./icons";

export default function NotesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [question, setQuestion] = useState("");
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 열릴 때 최신 화두·단상을 불러온다
  useEffect(() => {
    if (open) {
      const s = loadStore();
      setNotes(s.current?.notes ?? "");
      setQuestion(s.current ? sessionQuestion(s.current) : "");
      setTitle(s.current ? sessionTitle(s.current) : "");
      setSaved(false);
    }
  }, [open]);

  // 다른 곳(/room 등)에서 단상이 바뀌면 서랍도 따라 갱신
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      const latest = loadStore().current?.notes ?? "";
      setNotes((cur) => (cur === latest ? cur : latest));
    };
    window.addEventListener("hwadoo-store-updated", sync);
    return () => window.removeEventListener("hwadoo-store-updated", sync);
  }, [open]);

  const persist = (value: string) => {
    const latest = loadStore();
    if (!latest.current) return;
    saveStore({ ...latest, current: { ...latest.current, notes: value } });
    setSaved(true);
  };

  const onChange = (value: string) => {
    setNotes(value);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(value), 600);
  };

  const saveNow = () => {
    if (timer.current) clearTimeout(timer.current);
    persist(notes);
  };

  return (
    <>
      {/* 모바일에서만 배경 가림막 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ink-3 bg-ink-2/95 backdrop-blur transition-transform duration-300 sm:w-[380px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between border-b border-ink-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <Banga className="h-6 w-6 text-gold-soft" />
            <div>
              <p className="text-[10px] tracking-[0.4em] text-hanji-faint">
                思惟之房
              </p>
              <h2 className="text-sm tracking-[0.2em] text-hanji">사유의 방</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-2 text-hanji-dim transition-colors hover:text-hanji"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {/* 지금 든 화두 — 맨 위에 */}
        {question && (
          <div className="border-b border-ink-3 px-6 py-4">
            <p className="text-[10px] tracking-[0.3em] text-hanji-faint">
              지금의 화두
            </p>
            <p className="mt-2 whitespace-pre-line font-serif text-sm font-light leading-7 text-hanji">
              {question.replace(/\n+/g, " ")}
            </p>
          </div>
        )}

        <div className="flex flex-1 flex-col px-6 py-5">
          <p className="text-xs leading-6 text-hanji-faint">
            떠오르는 것을 적어 두십시오. 답이 아니라 발자국입니다.
            {title && (
              <>
                <br />이 단상은 「{title}」에 묶여 남습니다.
              </>
            )}
          </p>
          <textarea
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            placeholder="오늘 문득 —"
            className="journal-area mt-4 flex-1"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-hanji-faint">
              {saved ? "저장되었습니다" : "쓰는 대로 저절로 저장됩니다"}
            </span>
            <button
              onClick={saveNow}
              className="border border-ink-3 px-4 py-1.5 text-[11px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              임시 저장
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
