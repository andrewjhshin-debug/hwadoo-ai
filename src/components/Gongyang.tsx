"use client";

// ─────────────────────────────────────────────────────────────
// 공양 세 가지 — 연등 · 쌀 · 초.
//
// 형: 「연등 공양, 쌀 공양, 초 공양 이렇게 달 수 있게 하자」
//
// 법당에 거는 것이 하나뿐이면 「연등 판」이지 법당이 아니다. 절에서
// 올리는 것은 원래 여럿이다 — 등을 달고, 쌀을 올리고, 초를 켠다.
//
// 셋이 **한 줄에 나란히 걸린다.** 그러니 서로 키와 폭이 비슷해야 하고,
// 아래 쪽지가 같은 자리에 와야 한다. 세 그림을 따로 그리되 **자리와
// 크기는 하나의 자로 맞춘다** — 연등이 그 자다(Yeondeung.tsx).
//
// 쌀은 왜 그릇인가 — 절에 쌀을 올릴 때는 됫박이나 발우에 담아 올린다.
// 자루를 그리면 시장이고, 그릇에 소복이 담으면 불전이다.
// 초는 왜 불꽃이 위인가 — 등은 매달리고 초는 **선다.** 그래서 같은
// 줄에 걸려도 결이 다르다. 초만 실 끝에 받침 하나를 더 둔다.
// ─────────────────────────────────────────────────────────────

import { useId } from "react";
import Yeondeung from "./Yeondeung";

export type 공양갈래 = "deung" | "ssal" | "cho";

/** 갈래마다 빛깔 한 벌 — 씨로 조금씩 갈린다 */
const 쌀빛 = [
  { 겉: "#d9b45b", 속: "#f1dda6", 심: "#fffaea" },
  { 겉: "#c9a35a", 속: "#ecd6a0", 심: "#fff8e6" },
] as const;
const 초빛 = [
  { 겉: "#e2626f", 속: "#f6a7a7", 심: "#fff2ee" },
  { 겉: "#ef7ba4", 속: "#fbc7da", 심: "#fff0f5" },
] as const;

export default function Gongyang({
  갈래 = "deung",
  name,
  seed = 0,
  drop = 24,
  dim = false,
  onClick,
}: {
  갈래?: 공양갈래;
  name: string;
  seed?: number;
  drop?: number;
  dim?: boolean;
  onClick?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  // 연등은 이미 제 모양을 안다 — 그대로 부른다
  if (갈래 === "deung")
    return <Yeondeung name={name} seed={seed} drop={drop} dim={dim} onClick={onClick} />;

  const 쌀인가 = 갈래 === "ssal";
  const c = 쌀인가 ? 쌀빛[Math.abs(seed) % 쌀빛.length] : 초빛[Math.abs(seed) % 초빛.length];
  // 연등과 같은 박자로 흔들린다 — 한 줄에 걸린 것들이 따로 놀면 안 된다
  const 초 = 4.6 + ((Math.abs(seed) * 7) % 23) / 10;
  const 늦 = ((Math.abs(seed) * 13) % 40) / 10;

  return (
    // 등은 **매달리고** 쌀과 초는 **선다.** 그래서 실도 흔들림도 없다 —
    // 절에서도 등은 천장에, 공양물은 불단 위에 놓인다.
    <button
      type="button"
      onClick={onClick}
      className="hip-gong"
      aria-label={`${name} ${쌀인가 ? "쌀 공양" : "초 공양"}`}
    >
      <span
        className="hip-gong-body"
        style={{ animationDuration: `${초}s`, animationDelay: `-${늦}s` }}
      >
        {/* 연등과 **같은 판**(64×86)을 쓴다 — 한 줄에 섞여 걸려도 키가 안 튄다 */}
        <svg viewBox="0 0 64 70" aria-hidden className="hip-gong-svg">
          <defs>
            <radialGradient id={`g${uid}`} cx="50%" cy="42%" r="56%">
              <stop offset="0" stopColor={c.심} />
              <stop offset="0.55" stopColor={c.속} />
              <stop offset="1" stopColor={c.겉} />
            </radialGradient>
            <filter id={`b${uid}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {쌀인가 ? (
            <>
              {/* ── 쌀 공양 — 발우에 소복이 ── */}
              {/* 소복한 쌀 — 그릇 위로 봉긋 */}
              <path
                d="M14 44c0-10 8-18 18-18s18 8 18 18Z"
                fill={`url(#g${uid})`}
              />
              {/* 낟알 몇 톨 — 가까이 보면 보이고 멀리서는 결로만 */}
              {[
                [26, 36], [32, 32], [38, 36], [23, 41], [41, 41], [32, 40],
              ].map(([x, y]) => (
                <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2.1" ry="1.3"
                  fill={c.겉} opacity="0.35" transform={`rotate(${(x * 7) % 60 - 30} ${x} ${y})`} />
              ))}
              {/* 발우 — 놋빛 그릇 */}
              <path d="M12 44h40l-4 14a6 6 0 0 1-5.8 4.4H21.8A6 6 0 0 1 16 58Z" fill={c.겉} />
              <path d="M12 44h40" stroke={c.심} strokeWidth="2" strokeLinecap="round" opacity="0.75" />
              {/* 굽 */}
              <path d="M26 62.4h12l-1.4 4.2h-9.2Z" fill={c.겉} opacity="0.85" />
            </>
          ) : (
            <>
              {/* ── 초 공양 — 실 끝에 받침, 그 위에 초 ── */}
              {!dim && (
                <ellipse cx="32" cy="26" rx="11" ry="14" fill={c.속} opacity="0.5"
                  filter={`url(#b${uid})`} />
              )}
              {/* 불꽃 */}
              {!dim && (
                <path d="M32 16c3.4 3.2 5 6 5 8.6a5 5 0 1 1-10 0c0-2.6 1.6-5.4 5-8.6Z"
                  fill="#ffd66e" />
              )}
              {!dim && (
                <path d="M32 21c1.6 1.6 2.4 3 2.4 4.3a2.4 2.4 0 1 1-4.8 0c0-1.3.8-2.7 2.4-4.3Z"
                  fill="#fff3c9" />
              )}
              {/* 심지 */}
              <path d="M32 30v4" stroke="#7a5b33" strokeWidth="1.4" strokeLinecap="round" />
              {/* 초 몸통 */}
              <rect x="25" y="33" width="14" height="24" rx="3.2" fill={`url(#g${uid})`} />
              <rect x="27.5" y="35" width="3" height="20" rx="1.5" fill={c.심} opacity="0.5" />
              {/* 받침 — 접시 */}
              <path d="M18 57h28l-2.6 5.4a4 4 0 0 1-3.6 2.2H24.2a4 4 0 0 1-3.6-2.2Z" fill={c.겉} />
              <path d="M18 57h28" stroke={c.심} strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
            </>
          )}
        </svg>
      </span>

      <span className="hip-gong-name" aria-hidden={false}>{name}</span>
    </button>
  );
}
