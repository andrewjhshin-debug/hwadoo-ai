"use client";

// ─────────────────────────────────────────────────────────────
// 폰 판의 껍데기 — **염주가 곧 길이다.**
//
// 형: 「시스템조차 탭이니 뭐니 그렇게 말고 아예 리뉴얼. 지금 너무 고리타분」
//
// 맞다. 아래 점 다섯도 결국 탭이다. 이름만 점으로 바꾼 탭.
// 그런데 우리한테는 **염주**가 있다. 알을 하나씩 넘기는 몸짓이 이미
// 이 앱의 몸짓인데, 그걸 두고 탭을 쓸 이유가 없다.
//
// 그래서 아래에 **실에 꿰인 알 다섯**을 둔다. 지금 있는 자리가 큰 알이고,
// 줄을 끌면 알이 넘어가듯 방이 넘어간다. 눌러도 가고, 끌어도 간다.
// 세상에 이런 내비게이션은 없다 — 우리 것이다.
//
// 차례는 수행의 길 그대로 —
//   話 물음을 받고 → 功 공덕을 쌓고 → 蓮 연꽃이 여물고 → 緣 손잡고 절로
//   → 我 내가 어디까지 왔나
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export const HIP_TABS: { href: string; name: string; mark: string }[] = [
  { href: "/", name: "뜰", mark: "話" },
  { href: "/moktak", name: "공덕", mark: "功" },
  { href: "/lotus", name: "연꽃", mark: "蓮" },
  { href: "/pilgrimage", name: "절로", mark: "緣" },
  { href: "/settings", name: "나", mark: "我" },
];

/** 손가락이 이만큼은 가야 넘긴다 — 세로로 읽다가 살짝 흔들린 것과 가른다 */
const THRESHOLD = 56;

export default function HipShell({
  here,
  children,
}: {
  /** 지금 자리의 주소 — HIP_TABS 의 href */
  here: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const i = Math.max(0, HIP_TABS.findIndex((t) => t.href === here));
  const [slide, setSlide] = useState<"" | "from-right" | "from-left">("");
  const from = useRef({ x: 0, y: 0, on: false });

  // 어느 쪽에서 들어왔는지 — 넘긴 쪽이 알려 준다(세션에만 잠깐 둔다)
  useEffect(() => {
    try {
      const d = window.sessionStorage.getItem("hwadu.hip.swipe");
      if (d === "next" || d === "prev") {
        setSlide(d === "next" ? "from-right" : "from-left");
        window.sessionStorage.removeItem("hwadu.hip.swipe");
        const t = window.setTimeout(() => setSlide(""), 420);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* 서랍이 막혀 있어도 넘기는 것은 된다 */
    }
  }, [here]);

  const go = (dir: "next" | "prev") => {
    const to = HIP_TABS[dir === "next" ? i + 1 : i - 1];
    if (!to) return;
    try {
      window.sessionStorage.setItem("hwadu.hip.swipe", dir);
    } catch {
      /* 지나간다 */
    }
    router.push(to.href);
  };

  return (
    <div
      className={`hip-swipe ${slide}`}
      onTouchStart={(e) => {
        const t = e.touches[0];
        from.current = { x: t.clientX, y: t.clientY, on: true };
      }}
      onTouchEnd={(e) => {
        if (!from.current.on) return;
        from.current.on = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - from.current.x;
        const dy = t.clientY - from.current.y;
        // 가로로 확실히 더 많이 갔을 때만 — 세로로 읽는 손을 뺏지 않는다
        if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.6) return;
        go(dx < 0 ? "next" : "prev");
      }}
    >
      {children}
      {/* ── 염주 줄 ── 알 다섯이 실에 꿰여 있다. 지금 자리가 큰 알 */}
      <nav className="hip-mala" aria-label="다섯 자리">
        <i aria-hidden className="hip-mala-thread" />
        {HIP_TABS.map((t, k) => (
          <button
            key={t.href}
            onClick={() => {
              if (t.href === here) return;
              try {
                window.sessionStorage.setItem("hwadu.hip.swipe", k > i ? "next" : "prev");
              } catch {
                /* 지나간다 */
              }
              router.push(t.href);
            }}
            aria-label={t.name}
            aria-current={t.href === here ? "page" : undefined}
            data-on={t.href === here ? "1" : undefined}
          >
            <b>{t.mark}</b>
          </button>
        ))}
      </nav>
    </div>
  );
}
