import { ImageResponse } from "next/og";

// ────────────────────────────────────────────────────────────────
// OG 카드 — 카톡·SNS에 링크를 공유하면 뜨는 미리보기 이미지.
// 오직 앱의 실제 로고(Enso: 일원상 + 연꽃)만, 가운데 크게.
// ────────────────────────────────────────────────────────────────

export const alt = "화두AI — 당신에게 묻는다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1512",
          backgroundImage:
            "radial-gradient(600px 460px at 50% 45%, rgba(217,180,91,0.14), transparent 62%), radial-gradient(520px 420px at 20% 88%, rgba(193,85,59,0.10), transparent 62%), radial-gradient(520px 420px at 82% 82%, rgba(94,127,178,0.10), transparent 62%)",
        }}
      >
        {/* 일원상 + 연꽃 — 앱의 실제 로고(Enso) 그대로, 가운데 크게 */}
        <div
          style={{
            width: 460,
            height: 460,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg
            width="460"
            height="460"
            viewBox="0 0 150 150"
            fill="none"
            style={{ position: "absolute", transform: "rotate(-80deg)" }}
          >
            <defs>
              <linearGradient id="enso-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#E9CD82" />
                <stop offset="0.5" stopColor="#C1553B" />
                <stop offset="1" stopColor="#5E7FB2" />
              </linearGradient>
            </defs>
            <circle
              cx="75"
              cy="75"
              r="66"
              stroke="url(#enso-g)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="382 33"
            />
          </svg>
          <svg
            width="294"
            height="294"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#D9B45B"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute" }}
          >
            <path d="M50 24c6 8 9 15 9 22 0 8-4 14-9 18-5-4-9-10-9-18 0-7 3-14 9-22z" />
            <path d="M50 64c-4-6-11-9-18-8-1 8 3 15 10 18" />
            <path d="M50 64c4-6 11-9 18-8 1 8-3 15-10 18" />
            <path d="M41 66c-6-5-15-6-23-2 1 8 8 14 17 14" opacity="0.85" />
            <path d="M59 66c6-5 15-6 23-2-1 8-8 14-17 14" opacity="0.85" />
            <path d="M30 82c6 3 13 4 20 4s14-1 20-4" opacity="0.5" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
