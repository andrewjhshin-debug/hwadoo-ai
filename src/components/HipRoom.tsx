"use client";

// ─────────────────────────────────────────────────────────────
// 방 껍데기 — 백팔배·멍·호흡·만다라·삼귀의·하심이 공양 판과 한 몸이 된다.
//
// 형: 「목탁 염주 키캡처럼 위 메뉴탭 두고 똑같이 비율 조정하고, 뜨는
//      화면 조정도 똑같이. 목탁 염주 키캡이랑 구분 안 되도록 이어지도록」
//
// 여섯 방은 리뉴얼 이전 옷을 그대로 입고 있었다 — 머리띠도 다르고,
// 바탕도 안 번지고, 아래 염주 자리를 안 비켜서 카드가 알을 밟고 있었다.
// 갈래 띠로 이어 놓고 보니 **문을 열 때마다 다른 앱**이었다.
//
// 그래서 공양 판이 쓰던 것을 통째로 빌려 준다 —
//   · HipShell        아래 염주 네 알 · 좌우 쓸기
//   · .hip-screen     바탕 번짐 · 아래 염주 자리(--hip-rail) 비우기
//   · .hip-screen-top 머리 오른쪽 넷(연꽃 셈 · 음소거 · 쪽지 · 我)
//   · HipLanes        갈래 열 — 지금 있는 방이 채워진 알약
// 방은 **제 알맹이만** 들고 오면 된다.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import HipShell from "@/components/HipShell";
import HipLanes from "@/components/HipLanes";
import HipTop from "@/components/HipTop";

export default function HipRoom({
  /** 이 방의 길 — 갈래 띠에서 채워질 알약을 고른다 (예: "/bae") */
  here,
  /** 판이 길면 통으로 만들어 흐르게 한다. 짧은 방은 꺼 둔다 */
  scroll = true,
  children,
}: {
  here: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    // 아래 염주는 늘 功 에 머문다 — 이 여섯은 다 공양 판 안이다
    <HipShell here="/moktak">
      <div className={`hip-screen${scroll ? " hip-screen-scroll" : ""} hip-room`}>
        {/* 숨 쉬는 바탕 — 덩이 둘이 서로 다른 박자로 아주 느리게 흐른다 */}
        <span aria-hidden className="hip-bloom hip-bloom-a" />
        <span aria-hidden className="hip-bloom hip-bloom-b" />

        <header className="hip-screen-top">
          <a href="/" aria-label="화두 홈" className="hip-home">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 4.2c1.7 2.4 2.4 4.4 2.4 6.3s-1.1 3.7-2.4 4.9c-1.3-1.2-2.4-3-2.4-4.9s.7-3.9 2.4-6.3z" />
              <path d="M12 15.4c-1.9-1.6-4.6-2.3-7.4-2.2.3 2.6 2.4 4.6 5 5 .9.1 1.7 0 2.4-.3" />
              <path d="M12 15.4c1.9-1.6 4.6-2.3 7.4-2.2-.3 2.6-2.4 4.6-5 5-.9.1-1.7 0-2.4-.3" />
            </svg>
            <b>화두</b>
          </a>
          <HipTop />
        </header>

        <HipLanes room={here} />

        <div className="hip-screen-mid hip-room-body">{children}</div>
      </div>
    </HipShell>
  );
}
