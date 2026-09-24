"use client";

// ────────────────────────────────────────────────────────────────
// 공덕 줄 — 화면 맨 위에 붙어 있는 금빛 실 한 가닥.
//
// 이 선이 재는 것은 하나다 — **연꽃 한 송이까지 얼마나 왔나.**
//
// 예전엔 「백팔 한 바퀴」를 재고 오른쪽 끝에 몇 바퀴째인지 적었다.
// 그런데 그 수로는 할 일이 달라지지 않는다. 백팔 바퀴를 채워도 아무 일이
// 안 일어나니, 차오르는 것만 보이고 무엇이 차는지는 안 보였다.
// 게다가 내 도량에는 이미 자가 셋 더 있었다(오늘 몫·연꽃·자리) — 넷째 자가
// 화면 맨 위에 늘 붙어 있으니 어느 것이 무슨 뜻인지 아무도 몰랐다.
//
// 이제 연꽃 하나만 잰다. 어느 방에서 목탁을 치든 이 선이 길어지고,
// 끝까지 차면 한 번 번쩍한 뒤 처음으로 돌아간다 — 한 송이가 여물었다는 뜻.
// 숫자는 적지 않는다. 몇 송이 쥐었는지는 연꽃 알약이 말한다.
//
// 스크롤을 따라 붙어 있되(sticky), 손안에서는 위 머리 띠 아래에 선다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { DAILY_TOTAL_CAP, MERIT_EVENT, todayRoom } from "@/lib/merit";

export default function MeritBar() {
  const [bal, setBal] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const last = useRef(0);

  const read = useCallback(() => {
    const b = todayRoom().earned;
    // 한 송이가 여물었다 — 한 번 번쩍인다
    if (
      last.current &&
      b >= DAILY_TOTAL_CAP && last.current < DAILY_TOTAL_CAP
    ) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
    }
    last.current = b;
    setBal(b);
  }, []);

  useEffect(() => {
    read();
    window.addEventListener(MERIT_EVENT, read);
    return () => window.removeEventListener(MERIT_EVENT, read);
  }, [read]);

  // 서버가 그린 첫 그림과 어긋나지 않게 — 읽기 전에는 빈 줄만
  const pct = bal === null ? 0 : (bal / DAILY_TOTAL_CAP) * 100;

  return (
    <div
      aria-hidden
      title="연꽃 한 송이까지"
      className="pointer-events-none sticky top-0 z-30 h-[2px] w-full bg-ink-3/60"
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
          animation: flash ? "mb-flash 1.2s ease-out" : "none",
        }}
      />
    </div>
  );
}
