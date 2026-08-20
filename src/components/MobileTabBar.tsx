"use client";

// ────────────────────────────────────────────────────────────────
// 모바일 전용 — 화면 하단에 고정되는 주요 탭 5개 + 사유의 방 FAB.
// 스크롤과 무관하게 늘 같은 자리에 머문다(fixed). md 이상에서는 숨김.
// 5개 탭: 간화선 · 선지식 · 뜰(홈) · 절로 · 내 도량
// 나머지 방(체험하기·사유의 방·만다라·차 한 잔·차담회·화두 던지기·연지원)은
// 햄버거 서랍과 내 도량의 서비스 그리드에서 닿는다.
// ────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotesDrawer from "@/components/NotesDrawer";
import { useHasNews } from "@/lib/notices";
import { Dharmachakra, Person, LotusMark, Iljumun, Banga, SeonMaster } from "./icons";

const TABS = [
  { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
  { href: "/masters", label: "선지식", Icon: SeonMaster },
  { href: "/", label: "뜰", Icon: LotusMark },
  { href: "/pilgrimage", label: "절로", Icon: Iljumun },
  { href: "/settings", label: "내 도량", Icon: Person },
];

// 이 화면들은 사유의 방을 화면 안에 이미 두고 있다 —
// FAB와 서랍을 두 벌 띄우지 않도록 여기서는 접는다.
// 만다라는 색칠 공간이 좁아 떠 있는 단추가 자꾸 겹친다 — 아예 띄우지 않는다.
// 모임 게시판은 아래에 고정 댓글창이 떠서 FAB 와 겹친다 — 접는다.
const OWN_NOTES = ["/", "/room", "/try", "/mandala", "/gathering"];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNews = useHasNews(); // 새 소식 — 내 도량 탭에 점 하나

  // 사유의 방을 스스로 가진 화면에서는 FAB도 서랍도 내지 않는다
  const showNotes = !OWN_NOTES.includes(pathname);

  // 눌린 대로 그 화면을 연다 — 같은 경로여도 새로 그린다
  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    // 뜰을 누르면 — 뜰 화면에 '집으로 돌아왔다'고 알린다
    if (href === "/") window.dispatchEvent(new CustomEvent("hwadoo-nav-home"));
    if (pathname === href) router.refresh();
    else router.push(href);
  };

  return (
    <>
      {/* 오른쪽 아래 고정 — 사유의 방 FAB (탭 바 위에 뜬다) */}
      {showNotes && (
        <button
          onClick={() => setNotesOpen(true)}
          aria-label="사유의 방 열기"
          className="notes-fab btn-obang fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.5)] md:hidden"
        >
          <Banga className="h-6 w-6 text-gold-soft" />
        </button>
      )}

      {/* 하단 고정 탭 바 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-stretch border-t border-ink-3 bg-ink-2/95 backdrop-blur md:hidden">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={go(href)}
              className={`flex flex-1 flex-col items-center justify-center gap-1.5 text-[12.5px] tracking-wide transition-colors ${
                active ? "text-gold" : "text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              <span className="relative">
                <Icon className="h-[24px] w-[24px]" />
                {href === "/settings" && hasNews && (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-vermilion shadow-[0_0_6px_var(--color-vermilion)]"
                  />
                )}
              </span>
              <span className="whitespace-nowrap leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      {showNotes && (
        <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
      )}
    </>
  );
}
