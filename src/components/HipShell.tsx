"use client";

// ─────────────────────────────────────────────────────────────
// 폰 판의 껍데기 — 다섯 자리를 옆으로 넘긴다.
//
// 형: 「아래 탭을 저렇게 점으로 간 거 좋은데, 그러려면 옆으로 넘겨서
//      갈 수 있게 메인 5개 탭」
//
// 맞다. 점 다섯을 깔아 놓고 누르기만 되면 그건 그냥 작은 탭이다.
// 점은 「여기가 다섯 중 셋째」라는 말이고, 그러면 손가락으로 넘어가야 한다.
//
// 차례는 **수행의 길** 그대로다 —
//   話 물음을 받고 → 功 공덕을 쌓고 → 蓮 연꽃이 여물고 → 緣 손잡고 절로
//   → 我 내가 어디까지 왔나
// 형: 「공덕 쌓이면 연꽃 주고 그걸로 손잡고 절로, 이렇게 가는 걸 메인으로」.
// 왼쪽에서 오른쪽으로 읽으면 그 길이 그대로 보인다.
//
// 자리마다 화면(라우트)이 따로라 진짜 캐러셀처럼 끌려오지는 않는다.
// 대신 **손을 떼는 순간** 옆 자리로 넘기고, 넘어온 쪽에서 들어오는
// 방향대로 미끄러지게 한다 — 눈에는 넘긴 것으로 보인다.
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
      <nav className="hip-rail" aria-label="다섯 자리">
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
          >
            <i data-on={t.href === here ? "1" : undefined} />
          </button>
        ))}
      </nav>
    </div>
  );
}
