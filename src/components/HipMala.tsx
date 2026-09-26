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
  // 형: 「아래 탭 중 하나에 법당 하나 넣어. 공덕 옆에 두면 되겠다, 가운데」
  //
  // 법당은 하루에 한 번 갈까 말까 한 방이 아니게 됐다 — 연등·쌀·초 셋을
  // 걸고, 남이 건 것을 보러 온다. 서랍 속에 두면 아무도 안 간다.
  // 자리는 **가운데**다: 공덕을 쌓고(功) → 그 공덕으로 올리고(堂) →
  // 사람을 만난다(緣). 띠를 왼쪽에서 오른쪽으로 읽으면 그게 이 앱이다.
  { mark: "堂", name: "법당", href: "/candle", also: [] },
  // 형: 「메인 아래 탭은 화두, 손잡고 절로(게시판)」
  // 인연 세 방(오늘의 인연 · 내 프로필 · 프로필 보기)도 緣 안이다
  {
    mark: "緣",
    name: "절로",
    href: "/gathering",
    also: ["/pilgrimage", "/gathering/yeon", "/gathering/me", "/gathering/me/view"],
  },
  {
    mark: "我",
    // 형: 「아래탭 맨 오른쪽 앱은 연꽃공양 말고 내 도량으로」.
    // 길(href)은 처음부터 내 도량이 맞았다 — 쓸기가 딴 목록을 보고 있었을 뿐.
    // 읽어 주는 이름만 바로잡는다
    name: "내 도량",
    href: "/settings",
    also: ["/rank", "/hasim", "/breath", "/mung", "/empty", "/tamjinchi", "/lotus"],
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
      {/* 형이 시안 일곱 중 「라 · 뜬 알약」을 골랐다.
          실에 꿴 알 넷은 꺼진 알이 흰 바탕에 흰 알이라 **어디를 눌러야
          하는지**가 약했고, 한자가 켜진 알에만 있어 나머지 셋은 제가
          무엇인지 말하지 못했다. 흰 캡슐 하나가 떠 있고 그 안에 넷 —
          경계가 또렷하고, 넷 다 제 이름을 달고 있다. */}
      <span className="hip-mala-track">
      {BEADS.map((b, k) => (
        <button
          key={b.href}
          onClick={() => {
            // 형: 「연꽃에서 한자 我 눌렀는데 안 가잖아」.
            // 「이 알이 켜져 있으면 갈 데가 없다」고 보고 있었다. 그런데
            // 我 알은 연꽃·하심·법당… 여덟 방을 **품는다** — 그 방에
            // 있으면 알은 켜져 있지만 아직 내 도량에 온 것은 아니다.
            // 막을 것은 **알이 같을 때**가 아니라 **길이 같을 때**다.
            // ── 같은 알을 다시 누르면 **그 갈래의 첫 화면으로** ──
            // 형: 「아래 탭 눌리면 다시 그 메인 화면으로. 인연이면 뒤로
            //      말고, 그냥 아래 탭에서 인연 눌리면 다시 게시판으로」
            //
            // 여태는 길이 같으면 아무것도 안 했다. 그런데 인연 판은
            // 글 읽기·글쓰기를 **같은 길 위에 층으로** 연다(history 층).
            // 그러니 글을 읽는 중에 緣 을 눌러도 길이 같아서 아무 일이
            // 안 일어났고, 뒤로가기로만 나올 수 있었다.
            // 길이 같으면 「첫 화면으로 돌아가라」고 알린다 — 층을 쥔
            // 쪽(게시판)이 제 층을 걷는다.
            if (path === b.href) {
              try {
                window.dispatchEvent(
                  new CustomEvent("hwadu-tab-again", { detail: b.href })
                );
              } catch {
                /* 지나간다 */
              }
              return;
            }
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
      </span>
    </nav>
  );
}
