"use client";

// ─────────────────────────────────────────────────────────────
// 맨 위 한 줄 — 오늘 쌓은 공덕.
//
// 형: 「맨 위에 그 하루치 공덕 쌓이는 거 줄로, 오리지날처럼 하되
//      핑크색으로 표기」
//
// 숫자로 적지 않는다. 「12,340 / 32,400」 은 읽어야 아는 것이고, 줄은
// 보면 아는 것이다(형: 「직관직관직관」). 화면 맨 위 실 한 오라기가
// 하루 동안 왼쪽에서 오른쪽으로 찬다 — 다 차면 연꽃 한 송이다.
//
// 자리를 먹지 않는다. 3px 짜리 줄이 화면 맨 윗선에 걸려 있을 뿐이라
// 어느 판에서도 무엇 하나 밀지 않는다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { MERIT_EVENT, todayRoom } from "@/lib/merit";

export default function HipDayBar() {
  const [찬만큼, 찬만큼잡기] = useState(0);

  useEffect(() => {
    const 읽기 = () => {
      const { earned, cap } = todayRoom();
      찬만큼잡기(cap > 0 ? Math.max(0, Math.min(1, earned / cap)) : 0);
    };
    읽기();
    window.addEventListener(MERIT_EVENT, 읽기);
    return () => window.removeEventListener(MERIT_EVENT, 읽기);
  }, []);

  return (
    <span
      aria-hidden
      className="hip-daybar"
      data-full={찬만큼 >= 1 ? "1" : undefined}
    >
      <i style={{ transform: `scaleX(${찬만큼})` }} />
    </span>
  );
}
