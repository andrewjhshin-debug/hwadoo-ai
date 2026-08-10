"use client";

// ────────────────────────────────────────────────────────────────
// 모바일 전용 — 화면 하단에 고정되는 주요 탭 5개 + 사유의 방 FAB.
// 스크롤과 무관하게 늘 같은 자리에 머문다(fixed). md 이상에서는 숨김.
// 5개 탭: 간화선 · 선지식 · 내 화두 · 화두 던지기 · 연지원
// ────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotesDrawer from "@/components/NotesDrawer";
import { Dharmachakra, SeonMaster, Book, Jukbi, Lantern, Banga } from "./icons";

const TABS = [
  { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
  { href: "/masters", label: "선지식", Icon: SeonMaster },
  { href: "/archive", label: "내 화두", Icon: Book },
  { href: "/my-hwadu", label: "화두 던지기", Icon: Jukbi },
  { href: "/community", label: "연지원", Icon: Lantern },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <>
      {/* 오른쪽 아래 고정 — 사유의 방 FAB (탭 바 위에 뜬다) */}
      <button
        onClick={() => setNotesOpen(true)}
        aria-label="사유의 방 열기"
        className="btn-obang fixed bottom-[76px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.5)] md:hidden"
      >
        <Banga className="h-6 w-6 text-gold-soft" />
      </button>

      {/* 하단 고정 탭 바 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-ink-3 bg-ink-2/95 backdrop-blur md:hidden">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] tracking-wide transition-colors ${
                active ? "text-gold" : "text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              <Icon className="h-[19px] w-[19px]" />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
    </>
  );
}
