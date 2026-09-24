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

/** 알 넷 — `also` 는 그 알이 품는 방들(그 방에 있어도 이 알이 켜진다).
    **이 배열이 유일한 원본이다.** 쓸기(HipShell)도 여기서 읽어 간다 */
export const BEADS: Bead[] = [
  { mark: "話", name: "화두", href: "/", also: ["/my-hwadu", "/archive", "/room"] },
  { mark: "功", name: "공덕", href: "/moktak", also: [] },
  // 형: 「메인 아래 탭은 화두, 손잡고 절로(게시판)」
  { mark: "緣", name: "절로", href: "/gathering", also: ["/pilgrimage"] },
  {
    mark: "我",
    // 형: 「아래탭 맨 오른쪽 앱은 연꽃공양 말고 내 도량으로」.
    // 길(href)은 처음부터 내 도량이 맞았다 — 쓸기가 딴 목록을 보고 있었을 뿐.
    // 읽어 주는 이름만 바로잡는다
    name: "내 도량",
    href: "/settings",
    also: ["/rank", "/hasim", "/breath", "/mung", "/empty", "/candle", "/tamjinchi", "/lotus"],
  },
];

export function beadOf(path: string): number {
  const i = BEADS.findIndex((b) => b.href === path || b.also.includes(path));
  return i;
}

export default function HipMala() {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const here = beadOf(path);

  return (
    <nav className="hip-mala" aria-label="네 자리">
      <i aria-hidden className="hip-mala-thread" />
      {BEADS.map((b, k) => (
        <button
          key={b.href}
          onClick={() => {
            // 형: 「연꽃에서 한자 我 눌렀는데 안 가잖아」.
            // 「이 알이 켜져 있으면 갈 데가 없다」고 보고 있었다. 그런데
            // 我 알은 연꽃·하심·법당… 여덟 방을 **품는다** — 그 방에
            // 있으면 알은 켜져 있지만 아직 내 도량에 온 것은 아니다.
            // 막을 것은 **알이 같을 때**가 아니라 **길이 같을 때**다.
            if (path === b.href) return;
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
