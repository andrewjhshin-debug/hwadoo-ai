"use client";

// ─────────────────────────────────────────────────────────────
// 화두의 표식 — 물음이 빛이 된다.
//
// 읽는 순서가 곧 이야기다 —
//   ① 머리 위에 뜬 **물음표**   ② 그 물음표 꼬리가 이어져 도는 **끊긴 원**
//   ③ 수행이 쌓이면 원이 닫혀 **광배(光背)**
// 앱이 이미 하는 말("물음표가 광배가 되었어요")이 그대로 표식이다.
// 법륜 바퀴는 어느 절이나 쓴다 — 끊긴 원은 우리 것이다.
//
// 얼굴은 눈 둘만으로는 기괴해진다. 코·입·볼·어깨까지 있어야 사람이 된다.
// 유아 도식대로 눈은 얼굴 한가운데보다 **아래**, 머리는 가로가 살짝 넓게.
// 어깨가 광배 앞을 지나야 머리가 떠 있지 않고 앉아 있는 것으로 읽힌다.
//
// 색은 오로라 — 보라에서 청, 분홍, 금으로 돈다.
// 경쟁 캐릭터가 노랑 단색이라 이 색으로는 부딪히지 않는다.
// ─────────────────────────────────────────────────────────────

import { useId } from "react";

type Props = {
  /** 0(벌어진 물음) ~ 1(닫힌 광배) */
  progress?: number;
  /** 동자를 앉힐지 — 로고는 true, 진행 고리만 쓸 때는 false */
  face?: boolean;
  weight?: number;
  /** 천천히 돈다 — 로딩·대기 */
  spin?: boolean;
  /** 어두운 바탕에서 빛무리를 두른다 */
  glow?: boolean;
  /** 살빛 — 밝은 바탕에서는 먹으로 뒤집는다 */
  skin?: string;
  /** 눈·입 색 */
  ink?: string;
  className?: string;
};

const CX = 50, CY = 48, R = 33;
const C = 2 * Math.PI * R;

/** 끊긴 끝이 위로 말려 물음표가 된다. 머리가 그 물음표의 점이다. */
const HOOK = "M71.2 22.7 C81.5 11.5 73 0.5 59 3.6 C49 5.8 46.6 14.2 50.5 19.4";

