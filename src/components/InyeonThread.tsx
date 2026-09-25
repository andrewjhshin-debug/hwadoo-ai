"use client";

// ────────────────────────────────────────────────────────────────
// 청실홍실(靑絲紅絲) — 인연이 이어지면 실이 걸린다.
//
// 청실은 음(陰), 홍실은 양(陽). 혼례에 두 실을 함께 걸어 두 기운이
// 맺어짐을 보였다. 글을 올린 이와 함께 가겠다고 붙은 이가 생기면,
// 두 실이 양쪽에서 나와 가운데서 매듭 하나로 묶인다.
//
// ■ 왜 다시 그렸나
//   처음엔 먹빛 바탕에 실 두 줄과 고리 두 개를 그려 놓았다. 뜻은 맞는데
//   도표였다 — 인연이 맺어지는 자리에 어울리는 그림은 아니었다.
//   지금은 **해질 녘**을 깐다. 하늘이 파랑에서 붉은빛으로 넘어가는 그
//   짧은 참 — 옛말로 개와 늑대의 시간, 이쪽과 저쪽이 섞여 누가 누구인지
//   모르게 되는 때다. 인연이 걸리기에 그만한 배경이 없다.
//
// ■ 아련함은 무엇으로 만드나 — 넷이다
//   ① 번짐(bloom)  같은 실을 크게 흐려 아래에 한 겹 깔고, 그 위에 또렷한
//                  한 올을 얹는다. 빛이 번지는 것처럼 보이는 것은 늘
//                  「흐린 것 위에 또렷한 것」이지 밝기가 아니다.
//   ② 옅은 대비    실은 제 색으로 시작해 가운데로 갈수록 금빛으로 바랜다.
//                  두 색이 매듭에서 같은 빛이 되는 것 — 그게 맺음이다.
//   ③ 느린 결      숨 쉬듯 8초, 9초. 빠르면 장식이 되고 느리면 정경이 된다.
//                  서로 나눌 수 없는 주기로 두어 겹치는 자리가 늘 달라진다.
//   ④ 빛 티끌      위로 아주 천천히 올라가는 점 예닐곱. 있는 줄 모르다가
//                  두 번째 볼 때 보인다. 그 자리가 아련함이다.
//
// 실은 그림이지 셈이 아니다. 여기서는 아무 일도 일어나지 않는다.
// ────────────────────────────────────────────────────────────────

import { useId } from "react";

type G = "m" | "f" | null | undefined;

/** 음양에 따른 실 색 — 토큰 밖으로 나가지 않는다 */
function silk(g: G): string {
  if (g === "f") return "var(--color-obang-blue)"; // 청실 · 음
  if (g === "m") return "var(--color-vermilion)"; // 홍실 · 양
  return "var(--color-gold-soft)"; // 밝히지 않은 이 — 묵은 금
}

function label(g: G): string {
  if (g === "f") return "청실";
  if (g === "m") return "홍실";
  return "실";
}

/** 빛 티끌 — 자리와 박자를 미리 정해 둔다(그릴 때마다 흔들리면 안 된다) */
const MOTES = [
  { x: 42, y: 58, r: 1.5, d: 0.0, t: 9.5 },
  { x: 88, y: 66, r: 1.1, d: 2.3, t: 11.0 },
  { x: 133, y: 52, r: 1.7, d: 4.1, t: 8.5 },
  { x: 176, y: 63, r: 1.2, d: 1.2, t: 12.0 },
  { x: 214, y: 57, r: 1.5, d: 5.4, t: 10.0 },
  { x: 256, y: 67, r: 1.0, d: 3.2, t: 13.0 },
];

