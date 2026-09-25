"use client";

// ─────────────────────────────────────────────────────────────
// 공양 갈래 띠 — 공덕을 주는 모든 수행이 한 줄에 선다.
//
// 형: 「백팔배 탭 없애고 공덕 키캡 옆으로 옮겨라. 멍 만다라 삼귀의 하심 역시」
//     「호흡명상도 공양에 넣어. 그리고 목탁 염주 키캡처럼 위 메뉴탭 두고
//      똑같이 비율 조정하고, 뜨는 화면 조정도 똑같이. 목탁 염주 키캡이랑
//      구분 안 되도록 이어지도록」
//
// 띠가 /moktak 에만 있으면 방에 들어가는 순간 띠가 사라진다 — 문을 열고
// 들어갔는데 문패가 없어지는 꼴이라, 방마다 다른 앱처럼 보였다.
// 띠를 **한 군데서 만들어 열 자리가 같이 쓴다.** 어느 방에 있든 머리에
// 같은 띠가 걸려 있고, 지금 있는 자리만 알약으로 채워진다.
//
// 앞 넷은 /moktak 안에서 **그 자리에서** 바뀌는 물건이고, 뒤 여섯은 문이
// 열리는 방이다. 방에서 물건 알약을 누르면 /moktak?lane=… 으로 돌아간다 —
// 어느 물건을 보고 있었는지까지 들고 간다.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/** 판 안에서 갈리는 물건 넷 */
export const OBJ_LANES = [
  ["moktak", "목탁"],
  ["yeomju", "염주"],
  ["bowl", "싱잉볼"],
  ["keycap", "키캡"],
] as const;

export type LaneTab = (typeof OBJ_LANES)[number][0];

/** 문이 열리는 방 여섯 */
export const ROOM_LANES = [
  { href: "/bae", label: "백팔배" },
  { href: "/mung", label: "멍" },
  { href: "/breath", label: "호흡" },
  { href: "/mandala", label: "만다라" },
  { href: "/sambae", label: "삼귀의" },
  { href: "/hasim", label: "하심" },
] as const;

export default function HipLanes({
  /** /moktak 에 있을 때 — 지금 켜진 물건 */
  tab,
  /** /moktak 에 있을 때 — 물건 갈기 */
  onTab,
  /** 방에 있을 때 — 그 방의 길(예: "/bae") */
  room,
}: {
  tab?: LaneTab;
  onTab?: (t: LaneTab) => void;
  room?: string;
}) {
  // ── 「옆에 더 있다」를 어떻게 알리나 ────────────────────────
  // 형: 「지금 너무 딱 떨어져서 옆에 넘겨서 메뉴가 있는지 인지가 안 되는데
  //      어떻게 해야 할까, 좌우 화살표 버튼? 고민해서 다시 해 봐」
  //
  // 셋을 겹쳐 쓴다. 하나로는 약하고, 셋이면 안 볼 수가 없다 —
  //   ① **가장자리가 흐려진다** — 끊긴 게 아니라 이어진다는 표
  //   ② **반쯤 걸친 알약** — 딱 떨어지면 「여기까지」로 읽힌다. 일부러
  //      반 칸을 남겨 둔다(scroll-padding). 잘린 것은 눈이 쫓는다
  //   ③ **그쪽에만 뜨는 화살표** — 더 있는 쪽에만. 누르면 한 칸 민다.
  //      없으면 사라진다 — 있는데 눌러도 안 되는 화살표가 제일 나쁘다
  const 띠 = useRef<HTMLDivElement | null>(null);
  const [끝, 끝잡기] = useState({ 왼: false, 오: false });

  const 살피기 = useCallback(() => {
    const el = 띠.current;
    if (!el) return;
    const 남은 = el.scrollWidth - el.clientWidth - el.scrollLeft;
    끝잡기({ 왼: el.scrollLeft > 4, 오: 남은 > 4 });
  }, []);

  useEffect(() => {
    const el = 띠.current;
    if (!el) return;
    살피기();
    el.addEventListener("scroll", 살피기, { passive: true });
    window.addEventListener("resize", 살피기);
    // 지금 자리가 띠 밖에 있으면 끌어다 놓는다 — 어디 있는지부터 보여야 한다.
    //
    // scrollIntoView 로 하면 안 된다. 그것은 **조상까지 전부** 굴린다.
    // 판(.hip-screen)이 배경 덩이 때문에 가로로 조금 넘쳐 있었는데, 띠가
    // 알약을 보이게 하려고 부를 때마다 판이 통째로 옆으로 밀렸다 —
    // 방마다 알약 자리가 다르니 밀린 양도 달라서, 삼귀의는 77, 하심은
    // 119. 형: 「위치 임마, 만다라랑 하심 호흡 멍 다 중앙에」.
    // 띠 제 몸만 굴린다.
    const on = el.querySelector<HTMLElement>('[data-on="1"]');
    if (on) {
      const 가고픈 = on.offsetLeft + on.offsetWidth / 2 - el.clientWidth / 2;
      el.scrollLeft = Math.max(0, Math.min(가고픈, el.scrollWidth - el.clientWidth));
    }
    return () => {
      el.removeEventListener("scroll", 살피기);
      window.removeEventListener("resize", 살피기);
    };
  }, [살피기, tab, room]);

  const 밀기 = (쪽: -1 | 1) => {
    const el = 띠.current;
    if (!el) return;
    el.scrollBy({ left: 쪽 * Math.max(120, el.clientWidth * 0.62), behavior: "smooth" });
  };

  return (
    <div className="hip-lanes-wrap" data-l={끝.왼 ? "1" : undefined} data-r={끝.오 ? "1" : undefined}>
      <button
        type="button"
        className="hip-lane-arrow hip-lane-arrow-l"
        onClick={() => 밀기(-1)}
        aria-label="앞의 갈래 보기"
        tabIndex={끝.왼 ? 0 : -1}
      >
        ‹
      </button>
      <button
        type="button"
        className="hip-lane-arrow hip-lane-arrow-r"
        onClick={() => 밀기(1)}
        aria-label="뒤의 갈래 보기"
        tabIndex={끝.오 ? 0 : -1}
      >
        ›
      </button>
    <div className="hip-lanes" ref={띠} role="tablist" aria-label="무엇을">
      {OBJ_LANES.map(([k, label]) =>
        onTab ? (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            data-on={tab === k ? "1" : undefined}
            onClick={() => tab !== k && onTab(k)}
          >
            {label}
          </button>
        ) : (
          // 방에서 누르면 그 물건을 들고 공양 판으로 돌아간다
          <Link key={k} href={`/moktak?lane=${k}`} className="hip-lane-room">
            {label}
          </Link>
        )
      )}
      {ROOM_LANES.map(({ href, label }) =>
        room === href ? (
          <span key={href} className="hip-lane-room" data-on="1" aria-current="page">
            {label}
          </span>
        ) : (
          <Link key={href} href={href} className="hip-lane-room">
            {label}
          </Link>
        )
      )}
    </div>
    </div>
  );
}