/** 동자 — 눈·코·입·볼·귀·어깨. 하나라도 빠지면 사람으로 안 읽힌다. */
function Boy({ skin, ink, uid }: { skin: string; ink: string; uid: string }) {
  return (
    <g>
      {/* 어깨 — 광배 앞을 지나야 앉아 있는 것으로 보인다 */}
      <path d="M28.5 94 C28.5 77 38.5 70 50 70 C61.5 70 71.5 77 71.5 94 Z" fill={skin} />
      {/* 가사 깃 — 오로라 한 줄이 여기서만 옷이 된다 */}
      <path
        d="M42.5 71.5 L50 80 L57.5 71.5"
        fill="none"
        stroke={`url(#a${uid})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 귀 */}
      <ellipse cx="30.6" cy="54.5" rx="4.1" ry="5" fill={skin} />
      <ellipse cx="69.4" cy="54.5" rx="4.1" ry="5" fill={skin} />
      {/* 머리 — 가로가 살짝 넓다 */}
      <ellipse cx="50" cy="51.5" rx="19.4" ry="18.2" fill={skin} />
      {/* 볼 */}
      <circle cx="38.4" cy="59.6" r="3.5" fill="#FB7185" opacity="0.34" />
      <circle cx="61.6" cy="59.6" r="3.5" fill="#FB7185" opacity="0.34" />
      {/* 눈 — 한가운데보다 아래 */}
      <circle cx="43.9" cy="54.4" r="3.05" fill={ink} />
      <circle cx="56.1" cy="54.4" r="3.05" fill={ink} />
      <circle cx="45" cy="53.2" r="1.05" fill="#fff" />
      <circle cx="57.2" cy="53.2" r="1.05" fill="#fff" />
      {/* 코 — 점 하나면 충분하다 */}
      <circle cx="50" cy="59.4" r="1.25" fill={ink} opacity="0.5" />
      {/* 입 */}
      <path
        d="M45.9 62.6 Q50 65.8 54.1 62.6"
        fill="none"
        stroke={ink}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </g>
  );
}

export default function Halo({
  progress = 0.28,
  face = true,
  weight = 6,
  spin = false,
  glow = false,
  skin = "#FDF6E9",
  ink = "#1B1730",
  className = "h-10 w-10",
}: Props) {
  const u = useId().replace(/:/g, "");
  const p = Math.max(0, Math.min(1, progress));
  // 다 닫혀도 실낱만큼은 남긴다 — 물음이 아주 사라지지는 않는다
  const drawn = 0.74 + 0.25 * p;
  const hookAlpha = Math.max(0, 1 - p * 1.9); // 자랄수록 갈고리가 풀린다

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id={`a${u}`} gradientUnits="userSpaceOnUse" x1="12" y1="6" x2="88" y2="90">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.34" stopColor="#38BDF8" />
          <stop offset="0.68" stopColor="#FB7185" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
        {glow && (
          <filter id={`g${u}`} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <g filter={glow ? `url(#g${u})` : undefined}>
        <g transform={`rotate(-90 ${CX} ${CY})`}>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={`url(#a${u})`}
            strokeWidth={weight}
            strokeLinecap="round"
            strokeDasharray={`${C * drawn} ${C}`}
            transform={`rotate(${180 - 180 * drawn} ${CX} ${CY})`}
            style={{ transition: "stroke-dasharray .6s cubic-bezier(.2,.7,.3,1)" }}
          >
            {spin && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${CX} ${CY}`}
                to={`360 ${CX} ${CY}`}
                dur="9s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        </g>

        {hookAlpha > 0.02 && (
          <path
            d={HOOK}
            fill="none"
            stroke={`url(#a${u})`}
            strokeWidth={weight}
            strokeLinecap="round"
            opacity={hookAlpha}
            style={{ transition: "opacity .6s" }}
          />
        )}

        {face && <Boy skin={skin} ink={ink} uid={u} />}
      </g>
    </svg>
  );
}

/** 문자열로 필요할 때 — OG 이미지 · 파비콘 · dangerouslySetInnerHTML */
export function haloSvg(
  progress = 0.28,
  opts: { face?: boolean; weight?: number; uid?: string; skin?: string; ink?: string } = {}
): string {
  const { face = true, weight = 6, uid = "s", skin = "#FDF6E9", ink = "#1B1730" } = opts;
  const p = Math.max(0, Math.min(1, progress));
  const drawn = 0.74 + 0.25 * p;
  const hookAlpha = Math.max(0, 1 - p * 1.9);
  const boy = `<g>
    <path d="M28.5 94 C28.5 77 38.5 70 50 70 C61.5 70 71.5 77 71.5 94 Z" fill="${skin}"/>
    <path d="M42.5 71.5 L50 80 L57.5 71.5" fill="none" stroke="url(#a${uid})"
      stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="30.6" cy="54.5" rx="4.1" ry="5" fill="${skin}"/>
    <ellipse cx="69.4" cy="54.5" rx="4.1" ry="5" fill="${skin}"/>
    <ellipse cx="50" cy="51.5" rx="19.4" ry="18.2" fill="${skin}"/>
    <circle cx="38.4" cy="59.6" r="3.5" fill="#FB7185" opacity="0.34"/>
    <circle cx="61.6" cy="59.6" r="3.5" fill="#FB7185" opacity="0.34"/>
    <circle cx="43.9" cy="54.4" r="3.05" fill="${ink}"/>
    <circle cx="56.1" cy="54.4" r="3.05" fill="${ink}"/>
    <circle cx="45" cy="53.2" r="1.05" fill="#fff"/>
    <circle cx="57.2" cy="53.2" r="1.05" fill="#fff"/>
    <circle cx="50" cy="59.4" r="1.25" fill="${ink}" opacity="0.5"/>
    <path d="M45.9 62.6 Q50 65.8 54.1 62.6" fill="none" stroke="${ink}"
      stroke-width="1.9" stroke-linecap="round"/>
  </g>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="a${uid}" gradientUnits="userSpaceOnUse" x1="12" y1="6" x2="88" y2="90">
    <stop offset="0" stop-color="#8B5CF6"/><stop offset="0.34" stop-color="#38BDF8"/>
    <stop offset="0.68" stop-color="#FB7185"/><stop offset="1" stop-color="#FBBF24"/>
  </linearGradient></defs>
  <g transform="rotate(-90 ${CX} ${CY})">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#a${uid})"
      stroke-width="${weight}" stroke-linecap="round"
      stroke-dasharray="${C * drawn} ${C}"
      transform="rotate(${180 - 180 * drawn} ${CX} ${CY})"/>
  </g>
  ${hookAlpha > 0.02 ? `<path d="${HOOK}" fill="none" stroke="url(#a${uid})"
      stroke-width="${weight}" stroke-linecap="round" opacity="${hookAlpha}"/>` : ""}
  ${face ? boy : ""}
</svg>`;
}
