"use client";

// ────────────────────────────────────────────────────────────────
// 모바일 전용 — 화면 하단에 고정되는 주요 탭 5개 + 사유의 방 FAB.
// 스크롤과 무관하게 늘 같은 자리에 머문다(fixed). md 이상에서는 숨김.
// 5개 탭: 간화선 · 공덕 · 뜰(홈) · 절로 · 내 도량
// 여섯으로 늘렸더니 칸이 좁아 글자가 뭉쳤다. 다섯이 이 폭의 한계다.
// 「공덕」은 목탁·염주·싱잉볼 — 매일 손이 가는 자리라 탭에 둔다.
// 법당(초 공양)과 굿즈는 서랍과 내 도량의 칸에서 닿는다.
// 나머지 방(체험하기·사유의 방·만다라·차 한 잔·차담회·화두 던지기·연지원)은
// 햄버거 서랍과 내 도량의 서비스 그리드에서 닿는다.
// ────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHasNews } from "@/lib/notices";
import { Dharmachakra, Person, Enso, Iljumun, Moktak } from "./icons";

const TABS = [
  { href: "/ganhwaseon", label: "간화선", Icon: Dharmachakra },
  { href: "/moktak", label: "공덕", Icon: Moktak },
  { href: "/", label: "뜰", Icon: Enso },
  { href: "/pilgrimage", label: "절로", Icon: Iljumun },
  { href: "/settings", label: "내 도량", Icon: Person },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const hasNews = useHasNews(); // 새 소식 — 내 도량 탭에 점 하나

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
      {/* 하단 고정 탭 바 */}
      <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-stretch border-t border-ink-3 bg-ink-2/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={go(href)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 text-[12.5px] tracking-wide transition-colors ${
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
    </>
  );
}
