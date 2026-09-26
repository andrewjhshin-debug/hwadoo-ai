"use client";

// ─────────────────────────────────────────────────────────────
// 연등(蓮燈) — 천장에 걸리는 등 한 개와 그 아래 쪽지.
//
// 형: 「초 공양 대신 저기 만든 연등으로 연등 공양 만들자. 단순 초를
//      연등으로 교체한다고 생각하고. 법당 - 초공양 말고 그냥 법당으로.
//      저 연등을 막 걸고 그 아래 쪽지 적은 디자인. 지금은 말총 같은
//      거잖아, 그거 말고 쪽지 다시 이미지 구워서 달아서.
//      한 30개 함께 있는 모양 … 김부따 어플 같은데 우리만의 독창적 느낌」
//
// ■ 왜 그림이 아니라 SVG 인가
//   등이 서른 개 걸린다. 그림 한 장을 서른 번 깔면 다 똑같이 생긴
//   등이 서른 개다 — 진짜 법당은 그렇지 않다. 등마다 빛깔이 조금씩
//   다르고, 바람에 따로 흔들린다. 선으로 그리면 그게 공짜로 된다.
//   화소도 안 깨지고, 켜진 등과 꺼진 등을 같은 그림으로 쓴다.
//
// ■ 김부따와 무엇이 다른가
//   거기는 **흰 등**이 촘촘히 달리고 그 아래 사각 쪽지가 붙는다.
//   우리는 연꽃 등이다 — 꽃잎이 겹겹이 벌어지고, 속에서 빛이 배어
//   나오고, 아래로 종이 술이 내린다. 쪽지는 한지 조각처럼 결이 있고
//   윗변만 실에 걸려 아래가 살짝 들린다. 물건이 다르면 화면이 다르다.
// ─────────────────────────────────────────────────────────────

import { useId } from "react";

/** 등 빛깔 — 다섯 벌. 같은 등이 서른 개면 법당이 아니라 상품 진열대다 */
const 빛 = [
  { 겉: "#ef7ba4", 속: "#fbc7da", 심: "#fff0f5" },
  { 겉: "#e2626f", 속: "#f6a7a7", 심: "#fff2ee" },
  { 겉: "#d97ab0", 속: "#f3b8d6", 심: "#fff0f8" },
  { 겉: "#e8905a", 속: "#f8c79a", 심: "#fff6ec" },
  { 겉: "#c96a95", 속: "#eeaac8", 심: "#fff1f7" },
] as const;

export default function Yeondeung({
  /** 쪽지에 적히는 이름 */
  name,
  /** 등의 빛깔·흔들림을 가르는 씨. 같은 사람은 늘 같은 등을 단다 */
  seed = 0,
  /** 줄 길이(px) — 층을 지어 걸려면 저마다 달라야 한다 */
  drop = 24,
  /** 꺼진 등 — 다 탄 것은 빛이 죽는다 */
  dim = false,
  onClick,
}: {
  name: string;
  seed?: number;
  drop?: number;
  dim?: boolean;
  onClick?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const c = 빛[Math.abs(seed) % 빛.length];
  // 흔들림은 저마다 다른 박자로 — 서로 나눌 수 없는 초로 두면 겹치는
  // 자리가 늘 달라져서, 스무 개가 한 몸처럼 흔들리는 일이 없다
  const 초 = 4.6 + ((Math.abs(seed) * 7) % 23) / 10;
  const 늦 = ((Math.abs(seed) * 13) % 40) / 10;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hip-deung"
      style={{ "--deung-len": `${drop}px` } as React.CSSProperties}
      aria-label={`${name} 연등`}
    >
      {/* 실 — 천장에서 등까지 */}
      <i className="hip-deung-line" aria-hidden />

      <span
        className="hip-deung-sway"
        style={{ animationDuration: `${초}s`, animationDelay: `-${늦}s` }}
      >
        <svg viewBox="0 0 64 86" aria-hidden className="hip-deung-svg">
          <defs>
            <radialGradient id={`g${uid}`} cx="50%" cy="46%" r="52%">
              <stop offset="0" stopColor={c.심} />
              <stop offset="0.55" stopColor={c.속} />
              <stop offset="1" stopColor={c.겉} />
            </radialGradient>
            <filter id={`b${uid}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* 속에서 배어 나오는 빛 */}
          {!dim && (
            <ellipse
              cx="32" cy="34" rx="20" ry="18"
              fill={c.속} opacity="0.5" filter={`url(#b${uid})`}
            />
          )}

          {/* 걸이 — 짧은 고리 */}
          <path d="M32 6v5" stroke={c.겉} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="32" cy="12.5" rx="5" ry="2.2" fill={c.겉} opacity="0.9" />

          {/* 몸통 — 둥근 등 */}
          <ellipse cx="32" cy="34" rx="21" ry="19" fill={`url(#g${uid})`} />

          {/* 꽃잎 — 세 겹. 위로 갈수록 작고, 겹친 자리가 저절로 진해진다 */}
          <g fill={c.겉} opacity="0.5">
            {[-30, -10, 10, 30].map((a) => (
              <ellipse key={`t${a}`} cx="32" cy="24" rx="6.4" ry="9"
                transform={`rotate(${a} 32 34)`} />
            ))}
          </g>
          <g fill={c.겉} opacity="0.62">
            {[-52, -26, 0, 26, 52].map((a) => (
              <ellipse key={`m${a}`} cx="32" cy="30" rx="7.4" ry="11"
                transform={`rotate(${a} 32 36)`} />
            ))}
          </g>
          <g fill={c.겉} opacity="0.78">
            {[-64, -32, 0, 32, 64].map((a) => (
              <ellipse key={`b${a}`} cx="32" cy="38" rx="8.2" ry="12"
                transform={`rotate(${a} 32 36)`} />
            ))}
          </g>

          {/* 아래 술 — 종이 오라기 */}
          <path d="M32 52v7" stroke={c.겉} strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <path d="M28.5 59h7l-1.2 9a2.3 2.3 0 0 1-4.6 0Z" fill={c.겉} opacity="0.9" />
          {[30, 32, 34].map((x, i) => (
            <path key={x} d={`M${x} 68v${7 + (i === 1 ? 3 : 0)}`}
              stroke={c.겉} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
          ))}
        </svg>
      </span>

      {/* 쪽지 — 윗변만 걸려 아래가 살짝 들린다 */}
      <span className="hip-deung-note" aria-hidden={false}>
        <b>{name}</b>
      </span>
    </button>
  );
}
