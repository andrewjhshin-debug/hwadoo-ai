"use client";

// ────────────────────────────────────────────────────────────────
// 사유의 방 — 데스크톱 오른쪽 아래에 떠 있는 작은 단추.
// 왼쪽 탭에서 내린 자리를 대신한다. 손안에서는 아래 띠와 그 위의 FAB가
// 이미 자리를 먹으므로 md 아래에서는 내지 않는다.
// 열고 닫는 상태만 여기서 쥐고, 방 안의 일은 NotesDrawer 가 맡는다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import NotesDrawer from "@/components/NotesDrawer";
import { Banga } from "@/components/icons";
import { loadStore } from "@/lib/store";

export default function NotesFab({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  // 화두가 없으면 단추를 흐리게 둔다. 서랍은 그대로 열린다 — 빈 방은 안에서 보인다.
  // 첫 그림은 흐리지 않게(false) 두어 서버와 어긋나지 않게 한다(하이드레이션).
  const [dim, setDim] = useState(false);

  useEffect(() => {
    const read = () => setDim(!loadStore().current);
    read();
    // 화두를 받거나 놓으면 곧바로 따라 밝아지고 흐려진다
    window.addEventListener("hwadoo-store-updated", read);
    return () => window.removeEventListener("hwadoo-store-updated", read);
  }, []);

  return (
    <>
      {/* notes-fab — 답을 쓰는 동안·만다라를 칠하는 동안 스스로 접히고,
          설치 배너가 뜨면 그 위로 올라선다(globals.css 가 쥐고 있다) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="사유의 방"
        title="사유의 방"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`notes-fab fixed bottom-8 right-8 z-40 hidden h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-ink-2/90 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 active:translate-y-0 active:scale-95 md:flex ${
          dim ? "opacity-50 hover:opacity-100" : ""
        } ${className}`}
      >
        <Banga className="h-[22px] w-[22px] text-gold-soft" />
      </button>

      <NotesDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
