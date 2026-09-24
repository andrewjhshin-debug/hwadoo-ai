"use client";

// ─────────────────────────────────────────────────────────────
// 염주 줄 — 앱 전체의 길. **폰에서만.**
//
// 형: 「연꽃 공양에도 탭이 보인다」 「왜 손잡고 절로만 밑에 버튼이
//      오리지날로 뜨냐」
//
// 판마다 염주를 따로 넣었더니, 아직 새로 안 짠 화면(연꽃·절로…)에서는
// 옛 탭이 그대로 떴다. 한 화면씩 고칠 일이 아니다 —
// **염주를 껍데기(layout)에 한 번만 놓고, 옛 탭은 폰에서 아예 끈다.**
// 그러면 어느 화면에 가도 아래는 늘 염주다.
//
// 알 다섯에 형이 남기라 한 것들을 묶었다 —
//   話 화두
//   功 공덕      목탁 · 염주 · 싱잉볼
//   靜 고요      하심 · 호흡 명상 · 멍 때리기 · 비움
//   燈 법당      법당 초 공양 · 불심 투자
//              (연꽃 공양은 오른쪽 위 자리에 이미 있으니 알로 두지 않는다)
//   我 나
// 열을 알 열로 늘어놓으면 그건 다시 탭이다. 다섯이 손에 맞는 수다.
// ─────────────────────────────────────────────────────────────

import { usePathname, useRouter } from "next/navigation";

export type Bead = { mark: string; name: string; href: string; also: string[] };

/** 알 다섯 — `also` 는 그 알이 품는 방들(그 방에 있어도 이 알이 켜진다) */
export const BEADS: Bead[] = [
  { mark: "話", name: "화두", href: "/", also: ["/my-hwadu", "/archive", "/room"] },
  { mark: "功", name: "공덕", href: "/moktak", also: [] },
  {
    mark: "靜",
    name: "고요",
    href: "/breath",
    also: ["/hasim", "/mung", "/empty"],
  },
  // 형: 「연꽃 공양은 오른쪽 위에 있으니까 아래 탭엔 두지 마」 — /lotus 는 뺐다
  { mark: "燈", name: "법당", href: "/candle", also: ["/tamjinchi"] },
  { mark: "我", name: "나", href: "/settings", also: ["/rank"] },
];

function beadOf(path: string): number {
  const i = BEADS.findIndex((b) => b.href === path || b.also.includes(path));
  return i;
}

export default function HipMala() {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const here = beadOf(path);

  return (
    <nav className="hip-mala" aria-label="다섯 자리">
      <i aria-hidden className="hip-mala-thread" />
      {BEADS.map((b, k) => (
        <button
          key={b.href}
          onClick={() => {
            if (k === here) return;
            try {
              window.sessionStorage.setItem(
                "hwadu.hip.swipe",
                k > here ? "next" : "prev"
              );
            } catch {
              /* 지나간다 */
            }
            router.push(b.href);
          }}
          aria-label={b.name}
          aria-current={k === here ? "page" : undefined}
          data-on={k === here ? "1" : undefined}
        >
          <b>{b.mark}</b>
        </button>
      ))}
    </nav>
  );
}
