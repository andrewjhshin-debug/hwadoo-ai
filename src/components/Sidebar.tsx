"use client";

// ─────────────────────────────────────────────────────────────
// 왼쪽 탭 — 도량의 회랑.
// · 뜰(홈) / 새 화두 받기 / 여섯 방 (전부 불교 문양)
// · 데스크톱: 접기(아이콘만) ↔ 펴기, 상태 기억
// · 모바일: 햄버거 서랍
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { loadStore, type Session } from "@/lib/store";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import {
  Banga,
  Book,
  Dharmachakra,
  Elephant,
  Jukbi,
  Lantern,
  Mandala,
  Lotus,
  SeonMaster,
  Person,
  Teacup,
} from "./icons";

const NAV = [
  { href: "/ganhwaseon", label: "간화선이란?", Icon: Dharmachakra },
  { href: "/masters", label: "선지식의 한마디", Icon: SeonMaster },
  { href: "/room", label: "사유의 방", Icon: Banga },
  { href: "/my-hwadu", label: "내가 던지는 화두", Icon: Jukbi },
  { href: "/mandala", label: "만다라", Icon: Mandala },
  { href: "/tea", label: "차 한 잔", Icon: Teacup },
  { href: "/gathering", label: "명상 모임", Icon: Person },
  { href: "/community", label: "연지원 — 커뮤니티", Icon: Lantern },
];

const COLLAPSE_KEY = "hwadoo-sidebar-collapsed";
const THEME_KEY = "hwadoo-theme";

