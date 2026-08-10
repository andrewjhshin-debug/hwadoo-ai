"use client";

// ─────────────────────────────────────────────────────────────
// 왼쪽 탭 — 도량의 회랑.
// · 뜰(홈) / 새 화두 받기 / 여섯 방 (전부 불교 문양)
// · 데스크톱: 접기(아이콘만) ↔ 펴기, 상태 기억
// · 모바일: 햄버거 서랍
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { loadStore, type Session } from "@/lib/store";
import { sessionTitle } from "@/lib/hwadu";
import { loginWithGoogle, logout, watchAuth } from "@/lib/sync";
import { ADMIN_UID } from "@/lib/config";
import {
  Banga,
  Book,
  Dharmachakra,
  Elephant,
  Jukbi,
  Lantern,
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
  { href: "/tea", label: "차 한 잔", Icon: Teacup },
  { href: "/community", label: "선방 — 커뮤니티", Icon: Lantern },
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

  // 데스크톱에서 접혔을 때는 아이콘만 (모바일 서랍이 열리면 항상 펼침)
  const slim = collapsed && !open;

  return (
    <>
      {/* 모바일 상단 바 — 로고 가운데, 메뉴 오른쪽 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-ink-3 bg-ink-2/95 px-2 backdrop-blur md:hidden">
        {/* 왼쪽 — 테마 토글 (로고를 정확히 가운데 두기 위한 좌측 균형추) */}
        <div className="flex w-12 justify-start">
          <ThemeToggle />
        </div>
        {/* 가운데 — 법륜 + 화두 로고 */}
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-2.5"
        >
          <Dharmachakra className="h-5 w-5" stroke="#D9B45B" />
          <span className="text-gold-grad font-serif text-base font-semibold tracking-[0.35em]">
            화두
          </span>
        </Link>
        {/* 오른쪽 — 삼선 메뉴 */}
        <div className="flex w-12 justify-end">
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
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-ink-3 bg-ink-2 pb-4 pt-[4.5rem] transition-all duration-300 md:static md:z-auto md:translate-x-0 md:pt-6 ${
          slim ? "w-[68px] px-2" : "w-[264px] px-4"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* 브랜드 + 접기 */}
        <div
          className={`mb-5 hidden items-center md:flex ${slim ? "justify-center" : "justify-between px-2"}`}
        >
          {!slim && (
            <Link href="/" className="flex items-center gap-2.5">
              <Dharmachakra className="h-[26px] w-[26px]" stroke="#D9B45B" />
              <span className="text-gold-grad font-serif text-lg font-semibold tracking-[0.35em]">
                화두
              </span>
            </Link>
          )}
          <div className={`flex items-center ${slim ? "flex-col gap-1" : "gap-0.5"}`}>
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
          title="새 화두 받기"
          className={`btn-obang flex items-center gap-2.5 py-3 text-sm font-medium text-hanji transition-opacity hover:opacity-90 ${
            slim ? "justify-center px-0" : "px-4"
          }`}
        >
          <Lotus className="h-[17px] w-[17px]" stroke="#D9B45B" />
          {!slim && "뜰"}
        </Link>

        {/* 체험하기 — 기한 없이 전 과정 한 바퀴 */}
        <Link
          href="/try"
          title="체험하기"
          className={`mt-2 flex items-center gap-2.5 rounded-[10px] border py-2.5 text-[13px] transition-colors ${
            pathname === "/try"
              ? "border-gold/40 bg-gold/10 text-hanji"
              : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
          } ${slim ? "justify-center px-0" : "px-3"}`}
        >
          <Elephant className="h-[16px] w-[16px] opacity-75" />
          {!slim && <span>체험하기</span>}
        </Link>

        {/* 여섯 방 */}
        <nav className="mt-6 flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13.5px] transition-colors ${
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

        {/* 지난 화두 — 접힘 상태에서는 숨김 */}
        {!slim && (
          <>
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
          </>
        )}
        {slim && <div className="flex-1" />}

        {/* 아래 — 로그인 */}
        <div className="mt-auto border-t border-ink-3 pt-3.5">
          {user ? (
            slim ? (
              <button
                onClick={logout}
                title={`${user.displayName ?? "수행자"}님 · 로그아웃`}
                className="flex w-full justify-center rounded-[10px] border border-ink-3 px-0 py-2.5 text-hanji-dim transition-colors hover:text-hanji"
              >
                <Person className="h-4 w-4" />
              </button>
            ) : (
              <div className="px-1">
                <p className="flex items-center gap-2.5 text-[13px] text-hanji-dim">
                  <Person className="h-4 w-4 shrink-0" />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.displayName ?? "수행자"}님
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] leading-5 text-hanji-faint">
                  기록이 계정에 모이고 있습니다
                </p>
                <div className="mt-2 flex items-center gap-4">
                  {user.uid === ADMIN_UID && (
                    <Link
                      href="/admin"
                      className="text-[11px] tracking-widest text-gold-soft transition-colors hover:text-gold"
                    >
                      뒷방(관리)
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-[11px] tracking-widest text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors hover:text-hanji-dim"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
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
