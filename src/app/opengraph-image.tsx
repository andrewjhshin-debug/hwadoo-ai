import { ImageResponse } from "next/og";
import { SLOGAN } from "@/lib/config";

// ────────────────────────────────────────────────────────────────
// OG 카드 — 카톡·SNS에 링크를 공유하면 뜨는 미리보기 이미지.
// 앱의 실제 로고(Enso: 일원상 + 연꽃)를 그대로 사용한다.
// ────────────────────────────────────────────────────────────────

export const alt = `화두 話頭 — ${SLOGAN}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const USED_TEXT = `화두話頭 ${SLOGAN} hwa-du.com HWADU`;

async function loadGoogleFont(weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@${weight}&text=${encodeURIComponent(USED_TEXT)}`;
  const css = await (
    await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; rv:10.0) Gecko/20100101 Firefox/10.0",
      },
    })
  ).text();
  const match = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype|woff)'\)/
  );
  if (!match) throw new Error("OG 글꼴을 받아오지 못했습니다");
  return (await fetch(match[1])).arrayBuffer();
}

export default async function OgImage() {
  const [bold, light] = await Promise.all([
    loadGoogleFont(600),
    loadGoogleFont(300),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
          padding: "0 100px",
          backgroundColor: "#1A1512",
          backgroundImage:
            "radial-gradient(600px 400px at 30% 45%, rgba(217,180,91,0.15), transparent 62%), radial-gradient(520px 380px at 12% 88%, rgba(193,85,59,0.10), transparent 62%), radial-gradient(520px 380px at 88% 82%, rgba(94,127,178,0.10), transparent 62%)",
          fontFamily: "NotoSerifKR",
        }}
      >
        {/* 일원상 + 연꽃 — 앱의 실제 로고(Enso) 그대로 */}
        <div
          style={{
            width: 320,
            height: 320,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg
            width="320"
            height="320"
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
            width="205"
            height="205"
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

        {/* 화두 + HWADU + 슬로건 + 도메인 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 120,
              fontWeight: 600,
              color: "#D9B45B",
              letterSpacing: "0.3em",
              textIndent: "0.3em",
              lineHeight: 1,
              textShadow: "0 0 50px rgba(217,180,91,0.3)",
            }}
          >
            화두
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 30,
              fontWeight: 300,
              color: "#9A8C7A",
              letterSpacing: "0.55em",
              textIndent: "0.55em",
            }}
          >
            HWADU
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 30,
              fontWeight: 300,
              color: "#EDE6D4",
              letterSpacing: "0.04em",
              lineHeight: 1.55,
            }}
          >
            {SLOGAN}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 22,
              fontWeight: 300,
              color: "#8A8271",
              letterSpacing: "0.22em",
            }}
          >
            hwa-du.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "NotoSerifKR", data: bold, weight: 600 },
        { name: "NotoSerifKR", data: light, weight: 300 },
      ],
    }
  );
}
