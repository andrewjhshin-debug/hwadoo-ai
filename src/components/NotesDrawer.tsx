"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 서랍 — 화두를 화면에 둔 채, 오른쪽에서 열리는 메모장.
// 떠오르는 것을 적으면 지금 들고 있는 화두에 자동으로 저장된다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { loadStore, saveStore } from "@/lib/store";
import { Banga } from "./icons";

export default function NotesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 열릴 때마다 최신 단상을 불러온다
  useEffect(() => {
    if (open) {
      setNotes(loadStore().current?.notes ?? "");
      setSaved(false);
    }
  }, [open]);

  const onChange = (value: string) => {
    setNotes(value);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const latest = loadStore();
      if (!latest.current) return;
      saveStore({
        ...latest,
        current: { ...latest.current, notes: value },
      });
      setSaved(true);
    }, 600);
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
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ink-3 bg-ink-2/95 backdrop-blur transition-transform duration-300 sm:w-[360px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-ink-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <Banga className="h-6 w-6 text-gold-soft" />
            <div>
              <p className="text-[10px] tracking-[0.4em] text-hanji-faint">
                思惟之房
              </p>
              <h2 className="text-sm tracking-[0.2em] text-hanji">
                사유의 방
              </h2>
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

        <div className="flex flex-1 flex-col px-6 py-5">
          <p className="text-xs leading-6 text-hanji-faint">
            떠오르는 것을 적어 두십시오. 답이 아니라 발자국입니다.
          </p>
          <textarea
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            placeholder="오늘 문득 —"
            className="journal-area mt-4 flex-1"
          />
          <p className="mt-3 text-right text-[11px] text-hanji-faint">
            {saved ? "저절로 저장되었습니다" : "쓰는 대로 저장됩니다"}
          </p>
        </div>
      </aside>
    </>
  );
}
