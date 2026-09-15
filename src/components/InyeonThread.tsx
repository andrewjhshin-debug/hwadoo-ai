"use client";

// ────────────────────────────────────────────────────────────────
// 청실홍실(靑絲紅絲) — 인연이 이어지면 실이 걸린다.
//
// 청실은 음(陰), 홍실은 양(陽). 혼례에 두 실을 함께 걸어 두 기운이
// 맺어짐을 보였다. 여기서도 글을 올린 이와 함께 가겠다고 붙은 이가
// 생기면, 두 실이 양쪽에서 나와 가운데서 매듭 하나로 묶인다.
//
// 그리는 법 —
//   왼쪽에서 한 올, 오른쪽에서 한 올. 실은 곧지 않고 늘어진다(베지에).
//   매듭은 두 고리가 겹친 모양. 실이 다 그어진 뒤에 살짝 뛴다.
//   실 색은 그 사람의 음양을 따른다 — 모르면 묵은 금으로 둔다.
//
// 실은 그림이지 셈이 아니다. 여기서는 아무 일도 일어나지 않는다.
// ────────────────────────────────────────────────────────────────

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

export default function InyeonThread({
  leftName,
  rightName,
  leftGender,
  rightGender,
  className = "",
}: {
  leftName: string;
  rightName: string;
  leftGender?: G;
  rightGender?: G;
  className?: string;
}) {
  const a = silk(leftGender);
  const b = silk(rightGender);

  return (
    <div className={`w-full ${className}`}>
      <style>{`
        @keyframes it-draw { from { stroke-dashoffset: 300 } to { stroke-dashoffset: 0 } }
        @keyframes it-knot {
          0%   { opacity:0; transform: scale(.4) }
          70%  { opacity:1; transform: scale(1.14) }
          100% { opacity:1; transform: scale(1) }
        }
        @keyframes it-sway {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(1.5px) }
        }
      `}</style>

      <div className="rounded-[14px] border border-ink-3 bg-ink-2/45 px-4 py-4">
        <p className="text-center text-[10px] tracking-[0.42em] text-hanji-faint">
          靑絲紅絲
        </p>

        <svg
          viewBox="0 0 300 74"
          className="mt-1.5 w-full"
          style={{ animation: "it-sway 5.5s ease-in-out infinite" }}
          aria-hidden
        >
          {/* 왼 실 — 늘어졌다가 가운데로 */}
          <path
            d="M6 24 C 62 24, 92 52, 150 40"
            fill="none"
            stroke={a}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="300"
            style={{ animation: "it-draw .9s cubic-bezier(.3,.8,.3,1) both" }}
          />
          {/* 오른 실 */}
          <path
            d="M294 24 C 238 24, 208 52, 150 40"
            fill="none"
            stroke={b}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="300"
            style={{ animation: "it-draw .9s cubic-bezier(.3,.8,.3,1) .12s both" }}
          />

          {/* 매듭 — 두 고리가 겹친다 */}
          <g
            style={{
              transformOrigin: "150px 40px",
              animation: "it-knot .5s cubic-bezier(.2,1.4,.3,1) .85s both",
            }}
          >
            <circle cx="145" cy="40" r="6.5" fill="none" stroke={a} strokeWidth="2" />
            <circle cx="155" cy="40" r="6.5" fill="none" stroke={b} strokeWidth="2" />
            <circle cx="150" cy="40" r="2" fill="var(--color-gold)" />
          </g>

          {/* 실 끝 — 양쪽 매듭점 */}
          <circle cx="6" cy="24" r="2.5" fill={a} />
          <circle cx="294" cy="24" r="2.5" fill={b} />
        </svg>

        <div className="mt-1 flex items-center justify-between gap-3 text-[11.5px]">
          <span className="min-w-0 flex-1 truncate text-left text-hanji-dim">
            {leftName}
            <span className="ml-1.5 text-[10px]" style={{ color: a }}>
              {label(leftGender)}
            </span>
          </span>
          <span className="shrink-0 text-[10.5px] tracking-[0.2em] text-gold-soft">
            인연
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-hanji-dim">
            <span className="mr-1.5 text-[10px]" style={{ color: b }}>
              {label(rightGender)}
            </span>
            {rightName}
          </span>
        </div>
      </div>
    </div>
  );
}
