"use client";

// 왼쪽 탭 — 시안의 사이드바.
// 새 화두 받기 / 메뉴 / 지난 화두 / 로그인(준비 중)
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadStore, type Session } from "@/lib/store";
import { sessionTitle } from "@/lib/hwadu";
import {
  Book,
  Brush,
  Dharmachakra,
  Lotus,
  People,
  Person,
  Question,
  Quote,
  Toss,
} from "./icons";

const NAV = [
  { href: "/ganhwaseon", label: "간화선이란?", Icon: Question },
  { href: "/masters", label: "선지식의 한마디", Icon: Quote },
  { href: "/room", label: "사유의 방", Icon: Brush },
  { href: "/my-hwadu", label: "내가 던지는 화두", Icon: Toss },
  { href: "/community", label: "커뮤니티", Icon: People, badge: "곧" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // 모바일 서랍
  const [history, setHistory] = useState<Session[]>([]);
  const [loginNote, setLoginNote] = useState(false);

  useEffect(() => {
    const refresh = () => setHistory([...loadStore().history].reverse());
    refresh();
    window.addEventListener("hwadoo-store-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hwadoo-store-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // 페이지를 이동하면 모바일 서랍을 닫는다
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-ink-3 bg-ink-2/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Dharmachakra className="h-5 w-5" stroke="#D9B45B" />
          <span className="text-gold-grad font-serif text-base font-semibold tracking-[0.35em]">
            화두
          </span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          aria-label="메뉴 열기"
          className="p-2 text-hanji-dim"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 배경 가림막 */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col border-r border-ink-3 bg-ink-2 px-4 pb-4 pt-[4.5rem] transition-transform duration-300 md:static md:z-auto md:translate-x-0 md:pt-6 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 브랜드 */}
        <Link href="/" className="mb-5 hidden items-center gap-2.5 px-2 md:flex">
          <Dharmachakra className="h-[26px] w-[26px]" stroke="#D9B45B" />
          <span className="text-gold-grad font-serif text-lg font-semibold tracking-[0.35em]">
            화두
          </span>
        </Link>

        {/* 새 화두 받기 */}
        <Link
          href="/"
          className="btn-obang flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-hanji transition-opacity hover:opacity-90"
        >
          <Lotus className="h-[17px] w-[17px]" stroke="#D9B45B" />새 화두 받기
        </Link>

        {/* 메뉴 */}
        <nav className="mt-6 flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13.5px] transition-colors ${
                pathname === href
                  ? "bg-gold/10 text-hanji"
                  : "text-hanji-dim hover:bg-gold/5 hover:text-hanji"
              }`}
            >
              <Icon className="h-[15px] w-[15px] opacity-75" />
              <span>{label}</span>
              {badge && (
                <span className="ml-auto rounded-full border border-ink-3 px-2 py-0.5 text-[10px] text-hanji-faint">
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* 지난 화두 */}
        <div className="mt-7 px-2.5 text-[11.5px] tracking-[0.18em] text-hanji-faint">
          지난 화두
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {history.length === 0 ? (
            <p className="px-2.5 py-2 text-xs leading-6 text-hanji-faint">
              아직 회향한 화두가 없습니다
            </p>
          ) : (
            <>
              {history.slice(0, 8).map((s) => (
                <Link
                  key={`${s.hwaduId}-${s.receivedAt}`}
                  href="/archive"
                  className="flex items-center gap-2.5 overflow-hidden rounded-[10px] px-2.5 py-2.5 text-[13.5px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
                >
                  <Book className="h-[15px] w-[15px] shrink-0 opacity-75" />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {sessionTitle(s)}
                  </span>
                </Link>
              ))}
              <Link
                href="/archive"
                className="px-2.5 py-2 text-xs text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                기록 모두 보기 →
              </Link>
            </>
          )}
        </nav>

        {/* 아래 — 로그인 */}
        <div className="mt-auto border-t border-ink-3 pt-3.5">
          <button
            onClick={() => setLoginNote(!loginNote)}
            className="flex w-full items-center gap-2.5 rounded-[10px] border border-ink-3 px-3 py-2.5 text-[13.5px] text-hanji-dim transition-colors hover:text-hanji"
          >
            <Person className="h-4 w-4" />
            로그인
          </button>
          {loginNote && (
            <p className="mt-2 px-1 text-[11px] leading-5 text-hanji-faint">
              로그인은 곧 열립니다. 지금도 기록은 이 브라우저에 안전히
              남습니다.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
