"use client";

// ─────────────────────────────────────────────────────────────
// 왼쪽 탭 — 도량의 회랑.
// · 세 구획으로 묶는다 — 수행 / 말씀 / 나눔 (전부 불교 문양)
//   수행: 뜰(홈) · 체험하기 · 손잡고 절로 · 모임 · 사유의 방 · 만다라 · 비움 · 호흡 명상
//   말씀: 간화선이란? · 선지식의 한마디
//   나눔: 내가 던지는 화두 · 차담회 · 연지원 · 차 한 잔 · 굿즈
// · 메뉴가 길어졌다 — 내비 영역만 휠 스크롤(스크롤바는 감춘다),
//   위 브랜드와 아래 로그인은 제자리에 머문다
// · 데스크톱: 접기(아이콘만, 구획 제목은 숨김) ↔ 펴기, 상태 기억
// · 모바일: 햄버거 서랍 (같은 내비 영역이 스크롤을 맡는다)
// · 내 도량 곁 걸음 뱃지 — 회향 수로 人(1+)/修(5+)/天(15+) 중 최고 한 글자
//   (아래 로그인 영역에만 남긴다 — 위 Person 아이콘에는 대신 새 소식 점)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { loadStore, type Session } from "@/lib/store";
import { useHasNews } from "@/lib/notices";
import { applyTheme } from "@/lib/theme";
import { rankHanjaFor } from "@/lib/badges";
import { isAdminAccount, BETA } from "@/lib/config";
import {
  countDmUnread,
  dmVisible,
  fetchMyThreads,
  DM_SEEN_EVENT,
} from "@/lib/dm";
import { loginWithGoogle, logout, watchAuth } from "@/lib/sync";
import { initPresence } from "@/lib/presence";
import LotusCount from "@/components/LotusCount";
import {
  Banga,
  Bojagi,
  Book,
  Breath,
  Hasim,
  Ilwonsang,
  Dharmachakra,
  Jeoul,
  Iljumun,
  Nohda,
  Letter,
  Beopryun,
  LotusMark,
  LotusPond,
  Mandala,
  Moment,
  SeonMaster,
  Seogo,
  Person,
  Teacup,
  Yeonkkot,
  YeonMun,
  Baru,
  BodhiLeaf,
  Chotbul,
  Jeol,
  Jeol108,
  Yeomju,
  YeonkkotGold,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; stroke?: string }>;
  soon?: boolean;
  disabled?: boolean; // 아직 문이 열리지 않은 자리 — 눌러도 이동하지 않는다
};

// 수행 — 매일 앉아 익히는 방들 (뜰·체험하기는 위의 붙박이 단추가 맡는다)
const NAV_PRACTICE: NavItem[] = [
  // 손잡고 절로 — 사찰 지도·다가오는 날, 모임은 그 짝
  { href: "/pilgrimage", label: "손잡고 절로", Icon: Iljumun },
  { href: "/gathering", label: "인연 — 함께 갈 이", Icon: Person },

  // ── 매일 손과 몸으로 하는 것 — 형이 짚어 준 차례 ──
  // 「목탁~~ 을 인연 밑에 / 삼배 / 백팔배 / 그 밑에 하심 / 호흡 명상 /
  //  멍 때리기 / 그리고 나머지 줄줄줄 중요도에 따라」
  { href: "/moktak", label: "목탁·염주·싱잉볼", Icon: Yeomju },
  { href: "/sambae", label: "삼배", Icon: Jeol },
  { href: "/bae", label: "백팔배", Icon: Jeol108 },
  // 이름만 적는다 — 형: 「하심 끝없이 내려가기 이딴말 말고 그냥 한자로」
  { href: "/hasim", label: "下心", Icon: Hasim },
  { href: "/breath", label: "호흡 명상", Icon: Breath },
  { href: "/mung", label: "멍 때리기", Icon: Ilwonsang },

  // ── 그 아래는 중요도 순 ──
  { href: "/room", label: "사유의 방", Icon: Banga },
  // 형: 「오늘의 운세는 그 보리수 나무 잎 로고로」
  { href: "/draw", label: "오늘의 운세", Icon: BodhiLeaf },
  { href: "/candle", label: "법당 — 초 공양", Icon: Chotbul },
  { href: "/sutra", label: "경전 외우기", Icon: Book },
  { href: "/mandala", label: "만다라", Icon: Mandala },
  // 비움 — 속이 비어 있어 소리가 나는 목탁. 빈 원(일원상) 아이콘이 생기면 바꾼다.
  { href: "/empty", label: "비움", Icon: Baru },
  { href: "/moment", label: "시절인연 — 절에서 찍은 한 장", Icon: Moment },
  { href: "/rank", label: "정진 랭킹", Icon: Dharmachakra },
  { href: "/archive", label: "서고 — 지난 화두", Icon: Seogo },
  { href: "/lotus", label: "연꽃 공양", Icon: YeonkkotGold },
];