export default function InyeonThread({
  leftName,
  rightName,
  leftGender,
  rightGender,
  className = "",
  낮 = false,
}: {
  leftName: string;
  rightName: string;
  leftGender?: G;
  rightGender?: G;
  className?: string;
  /**
   * 흰 판(리뉴얼)에 걸 때 — **해질 녘 대신 동틀 녘**.
   *
   * 먹빛 판에서 쓰던 그대로 흰 바탕에 얹으니 검은 상자 하나가 떠 있는
   * 꼴이었다. 뜻(두 기운이 섞이는 짧은 참)은 그대로 두고 시각만 옮긴다 —
   * 해질 녘도 동틀 녘도 이쪽과 저쪽이 섞이는 때다.
   */
  낮?: boolean;
}) {
  // 한 화면에 여러 실이 걸릴 수 있다 — 그라디언트 id 가 겹치면
  // 나중 것이 앞것의 물감을 빼앗는다(연꽃 아이콘에서 한 번 겪었다).
  const uid = useId().replace(/[:]/g, "");
  const gA = `it-a-${uid}`;
  const gB = `it-b-${uid}`;
  const blur = `it-blur-${uid}`;

  const a = silk(leftGender);
  const b = silk(rightGender);

  const LEFT = "M8 30 C 64 28, 96 54, 150 44";
  const RIGHT = "M292 30 C 236 28, 204 54, 150 44";

  return (
    <div className={`w-full ${className}`}>
      <style>{`
        @keyframes it-draw { from { stroke-dashoffset: 320 } to { stroke-dashoffset: 0 } }
        @keyframes it-knot {
          0%   { opacity:0; transform: scale(.5) }
          65%  { opacity:1; transform: scale(1.18) }
          100% { opacity:1; transform: scale(1) }
        }
        /* 실이 숨을 쉰다 — 위아래로 아주 조금 */
        @keyframes it-sway {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(2px) }
        }
        /* 번진 겹은 밝기가 오간다 — 빛이 살아 있게 */
        @keyframes it-breathe {
          0%,100% { opacity:.34 }
          50%     { opacity:.62 }
        }
        /* 티끌 — 위로 떠오르며 사라진다 */
        @keyframes it-mote {
          0%   { opacity:0; transform: translateY(6px) }
          22%  { opacity:.75 }
          72%  { opacity:.35 }
          100% { opacity:0; transform: translateY(-16px) }
        }
        @media (prefers-reduced-motion: reduce) {
          .it-anim { animation: none !important }
        }
      `}</style>

      {/* 해질 녘 — 파랑에서 붉은빛으로 넘어가는 그 짧은 참 */}
      <div
        className="relative overflow-hidden rounded-[16px] border border-ink-3 px-4 pb-3.5 pt-4"
        style={{
          background: 낮
            ? // 동틀 녘 — 흰 종이 위로 청·홍이 아주 옅게 번진다
              "radial-gradient(120% 90% at 18% 118%, rgba(94,127,178,.16), transparent 62%)," +
              "radial-gradient(120% 90% at 82% 118%, rgba(226,110,155,.18), transparent 62%)," +
              "radial-gradient(90% 120% at 50% -10%, rgba(255,214,120,.16), transparent 64%)," +
              "linear-gradient(180deg, #fffdfb, #fdf7f4)"
            : "radial-gradient(120% 90% at 18% 118%, rgba(94,127,178,.20), transparent 62%)," +
              "radial-gradient(120% 90% at 82% 118%, rgba(193,85,59,.20), transparent 62%)," +
              "radial-gradient(90% 120% at 50% -10%, rgba(217,180,91,.10), transparent 64%)," +
              "linear-gradient(180deg, #100e0c, #16120f)",
        }}
      >
        <p className="text-center text-[10px] tracking-[0.46em] text-hanji-faint/80">
          靑絲紅絲
        </p>

        <svg
          viewBox="0 0 300 84"
          className="it-anim mt-1 w-full"
          style={{ animation: "it-sway 8s ease-in-out infinite" }}
          aria-hidden
        >
          <defs>
            {/* 제 색으로 나와 매듭에서 금빛이 된다 — 두 색이 한 빛이 되는 것 */}
            <linearGradient id={gA} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={a} stopOpacity="0.95" />
              <stop offset="72%" stopColor={a} stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={gB} x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor={b} stopOpacity="0.95" />
              <stop offset="72%" stopColor={b} stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0.95" />
            </linearGradient>
            <filter id={blur} x="-30%" y="-120%" width="160%" height="340%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
          </defs>

          {/* ① 번진 겹 — 아래에 깔린다 */}
          <g
            className="it-anim"
            filter={`url(#${blur})`}
            style={{ animation: "it-breathe 9s ease-in-out infinite" }}
          >
            <path d={LEFT} fill="none" stroke={a} strokeWidth="5" strokeLinecap="round" />
            <path d={RIGHT} fill="none" stroke={b} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* ② 또렷한 한 올 */}
          <path
            className="it-anim"
            d={LEFT}
            fill="none"
            stroke={`url(#${gA})`}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeDasharray="320"
            style={{ animation: "it-draw 1.3s cubic-bezier(.25,.8,.25,1) both" }}
          />
          <path
            className="it-anim"
            d={RIGHT}
            fill="none"
            stroke={`url(#${gB})`}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeDasharray="320"
            style={{ animation: "it-draw 1.3s cubic-bezier(.25,.8,.25,1) .18s both" }}
          />

          {/* ③ 매듭 — 고리 둘이 아니라 빛 한 점. 맺음은 겹치는 게 아니라 하나가 되는 것 */}
          <g
            className="it-anim"
            style={{
              transformOrigin: "150px 44px",
              animation: "it-knot .7s cubic-bezier(.2,1.3,.3,1) 1.2s both",
            }}
          >
            <circle cx="150" cy="44" r="9" fill="var(--color-gold)" opacity=".16" filter={`url(#${blur})`} />
            <circle cx="150" cy="44" r="4.6" fill="none" stroke="var(--color-gold)" strokeWidth="1.1" opacity=".55" />
            <circle cx="150" cy="44" r="2.1" fill="var(--color-gold)" />
          </g>

          {/* ④ 실 끝 — 양쪽에서 시작하는 점 */}
          <circle cx="8" cy="30" r="2.2" fill={a} opacity=".9" />
          <circle cx="292" cy="30" r="2.2" fill={b} opacity=".9" />

          {/* ⑤ 빛 티끌 — 두 번째 볼 때 보인다 */}
          {MOTES.map((m, i) => (
            <circle
              key={i}
              className="it-anim"
              cx={m.x}
              cy={m.y}
              r={m.r}
              fill="var(--color-gold-soft)"
              opacity="0"
              style={{
                animation: `it-mote ${m.t}s ease-in-out ${m.d}s infinite`,
              }}
            />
          ))}
        </svg>

        <div className="mt-0.5 flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1 truncate text-left font-serif text-[12.5px] font-light text-hanji-dim">
            {leftName}
            <span className="ml-1.5 align-middle text-[9.5px] tracking-[0.1em]" style={{ color: a }}>
              {label(leftGender)}
            </span>
          </span>
          <span className="shrink-0 font-serif text-[10px] tracking-[0.34em] text-gold-soft/75">
            因緣
          </span>
          <span className="min-w-0 flex-1 truncate text-right font-serif text-[12.5px] font-light text-hanji-dim">
            <span className="mr-1.5 align-middle text-[9.5px] tracking-[0.1em]" style={{ color: b }}>
              {label(rightGender)}
            </span>
            {rightName}
          </span>
        </div>
      </div>
    </div>
  );
}
