"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 서랍 — 화두를 화면에 둔 채, 오른쪽에서 열리는 메모장.
// 맨 위에 지금 든 화두가 적히고, 메모는 그 화두에 묶여 자동 저장된다.
// /room 페이지의 단상과 같은 곳에 저장되어 실시간으로 오간다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  // 열려 있을 때 뒤로가기(back)를 누르면 서랍만 닫는다 — 페이지를 벗어나지 않게
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ notes: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // 코드로 닫힌 경우, 우리가 쌓아 둔 히스토리 항목을 되돌린다
      if (window.history.state?.notes) window.history.back();
    };
  }, [open, onClose]);

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
      {/* 배경 가림막 — 모바일은 팝업 뒤 딤, 데스크톱은 서랍 뒤 옅은 딤 */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 sm:bg-black/30 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`notes-panel fixed z-50 flex flex-col overflow-hidden bg-ink-2/95 backdrop-blur transition-all duration-300
          /* 모바일 — 화면 가운데 팝업 카드 */
          inset-x-4 top-1/2 max-h-[82vh] -translate-y-1/2 rounded-2xl
          /* 데스크톱 — 오른쪽 전체 높이 서랍 */
          sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:top-0 sm:max-h-none sm:w-[380px] sm:translate-y-0 sm:rounded-none
          ${
            open
              ? "scale-100 opacity-100 sm:translate-x-0"
              : "pointer-events-none scale-95 opacity-0 sm:translate-x-full sm:scale-100 sm:opacity-100"
          }`}
      >
        <header className="flex items-start justify-between border-b border-ink-3 px-6 py-5">
          <button
            onClick={() => {
              onClose();
              router.push("/");
            }}
            aria-label="뜰로"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Banga className="h-6 w-6 text-gold-soft" />
            <div className="text-left">
              <p className="text-[10px] tracking-[0.4em] text-hanji-faint">
                思惟之房
              </p>
              <h2 className="text-sm tracking-[0.2em] text-hanji">사유의 방</h2>
            </div>
          </button>
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

        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
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
            className="journal-area mt-4 h-[30vh] min-h-[150px]"
          />
          <div className="mt-3 flex items-center justify-end gap-3">
            {saved && (
              <span className="text-[11px] text-hanji-faint">저장되었습니다</span>
            )}
            <button
              onClick={saveNow}
              className="border border-ink-3 px-5 py-2 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              저장
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
