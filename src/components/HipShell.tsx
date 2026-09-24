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
// 그래서 아래에 **실에 꿰인 알**을 둔다. 지금 있는 자리가 큰 알이고,
// 줄을 끌면 알이 넘어가듯 방이 넘어간다. 눌러도 가고, 끌어도 간다.
//
// 알 목록은 여기 없다 — HipMala 에 하나만 둔다. 예전엔 여기에도 따로
// 다섯 칸짜리 목록이 있었고, 그래서 **누르기와 쓸기가 다른 길을 갔다.**
// 목록이 둘이면 반드시 어긋난다.
//
// 차례는 수행의 길 그대로 —
//   話 물음을 받고 → 功 공덕을 쌓고 → 緣 손잡고 절로 → 我 내가 어디까지 왔나
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BEADS, beadOf } from "./HipMala";

/** 손가락이 이만큼은 가야 넘긴다 — 세로로 읽다가 살짝 흔들린 것과 가른다.
    56 에 1.6배는 너무 빡빡했다(가로 60·세로 40 이면 거부). 형: 「쓸어서
    이동 되는 데 오른쪽 왼쪽 다 되도록」 — 잘 안 넘어가는 것도 「안 된다」다 */
const THRESHOLD = 48;
/** 가로가 세로의 이만큼은 넘어야 — 세로로 읽는 손을 뺏지 않을 만큼만 */
const SIDEWAYS = 1.2;

export default function HipShell({
  here,
  children,
}: {
  /** 지금 자리의 주소 — BEADS 의 href(또는 그 알이 품는 방) */
  here: string;
  children: ReactNode;
}) {
  const router = useRouter();
  // 알 목록은 **염주(HipMala)가 유일한 원본**이다.
  // 여기 따로 다섯 칸짜리 목록을 두었더니 누르기와 쓸기가 서로 다른 길을
  // 갔다 — 공덕에서 오른쪽으로 쓸면 아래 띠에 있지도 않은 연꽃공양으로
  // 넘어갔다(형: 「아래탭 맨 오른쪽 앱은 연꽃공양 말고 내 도량으로」).
  // 목록이 둘이면 반드시 어긋난다. 하나만 둔다.
  const i = beadOf(here); // 못 찾으면 -1 — 0 으로 숨기지 않는다
  const [slide, setSlide] = useState<"" | "from-right" | "from-left">("");
  const from = useRef({ x: 0, y: 0, on: false });

  // 어느 쪽에서 들어왔는지 — 넘긴 쪽이 알려 준다(세션에만 잠깐 둔다)
  useEffect(() => {
    try {
      const d = window.sessionStorage.getItem("hwadu.hip.swipe");
      if (d === "next" || d === "prev") {
        window.sessionStorage.removeItem("hwadu.hip.swipe");
        // 효과 안에서 곧바로 setState 하면 렌더가 연쇄로 돈다.
        // 한 틱 미뤄 켜고, 끝나면 끈다
        const on = window.setTimeout(
          () => setSlide(d === "next" ? "from-right" : "from-left"),
          0
        );
        const off = window.setTimeout(() => setSlide(""), 420);
        return () => {
          window.clearTimeout(on);
          window.clearTimeout(off);
        };
      }
    } catch {
      /* 서랍이 막혀 있어도 넘기는 것은 된다 */
    }
  }, [here]);

  // 염주는 고리다 — 끝에서 한 번 더 쓸면 처음으로 돌아온다.
  // 형: 「아래 탭 옆으로 쓸어서 이동 되는 데 오른쪽 왼쪽 다 되도록」.
  // 양 끝에서 한쪽이 막히면 「안 된다」로 읽힌다. 고리는 막히지 않는다.
  const go = (dir: "next" | "prev") => {
    if (i < 0) return; // 염주에 없는 방이면 쓸기도 없다
    const n = BEADS.length;
    const to = BEADS[(i + (dir === "next" ? 1 : -1) + n) % n];
    if (!to || to.href === here) return;
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
        // 가로 쓸기의 임자는 하나여야 한다.
        // 형: 「탭 옮기는 것도 쓸어서 넘기고 염주도 쓸어서 넘기다 보니
        //      중첩돼서 꼬인다」 — 맞다. 염주 위에서 가로로 끄는 손은
        //      알을 넘기려는 손이지 판을 넘기려는 손이 아니다.
        //      data-noswipe 를 단 자리에서 시작한 손짓은 껍데기가 놓는다.
        if ((e.target as Element)?.closest?.("[data-noswipe]")) {
          from.current = { x: 0, y: 0, on: false };
          return;
        }
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
        if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * SIDEWAYS) return;
        go(dx < 0 ? "next" : "prev");
      }}
    >
      {children}
    </div>
  );
}
