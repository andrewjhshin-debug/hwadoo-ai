"use client";
import { useId } from "react";
import { meritLotusPose } from "@/lib/merit-lotus";
import "./merit-lotus.css";

// ─────────────────────────────────────────────────────────────
// 화두의 연꽃은 **하나다.** 형: 「우리 연꽃은 앞으로 다른 연꽃 있으면 쓰지 마, 딱 이런 실루엣만으로 통일」
// 다섯 잎 — 가운데 한 잎이 곧게 서고, 그 뒤로 두 잎이 비스듬히 서고, 맨 뒤 두 잎이 낮고 넓게 눕는다.
// 안에서 불이 켜진 듯 밑동이 가장 밝고 잎 끝으로 갈수록 분홍이 짙다(앱 아이콘의 빛나는 연꽃과 같은 꽃).
//
// 오늘의 공덕(progress 0~1) 만큼 핀다 — 0 이면 다섯 잎이 한데 모인 봉오리, 1 이면 활짝.
// 그림 파일을 쓰지 않는다: 크기가 어디서든 선명하고, 피는 것이 실제로 잎이 벌어지는 것이 된다.
// ─────────────────────────────────────────────────────────────

// 잎 하나 — 밑동(50,64)에서 끝까지 가는 끝이 둥근 아몬드(곡선 둘). 각도·길이·폭만 바꿔 다섯을 만든다
function 잎(각: number, 길이: number, 폭: number) {
  const r = (각 * Math.PI) / 180;
  const bx = 50, by = 64, ux = Math.sin(r), uy = -Math.cos(r), px = Math.cos(r), py = Math.sin(r);
  const P = (t: number, s: number) => `${(bx + ux * 길이 * t + px * 폭 * s).toFixed(2)} ${(by + uy * 길이 * t + py * 폭 * s).toFixed(2)}`;
  return `M${bx} ${by} C${P(0.25, -1.15)} ${P(0.85, -0.9)} ${P(1, 0)} C${P(0.85, 0.9)} ${P(0.25, 1.15)} ${bx} ${by}Z`;
}

function LotusSvg({ open, className = "", glow = true }: { open: number; className?: string; glow?: boolean }) {
  const id = useId().replaceAll(":", "");
  const p = Math.max(0, Math.min(1, open));
  // 봉오리일 때는 다섯이 한 몸처럼 겹치고, 필수록 벌어진다
  const 뒤 = 72 * p, 옆 = 38 * p;
  const 크기 = 0.8 + 0.2 * p;
  return (
    <svg viewBox="0 0 100 72" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`} cx="50%" cy="78%" r="60%">
          <stop offset="0" stopColor="#ffd2bd" stopOpacity={0.8 * (0.3 + 0.7 * p)} />
          <stop offset="1" stopColor="#ffd2bd" stopOpacity="0" />
        </radialGradient>
        {/* 밑동이 가장 밝다 — 안에서 불이 켜진 연꽃 */}
        <radialGradient id={`${id}p`} cx="50%" cy="100%" r="100%">
          <stop offset="0" stopColor="#fff3e6" />
          <stop offset=".5" stopColor="#f8c3cf" />
          <stop offset="1" stopColor="#ec86a6" />
        </radialGradient>
      </defs>
      {glow && <ellipse cx="50" cy="54" rx="46" ry="22" fill={`url(#${id}g)`} />}
      {/* 연두 받침 — 형: 「원래처럼 밑에 연두색 받침 둬야 해」 */}
      <path d="M22 64 Q50 74 78 64 Q64 70 50 70.5 Q36 70 22 64Z" fill="#b9dca8" />
      <path d="M28 64.5 Q50 71 72 64.5" fill="none" stroke="#9ccb8a" strokeWidth="1.2" strokeLinecap="round" />
      <g transform={`translate(50 64) scale(${크기}) translate(-50 -64)`}>
        <path d={잎(-뒤, 30, 10)} fill={`url(#${id}p)`} opacity=".78" />
        <path d={잎(뒤, 30, 10)} fill={`url(#${id}p)`} opacity=".78" />
        <path d={잎(-옆, 36, 11.5)} fill={`url(#${id}p)`} opacity=".84" />
        <path d={잎(옆, 36, 11.5)} fill={`url(#${id}p)`} opacity=".84" />
        <path d={잎(0, 42, 12.5)} fill={`url(#${id}p)`} opacity=".96" />
      </g>
    </svg>
  );
}

/** 오늘의 공덕 연꽃 — 차는 만큼 핀다 */
export default function MeritLotus({ progress, className = "" }: { progress: number; className?: string }) {
  const pose = meritLotusPose(progress);
  return <LotusSvg open={pose.progress} className={`merit-lotus ${className}`.trim()} />;
}

/** 작은 자리용 연꽃(연꽃 개수·값 표시) — 늘 활짝, 빛 무리는 뺀다(작으면 번진다) */
export function LotusIcon({ className = "" }: { className?: string }) {
  return <LotusSvg open={1} glow={false} className={`merit-lotus ${className}`.trim()} />;
}
