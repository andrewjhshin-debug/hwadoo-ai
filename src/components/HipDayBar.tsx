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

import { useEffect, useRef, useState } from "react";
import { MERIT_EVENT, todayRoom, yesterdayShare } from "@/lib/merit";
import { DAILY_EVENT, streakOf } from "@/lib/daily";
import MeritLotus from "./MeritLotus";

export default function HipDayBar() {
  const [찬만큼, 찬만큼잡기] = useState(0);
  // 형: 「적용해」(얼마 했고 얼마 남았는지 숫자, 며칠째) — 줄은 그대로 두고 이름표 옆에 작게 적는다
  const [셈, 셈잡기] = useState<{ earned: number; cap: number; days: number; yday: number | null } | null>(null);
  // 방금 쌓였다 — 잠깐 밝아진다. 한 타에 0.003% 라 색만으로는 안 보인다
  const [막쌓임, 막쌓임잡기] = useState(false);
  const 앞값 = useRef(0);

  useEffect(() => {
    // 앱이 떴다 — realm.ts 가 이제 운력을 계급 셈에 얹어도 첫 그림과 안 어긋난다
    (window as { __hwaduLive?: boolean }).__hwaduLive = true;
    let timer: number | undefined;
    const 읽기 = () => {
      const { earned, cap } = todayRoom();
      const v = cap > 0 ? Math.max(0, Math.min(1, earned / cap)) : 0;
      if (v > 앞값.current) {
        막쌓임잡기(true);
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => 막쌓임잡기(false), 420);
      }
      셈잡기({ earned, cap, days: streakOf(), yday: earned > 0 ? null : yesterdayShare() });
      앞값.current = v;
      찬만큼잡기(v);
    };
    const initial = window.setTimeout(읽기, 0);
    window.addEventListener(MERIT_EVENT, 읽기);
    window.addEventListener(DAILY_EVENT, 읽기);
    window.addEventListener("storage", 읽기);
    document.addEventListener("visibilitychange", 읽기);
    return () => { window.clearTimeout(initial); if (timer !== undefined) window.clearTimeout(timer); window.removeEventListener(MERIT_EVENT, 읽기); window.removeEventListener(DAILY_EVENT, 읽기); window.removeEventListener("storage", 읽기); document.removeEventListener("visibilitychange", 읽기); };
  }, []);

  return (
    <div
      className="hip-daybar"
      data-full={찬만큼 >= 1 ? "1" : undefined}
      data-tick={막쌓임 ? "1" : undefined}
    >
      <span className="hip-daybar-label">
        오늘의 공덕
        {셈 && 셈.cap > 0 && <> <b>{Math.floor(셈.earned).toLocaleString()}</b> / {셈.cap.toLocaleString()}</>}
        {/* 하루치는 자정에 0 으로 돌아간다(하루 한 송이). 오늘 첫 획 전엔 어제 얼마나 채웠는지 한 마디 */}
        {셈 && 셈.yday !== null && 셈.yday > 0 && <small> · 어제 {Math.round(셈.yday * 100)}%</small>}
        {셈 && 셈.days > 1 && <em>{셈.days}일째</em>}
      </span>
      <div className="hip-daybar-row">
      <span className="hip-daybar-track" role="progressbar" aria-label="오늘의 공덕" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(찬만큼 * 100)} aria-valuetext={찬만큼 >= 1 ? "오늘의 공덕을 모두 채웠어요" : `${Math.round(찬만큼 * 100)}%`}>
      {/* 하루 천장이 32,400(= 연꽃 한 송이)이라 목탁 한 타는 0.003% 다.
          그대로 그리면 하루 종일 쳐도 줄이 안 움직이는 것처럼 보인다 —
          형: 「왜 안 해」. 안 한 게 아니라 **안 보였다.**
          한 톨이라도 쌓였으면 최소한 한 뼘은 보이게 두고, 쌓인 순간에는
          잠깐 밝아진다. 그래야 「지금 내 것이 붙었다」가 손끝에 읽힌다. */}
      <i style={{ transform: `scaleX(${찬만큼 > 0 ? Math.max(0.018, 찬만큼) : 0})` }} />
      </span>
      {/* 연꽃 — 찬 만큼 꽃잎이 벌어진다. 다 차면 활짝. 누르면 한 줄 */}
      {/* 형: 「연꽃 다 차면… 밤티 같은 문구 아예 없고」 — 누르면 뜨던 한 줄을 걷었다. 숫자는 이름표에 이미 있다 */}
      <span className="hip-daybar-lotus" style={{ ["--open" as string]: 찬만큼 }} aria-hidden>
        <MeritLotus progress={찬만큼} />
      </span>
      </div>
    </div>
  );
}
