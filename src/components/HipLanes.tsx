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
  return (
    <div className="hip-lanes" role="tablist" aria-label="무엇을">
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
  );
}
