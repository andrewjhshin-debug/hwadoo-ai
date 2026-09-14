"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 서랍 — 화두를 화면에 둔 채 오른쪽에서 열린다.
// 방 안의 일(오간 말·저장)은 ThoughtRoom 이 전부 맡는다. 여기는 문틀이다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ThoughtRoom from "./ThoughtRoom";
import { Banga } from "./icons";

export default function NotesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  // 열려 있을 때 뒤로가기는 서랍만 닫는다 — 페이지를 벗어나지 않게
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ notes: true }, "");
    const onPop = () => closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.notes) window.history.back();
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:bg-black/30 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`notes-panel fixed z-50 flex flex-col overflow-hidden bg-ink-2/95 backdrop-blur transition-all duration-300
          inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] top-3 rounded-2xl
          md:inset-x-auto md:inset-y-0 md:bottom-0 md:right-0 md:top-0 md:w-[420px] md:rounded-none
          ${
            open
              ? "scale-100 opacity-100 md:translate-x-0"
              : "pointer-events-none scale-95 opacity-0 md:translate-x-full md:scale-100 md:opacity-100"
          }`}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-ink-3 px-5 py-4">
          <button
            onClick={() => {
              onClose();
              router.push("/room");
            }}
            aria-label="사유의 방 크게 보기"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Banga className="h-6 w-6 text-gold-soft" />
            <div className="text-left">
              <p className="text-[10px] tracking-[0.4em] text-hanji-faint">思惟之房</p>
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

        {open && <ThoughtRoom onLeave={onClose} />}
      </aside>
    </>
  );
}
