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
import { MERIT_EVENT, todayRoom } from "@/lib/merit";
import { DAILY_EVENT } from "@/lib/daily";
import MeritLotus from "./MeritLotus";

export default function HipDayBar() {
  const [찬만큼, 찬만큼잡기] = useState(0);
  // 방금 쌓였다 — 잠깐 밝아진다. 한 타에 0.003% 라 색만으로는 안 보인다
  const [막쌓임, 막쌓임잡기] = useState(false);
  const 앞값 = useRef(0);
  // 연꽃을 누르면 한 줄 — 형: 「i 마냥, 찼든 안 찼든 간략히」
  const [말, 말잡기] = useState(false);
  useEffect(() => {
    if (!말) return;
    const t = window.setTimeout(() => 말잡기(false), 2600);
    return () => window.clearTimeout(t);
  }, [말]);

  useEffect(() => {
    let timer: number | undefined;
    const 읽기 = () => {
      const { earned, cap } = todayRoom();
      const v = cap > 0 ? Math.max(0, Math.min(1, earned / cap)) : 0;
      if (v > 앞값.current) {
        막쌓임잡기(true);
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => 막쌓임잡기(false), 420);
      }
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
      <span className="hip-daybar-label">오늘의 공덕</span>
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
      <button type="button" className="hip-daybar-lotus" style={{ ["--open" as string]: 찬만큼 }} aria-label="오늘의 공덕이란" onClick={() => 말잡기((v) => !v)}>
        <MeritLotus progress={찬만큼} />
      </button>
      </div>
      {말 && (
        <p className="hip-daybar-tip" role="status">
          {찬만큼 >= 1 ? "오늘 한 송이 피었어요 🪷" : `다 차면 연꽃 한 송이 · ${Math.round(찬만큼 * 100)}%`}
        </p>
      )}
    </div>
  );
}