// 해/달 토글 — 낮 모드 ↔ 밤 모드
function ThemeToggle({ className = "" }: { className?: string }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "";
    window.localStorage.setItem(THEME_KEY, next ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      title={light ? "밤 모드로" : "낮 모드로"}
      aria-label={light ? "밤 모드로 전환" : "낮 모드로 전환"}
      className={`p-1.5 text-hanji-faint transition-colors hover:text-gold-soft ${className}`}
    >
      {light ? (
        // 달 — 밤으로
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-4 w-4">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5z" />
        </svg>
      ) : (
        // 해 — 낮으로
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      )}
    </button>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false); // 모바일 서랍
  const [collapsed, setCollapsed] = useState(false); // 데스크톱 접힘
  const [history, setHistory] = useState<Session[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  };

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

  useEffect(() => {
    return watchAuth(setUser);
  }, []);

  // 페이지를 이동하면 모바일 서랍을 닫는다
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogin = async () => {
    setLoginBusy(true);
    try {
      await loginWithGoogle();
    } catch {
      // 팝업 닫힘 등 — 조용히 넘어간다
    } finally {
      setLoginBusy(false);
    }
  };

  // 눌린 대로 그 화면을 연다 — 모바일 서랍은 항상 닫고, 같은 경로여도 이동한다
  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (pathname === href) {
      // 이미 그 페이지면 — 화면 안 상태(화두만 보기 등)를 초기화하도록 알림
      window.dispatchEvent(new CustomEvent("hwadoo-nav-home"));
      router.refresh();
    } else {
      router.push(href);
    }
  };

  // 데스크톱에서 접혔을 때는 아이콘만 (모바일 서랍이 열리면 항상 펼침)
  const slim = collapsed && !open;

  return (
    <>
      {/* 모바일 상단 바 — 로고 가운데, 메뉴 왼쪽·테마 오른쪽 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-ink-3 bg-ink-2/95 px-2 backdrop-blur md:hidden">
        {/* 왼쪽 — 삼선 메뉴 */}
        <div className="flex w-14 justify-start">
          <button
            onClick={() => setOpen(!open)}
            aria-label="메뉴 열기"
            className="p-2 text-hanji-dim"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
        {/* 가운데 — 법륜 + 화두 로고 */}
        <Link
          href="/"
          onClick={go("/")}
          className="flex flex-1 items-center justify-center gap-2.5"
        >
          <Dharmachakra className="h-7 w-7" stroke="#D9B45B" />
          <span className="text-gold-grad font-serif text-xl font-semibold tracking-[0.35em]">
            화두
          </span>
        </Link>
        {/* 오른쪽 — 테마 토글 */}
        <div className="flex w-14 justify-end">
          <ThemeToggle className="[&_svg]:h-6 [&_svg]:w-6" />
        </div>
      </div>

      {/* 모바일 배경 가림막 */}
      {open && (
        <div
          className="fixed inset-0 z-[46] bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={`fixed inset-y-0 left-0 z-[47] flex shrink-0 flex-col border-r border-ink-3 bg-ink-2 pb-7 pt-[5rem] transition-all duration-300 md:static md:z-auto md:translate-x-0 md:pb-4 md:pt-6 ${
          slim ? "w-[68px] px-2" : "w-[264px] px-4"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* 브랜드 + 접기 */}
        <div
          className={`mb-5 hidden items-center md:flex ${slim ? "justify-center" : "justify-between px-2"}`}
        >
          {!slim && (
            <Link href="/" onClick={go("/")} className="flex items-center gap-2.5">
              <Dharmachakra className="h-[26px] w-[26px]" stroke="#D9B45B" />
              <span className="text-gold-grad font-serif text-lg font-semibold tracking-[0.35em]">
                화두
              </span>
            </Link>
          )}
          <div className={`flex items-center ${slim ? "flex-col gap-1" : "gap-0.5"}`}>
            {/* 마이 페이지 · 내 도량 — 오른쪽 위 */}
            <Link
              href={user ? "/settings" : "/settings"}
              onClick={go("/settings")}
              title="내 도량"
              aria-label="내 도량"
              className="p-1.5 text-hanji-faint transition-colors hover:text-gold-soft"
            >
              <Person className="h-4 w-4" />
            </Link>
            <ThemeToggle />
            <button
              onClick={toggleCollapsed}
              title={slim ? "펼치기" : "접기"}
              aria-label={slim ? "사이드바 펼치기" : "사이드바 접기"}
              className="p-1.5 text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                {slim ? <path d="M9 5l7 7-7 7" /> : <path d="M15 5l-7 7 7 7" />}
              </svg>
            </button>
          </div>
        </div>

        {/* 새 화두 받기 — 홈 */}
        <Link
          href="/"
          onClick={go("/")}
          title="새 화두 받기"
          className={`btn-obang flex items-center gap-2.5 py-3.5 text-[16px] font-medium text-hanji transition-opacity hover:opacity-90 sm:py-2.5 sm:text-[13px] ${
            slim ? "justify-center px-0" : "px-4"
          }`}
        >
          <Lotus className="h-[17px] w-[17px]" stroke="#D9B45B" />
          {!slim && "뜰"}
        </Link>

        {/* 체험하기 — 기한 없이 전 과정 한 바퀴 */}
        <Link
          href="/try"
          onClick={go("/try")}
          title="체험하기"
          className={`mt-2 flex items-center gap-2.5 rounded-[10px] border py-3 text-[15px] transition-colors sm:py-2 sm:text-[12.5px] ${
            pathname === "/try"
              ? "border-gold/40 bg-gold/10 text-hanji"
              : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
          } ${slim ? "justify-center px-0" : "px-3"}`}
        >
          <Elephant className="h-[16px] w-[16px] opacity-75" />
          {!slim && <span>체험하기</span>}
        </Link>

        {/* 여섯 방 */}
        <nav className="mt-4 flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={go(href)}
              title={label}
              className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[15px] transition-colors sm:py-1.5 sm:text-[12.5px] ${
                pathname === href
                  ? "bg-gold/10 text-hanji"
                  : "text-hanji-dim hover:bg-gold/5 hover:text-hanji"
              } ${slim ? "justify-center" : ""}`}
            >
              <Icon className="h-[16px] w-[16px] shrink-0 opacity-75" />
              {!slim && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* 지난 화두 — 목록 없이 기록 보기 링크만 (스크롤바 방지) */}
        {!slim && (
          <div className="mt-6 flex-1">
            <div className="px-2.5 text-[11.5px] tracking-[0.18em] text-hanji-faint">
              지난 화두
            </div>
            <Link
              href="/archive"
              onClick={go("/archive")}
              className="mt-2 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13.5px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
            >
              <Book className="h-[15px] w-[15px] shrink-0 opacity-75" />
              <span>
                {history.length === 0
                  ? "아직 회향한 화두가 없습니다"
                  : `기록 보기 · ${history.length}`}
              </span>
            </Link>
          </div>
        )}

        {slim && <div className="flex-1" />}

        {/* 아래 — 로그인 */}
        <div className="mt-auto shrink-0 border-t border-ink-3 pt-3.5 md:hidden">
          {user ? (
            slim ? (
              <Link
                href="/settings"
                onClick={go("/settings")}
                title={`${user.displayName ?? "수행자"}님 · 내 도량`}
                className="flex w-full justify-center rounded-[10px] border border-ink-3 px-0 py-2.5 text-hanji-dim transition-colors hover:text-hanji"
              >
                <Person className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/settings"
                onClick={go("/settings")}
                title="내 도량"
                className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5 transition-colors hover:bg-gold/5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/30 text-hanji-dim">
                  <Person className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[14px] text-hanji">
                    {user.displayName ?? "수행자"}님
                  </span>
                  <span className="block text-[11px] text-hanji-faint">
                    내 도량
                  </span>
                </span>
              </Link>
            )
          ) : (
            <>
              <button
                onClick={handleLogin}
                disabled={loginBusy}
                title="구글로 로그인"
                className={`flex w-full items-center gap-2.5 rounded-[10px] border border-ink-3 py-2.5 text-[13.5px] text-hanji-dim transition-colors hover:text-hanji disabled:opacity-50 ${
                  slim ? "justify-center px-0" : "px-3"
                }`}
              >
                <Person className="h-4 w-4" />
                {!slim && (loginBusy ? "여는 중…" : "구글로 로그인")}
              </button>
              {!slim && (
                <p className="mt-2 px-1 text-[11px] leading-5 text-hanji-faint">
                  로그인하면 지난 화두들이 계정에 모입니다 — 기기가 바뀌어도.
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