// 말씀 · 나눔 — 구획 제목과 함께 아래에 잇는다
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "말씀",
    items: [
      { href: "/ganhwaseon", label: "간화선이란?", Icon: Dharmachakra },
      { href: "/masters", label: "선지식의 한마디", Icon: SeonMaster },
      { href: "/tamjinchi", label: "불심 투자", Icon: Jeoul },
    ],
  },
  {
    title: "나눔",
    items: [
      { href: "/my-hwadu", label: "내가 던지는 화두", Icon: Nohda },
      { href: "/community", label: "연지원 — 커뮤니티", Icon: LotusPond },
      { href: "/tea", label: "차 한 잔", Icon: Teacup },
      { href: "/goods", label: "굿즈", Icon: Bojagi },
    ],
  },
];

const COLLAPSE_KEY = "hwadoo-sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false); // 모바일 서랍

  const [collapsed, setCollapsed] = useState(false); // 데스크톱 접힘
  const [history, setHistory] = useState<Session[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const hasNews = useHasNews(); // 새 소식 — 점 하나로만 말한다
  const [dmUnread, setDmUnread] = useState(0); // 안 읽은 쪽지 — 봉투 위 점

  // 접속 표를 올린다 — 모든 화면에 있는 부품이 맡아야 목탁 치는 사람도 세어진다.
  // 숫자를 여기 걸어 두진 않는다. 「● 2」는 무슨 수인지 알 수 없어
  // 아무 말도 하지 않았다. 세는 일은 뜰과 육도 랭킹이 쓴다.
  // 서랍이 열려 있다고 문서에 적어 둔다.
  //
  // 형: 「왼쪽 탭을 눌린 다음 오른쪽 아래 메뉴 탭을 눌리면 엉켜.
  //      왼쪽 탭을 눌렸으면 오른쪽 아래 버튼은 안 보이거나 작동 안 하게」
  // 서랍과 도량 판은 서로 다른 조각이라 상대를 모른다. 부모를 두거나
  // 전역 상태를 만드는 대신 **문서에 표 하나**를 남긴다 — 도량 판은
  // 그 표만 보고 스스로 비켜 준다. 조각이 서로 물리지 않는다.
  useEffect(() => {
    const el = document.documentElement;
    if (open) el.setAttribute("data-drawer", "1");
    else el.removeAttribute("data-drawer");
    return () => el.removeAttribute("data-drawer");
  }, [open]);

  useEffect(() => initPresence(), []);

  // 안 읽은 쪽지 살피기 — 로그인하면 이따금(90초) + 창에 돌아올 때 + 읽은 직후
  useEffect(() => {
    if (!user) {
      setDmUnread(0);
      return;
    }
    let alive = true;
    const look = () => {
      fetchMyThreads()
        .then((list) => {
          if (alive) setDmUnread(countDmUnread(list, user.uid));
        })
        .catch(() => {});
    };
    look();
    const timer = window.setInterval(look, 90_000);
    window.addEventListener("focus", look);
    window.addEventListener(DM_SEEN_EVENT, look);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", look);
      window.removeEventListener(DM_SEEN_EVENT, look);
    };
  }, [user]);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    // 낮 모드는 접었다 — 밤 하나로 간다
    applyTheme(false);
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

  // 걸음 뱃지 — 회향이 없으면 아무것도 그리지 않는다 (뒷방 주인은 늘 天)
  const rank = rankHanjaFor(history.length, user);
  const rankBadge = rank && (
    <span
      aria-label={`걸음 · ${rank}`}
      className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-[9px] leading-none text-gold"
    >
      {rank}
    </span>
  );

  // 나란한 방 하나 — 구획마다 같은 모양으로 그린다
  const renderItem = ({ href, label, Icon, soon, disabled }: NavItem) => {
    const soonBadge = !slim && soon && (
      <span className="ml-auto rounded-full border border-gold/30 px-1.5 py-px text-[9px] leading-tight text-gold-soft">
        곧
      </span>
    );
    // 아직 문이 열리지 않은 자리 — 자리만 밝혀 두고, 눌러도 이동하지 않는다
    if (disabled) {
      return (
        <span
          key={href}
          title={label}
          className={`flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[15px] text-hanji-faint sm:py-1 sm:text-[12.5px] ${
            slim ? "justify-center" : ""
          }`}
        >
          <Icon className="h-[16px] w-[16px] shrink-0 opacity-55" />
          {!slim && <span>{label}</span>}
          {soonBadge}
        </span>
      );
    }
    return (
      <Link
        key={href}
        href={href}
        onClick={go(href)}
        title={label}
        className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[15px] transition-colors sm:py-1 sm:text-[12.5px] ${
          pathname === href
            ? "bg-gold/10 text-hanji"
            : "text-hanji-dim hover:bg-gold/5 hover:text-hanji"
        } ${slim ? "justify-center" : ""}`}
      >
        <Icon className="h-[16px] w-[16px] shrink-0 opacity-75" />
        {!slim && <span>{label}</span>}
        {soonBadge}
      </Link>
    );
  };

  return (
    <>
      {/* 모바일 상단 바 — 로고 가운데(절대 중앙), 메뉴 왼쪽 ·
          오른쪽엔 연꽃 상점 · 알림 · 테마 */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-ink-3 bg-ink-2/95 px-2 backdrop-blur md:hidden">
        {/* 왼쪽 — 삼선 메뉴 */}
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
        {/* 가운데 — 연꽃 + 화두 로고 (절대 중앙) */}
        <Link
          href="/"
          onClick={go("/")}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5"
        >
          <Beopryun className="h-7 w-7" stroke="#D9B45B" />
          <span className="text-gold-grad font-serif text-xl font-semibold tracking-[0.35em]">
            화두
          </span>
          {/* 형: 「일 커지기 전에 베타테스트라고 두고」 —
              정식으로 열 때 config.ts 의 BETA 를 false 로 */}
          {BETA && (
            <span className="rounded-full border border-gold/35 px-1.5 py-[1px] text-[9px] tracking-[0.18em] text-gold-soft/80">
              BETA
            </span>
          )}

        </Link>
        {/* 오른쪽 — 밤/낮 · 연꽃 상점 · 쪽지 */}
        <div className="ml-auto flex items-center">
          <Link
            href="/lotus"
            onClick={go("/lotus")}
            aria-label="연꽃 공양"
            title="연꽃 공양 — 등을 밝히다"
            className="p-2 text-hanji-dim transition-colors hover:text-gold-soft"
          >
            <Yeonkkot className="h-[30px] w-[30px]" />
          </Link>
          <Link
            href="/letters"
            onClick={go("/letters")}
            aria-label="쪽지함"
            title="쪽지함 — 1:1 서신"
            className="relative p-2 text-hanji-dim transition-colors hover:text-gold-soft"
          >
            <Letter className="h-6 w-6" />
            {dmUnread > 0 && (
              <span
                aria-label={`안 읽은 쪽지 ${dmUnread}`}
                className="absolute right-0.5 top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-vermilion px-1 text-[9px] font-medium leading-none text-white shadow-[0_0_6px_var(--color-vermilion)]"
              >
                {dmUnread > 9 ? "9+" : dmUnread}
              </span>
            )}
          </Link>
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
        {/* 브랜드 + 접기.
            한 줄에 이름과 아이콘 다섯을 다 밀어 넣었더니 264px 안에서
            「화두」가 두 줄로 접혔다. 줄을 갈랐다 — 위는 이름과 접기,
            아래는 아이콘과 내 연꽃 수. 이름은 절대 접히지 않게 nowrap. */}
        <div className={`mb-4 hidden shrink-0 flex-col md:flex ${slim ? "items-center gap-1.5" : "gap-2"}`}>
          {!slim && (
            <div className="flex items-center justify-between px-2">
              <Link href="/" onClick={go("/")} className="flex shrink-0 items-center gap-2.5">
                <Beopryun className="h-6 w-6 shrink-0" stroke="#D9B45B" />
                <span className="text-gold-grad whitespace-nowrap font-serif text-lg font-semibold tracking-[0.26em]">
                  화두
                </span>
                {BETA && (
                  <span className="rounded-full border border-gold/35 px-1.5 py-[1px] text-[9px] tracking-[0.18em] text-gold-soft/80">
                    BETA
                  </span>
                )}

              </Link>
              <button
                onClick={toggleCollapsed}
                title="접기"
                aria-label="사이드바 접기"
                className="shrink-0 p-1.5 text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
            </div>
          )}
          <div
            className={`flex items-center ${slim ? "flex-col gap-1" : "justify-between gap-0.5 px-1.5"}`}
          >
            <div className={`flex items-center ${slim ? "flex-col gap-1" : "gap-0.5"}`}>
            {/* 마이 페이지 · 내 도량 — 오른쪽 위.
                걸음 뱃지는 아래 로그인 영역에만 — 여기에는 새 소식 점만 뜬다 */}
            {/* 연꽃 · 쪽지 — 낮/밤 단추가 있던 자리 */}
            {/* 정진 랭킹 — 매일 보는 자리니 목록 속이 아니라 위 줄에 */}
            <Link
              href="/rank"
              onClick={go("/rank")}
              title="정진 랭킹"
              aria-label="정진 랭킹"
              className="p-1.5 text-hanji-faint transition-colors hover:text-gold-soft"
            >
              <Dharmachakra className="h-4 w-4" />
            </Link>
            {/* 연꽃 — 펼친 상태에서는 오른쪽 알약이 같은 자리로 간다(두 개면 겹말).
                접었을 때만 아이콘으로 남긴다. */}
            {slim && (
              <Link
                href="/lotus"
                onClick={go("/lotus")}
                title="연꽃 공양 — 등을 밝히다"
                aria-label="연꽃 공양"
                className="p-1.5 text-hanji-faint transition-colors hover:text-gold-soft"
              >
                <Yeonkkot className="h-[19px] w-[19px]" />
              </Link>
            )}
            {dmVisible(user?.uid) && (
              <Link
                href="/letters"
                onClick={go("/letters")}
                title={dmUnread > 0 ? `쪽지 ${dmUnread}` : "쪽지함"}
                aria-label="쪽지함"
                className="relative p-1.5 text-hanji-faint transition-colors hover:text-gold-soft"
              >
                <Letter className="h-4 w-4" />
                {dmUnread > 0 && (
                  <span
                    aria-hidden
                    className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-vermilion shadow-[0_0_6px_var(--color-vermilion)]"
                  />
                )}
              </Link>
            )}
            <Link
              href="/settings"
              onClick={go("/settings")}
              title={hasNews ? "내 도량 · 새 소식" : "내 도량"}
              aria-label="내 도량"
              className="relative p-1.5 text-hanji-faint transition-colors hover:text-gold-soft"
            >
              <Person className="h-4 w-4" />
              {hasNews && (
                <span
                  aria-hidden
                  className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-vermilion shadow-[0_0_6px_var(--color-vermilion)]"
                />
              )}
            </Link>
            {slim && (
              <button
                onClick={toggleCollapsed}
                title="펼치기"
                aria-label="사이드바 펼치기"
                className="p-1.5 text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            </div>
            {/* 내 연꽃 — 웹에도 있어야 한다. 폰에서만 보이면 반쪽이다 */}
            {!slim && <LotusCount look="line" />}
          </div>
        </div>

        {/* ── 내비 — 휠 스크롤 영역 (위 브랜드·아래 로그인은 제자리) ── */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {/* ── 수행 — 매일 앉는 자리 ── */}
          {!slim && (
            <div className="mb-1.5 px-2.5 text-[11px] tracking-[0.22em] text-hanji-faint">
              수행
            </div>
          )}

          {/* 새 화두 받기 — 홈 */}
          <Link
            href="/"
            onClick={go("/")}
            title="새 화두 받기"
            className={`btn-obang flex items-center gap-2.5 py-3.5 text-[16px] font-medium text-hanji transition-opacity hover:opacity-90 sm:py-2 sm:text-[13px] ${
              slim ? "justify-center px-0" : "px-4"
            }`}
          >
            {/* 폰 탭은 보리수 잎인데 여기만 연꽃이었다 — 같은 「뜰」이
                두 그림이면 같은 곳으로 안 읽힌다 */}
            {/* 형: 「그냥 노란 버전은 뜰 로고로 쓰고」 */}
            <YeonMun className="h-[28px] w-[28px]" stroke="#D9B45B" />
            {!slim && "뜰"}
          </Link>

          {/* 체험하기 — 기한 없이 전 과정 한 바퀴 */}
          <Link
            href="/try"
            onClick={go("/try")}
            title="체험하기"
            className={`mt-1.5 flex items-center gap-2.5 rounded-[10px] border py-3 text-[15px] transition-colors sm:py-1.5 sm:text-[12.5px] ${
              pathname === "/try"
                ? "border-gold/40 bg-gold/10 text-hanji"
                : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
            } ${slim ? "justify-center px-0" : "px-3"}`}
          >
            {/* 저울은 「불심 투자」의 그림이다. 한 화면에 저울이 둘이었고
                체험하기와 저울은 뜻도 안 이어졌다. 화두 하나를 받아 품어
                보는 자리이니 일원상으로 바꾼다. */}
            <Ilwonsang className="h-[16px] w-[16px] opacity-75" />
            {!slim && <span>체험하기</span>}
          </Link>

          {/* 수행의 나머지 방들 */}
          <nav className="mt-1.5 flex flex-col gap-0.5">
            {NAV_PRACTICE.map(renderItem)}
          </nav>

          {/* ── 말씀 · 나눔 ── */}
          {NAV_GROUPS.map(({ title, items }) => (
            <div key={title} className={slim ? "mt-2.5 border-t border-ink-3 pt-2.5" : "mt-4"}>
              {!slim && (
                <div className="mb-1 px-2.5 text-[11px] tracking-[0.22em] text-hanji-faint">
                  {title}
                </div>
              )}
              <nav className="flex flex-col gap-0.5">
                {items.map(renderItem)}
              </nav>
            </div>
          ))}

          {/* 지난 화두 — 목록 없이 기록 보기 링크만 */}
          {!slim && (
            <div className="mt-4">
              <div className="px-2.5 text-[11.5px] tracking-[0.18em] text-hanji-faint">
                지난 화두
              </div>
              <Link
                href="/archive"
                onClick={go("/archive")}
                className="mt-1 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] text-hanji-dim transition-colors hover:bg-gold/5 hover:text-hanji"
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
        </div>

        {/* 아래 — 로그인 (데스크톱·모바일 모두, 접혔을 때는 아이콘만) */}
        <div className="mt-auto shrink-0 border-t border-ink-3 pt-3.5">
          {user ? (
            slim ? (
              <Link
                href="/settings"
                onClick={go("/settings")}
                title={`${user.displayName ?? "수행자"}님 · 내 도량`}
                className="flex w-full justify-center rounded-[10px] border border-ink-3 px-0 py-2.5 text-hanji-dim transition-colors hover:text-hanji"
              >
                <span className="relative">
                  <Person className="h-4 w-4" />
                  {hasNews && (
                    <span
                      aria-hidden
                      className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-vermilion shadow-[0_0_6px_var(--color-vermilion)]"
                    />
                  )}
                </span>
              </Link>
            ) : (
              <>
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
                    <span className="flex items-center gap-1.5 text-[11px] text-hanji-faint">
                      내 도량
                      {rankBadge}
                    </span>
                  </span>
                </Link>
                <div className="mt-1.5 flex items-center gap-4 px-1.5">
                  {isAdminAccount(user) && (
                    <Link
                      href="/admin"
                      onClick={go("/admin")}
                      className="text-[11px] tracking-widest text-gold-soft transition-colors hover:text-gold"
                    >
                      뒷방(관리)
                    </Link>
                  )}
                  <button
                    onClick={() => logout().catch(() => {})}
                    className="text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-vermilion"
                  >
                    로그아웃
                  </button>
                </div>
              </>
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
                  <br />
                  만 19세 이상만 이용할 수 있습니다.
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
