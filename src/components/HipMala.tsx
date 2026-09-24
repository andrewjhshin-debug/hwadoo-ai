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
// 형: 「정직하게 막 탭에 메뉴판에 다 두려고 하지 말고, 동영상 레퍼처럼
//      귀엽게 아기자기하게 동그란 버튼을 두든, 여러 메뉴는 내 도량에서 보든」
//
// 맞다. 알을 다섯으로 늘린 것도 결국 탭이었다. 이름만 알로 바꾼 탭.
// **알은 셋뿐이다** — 날마다 손이 가는 자리만.
//   話 화두   오늘의 물음
//   功 공덕   목탁 · 염주 · 싱잉볼
//   緣 절로   손잡고 절로 · 인연 게시판
//   我 나     그리고 나머지 전부가 이 안에 동그란 버튼으로 있다
//
// 하심 · 호흡 · 멍 · 비움 · 법당 초 · 불심 투자 — 다 내 도량 안이다.
// 하루에 한 번 갈까 말까 한 방을 아래 띠에 박아 둘 이유가 없다.
// 연꽃 공양도 오른쪽 위에 이미 있으니 알로 두지 않는다.
// ─────────────────────────────────────────────────────────────

import { usePathname, useRouter } from "next/navigation";

export type Bead = { mark: string; name: string; href: string; also: string[] };

/** 알 셋 — `also` 는 그 알이 품는 방들(그 방에 있어도 이 알이 켜진다) */
export const BEADS: Bead[] = [
  { mark: "話", name: "화두", href: "/", also: ["/my-hwadu", "/archive", "/room"] },
  { mark: "功", name: "공덕", href: "/moktak", also: [] },
  // 형: 「메인 아래 탭은 화두, 손잡고 절로(게시판)」
  { mark: "緣", name: "절로", href: "/gathering", also: ["/pilgrimage"] },
  {
    mark: "我",
    name: "나",
    href: "/settings",
    also: ["/rank", "/hasim", "/breath", "/mung", "/empty", "/candle", "/tamjinchi", "/lotus"],
  },
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
