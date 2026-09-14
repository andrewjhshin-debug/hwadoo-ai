"use client";

// ────────────────────────────────────────────────────────────────
// 공덕 줄 — 화면 맨 위에 붙어 있는 금빛 실 한 가닥.
//
// 어느 방에 있든 지금 백팔 바퀴가 얼마나 찼는지 보인다. 숫자를 또 적으면
// 화면마다 같은 말이 겹치니, 말 대신 **선 하나**로만 말한다.
// 목탁을 칠 때마다 이 선이 조금씩 길어진다 — 그게 쌓이는 맛이다.
//
// 한 바퀴(108)를 넘기면 한 번 번쩍하고 처음으로 돌아간다.
// 스크롤을 따라 붙어 있되(sticky), 손안에서는 위 머리 띠 아래에 선다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { inRound, loadMerit, MERIT_EVENT, ROUND } from "@/lib/merit";

export default function MeritBar() {
  const [total, setTotal] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const last = useRef(0);

  const read = useCallback(() => {
    const t = loadMerit().total;
    // 한 바퀴를 넘었다 — 한 번 번쩍인다
    if (last.current && Math.floor(t / ROUND) > Math.floor(last.current / ROUND)) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    }
    last.current = t;
    setTotal(t);
  }, []);

  useEffect(() => {
    read();
    window.addEventListener(MERIT_EVENT, read);
    return () => window.removeEventListener(MERIT_EVENT, read);
  }, [read]);

  // 서버가 그린 첫 그림과 어긋나지 않게 — 읽기 전에는 빈 줄만
  const pct = total === null ? 0 : (inRound(total) / ROUND) * 100;
  const round = total === null ? 0 : Math.floor(total / ROUND);

  return (
    <div
      aria-hidden
      className="pointer-events-none sticky top-16 z-30 h-[2px] w-full bg-ink-3/60 md:top-0"
    >
      <style>{`
        @keyframes mb-flash { 0%{opacity:.35} 35%{opacity:1} 100%{opacity:.35} }
      `}</style>
      <div
        className="h-full bg-gold transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          boxShadow: flash
            ? "0 0 14px 2px rgba(217,180,91,0.85)"
            : "0 0 6px rgba(217,180,91,0.35)",
          animation: flash ? "mb-flash .9s ease-out" : "none",
        }}
      />
      {/* 몇 바퀴째인지 — 아주 작게, 오른쪽 끝에. 말이 아니라 표식이다 */}
      {round > 0 && (
        <span className="absolute right-2 top-[3px] font-serif text-[9px] leading-none text-gold-soft/70">
          {round}
        </span>
      )}
    </div>
  );
}
