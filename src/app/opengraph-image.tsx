import { ImageResponse } from "next/og";
import { SLOGAN } from "@/lib/config";

// ────────────────────────────────────────────────────────────────
// OG 카드 — 카톡·SNS에 링크를 공유하면 뜨는 미리보기 이미지.
// 빌드 시점에 자동 생성된다. 한글 글꼴은 필요한 글자만 구글 폰트에서 받아온다.
// 왼쪽: 일원상(一圓相) + 풍성한 연꽃 / 오른쪽: 화두 + 슬로건 + 도메인
// ────────────────────────────────────────────────────────────────

export const alt = `화두 話頭 — ${SLOGAN}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 이미지에 실제로 쓰이는 글자들만 부분집합으로 요청 (용량 절약)
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
          gap: 70,
          padding: "0 90px",
          backgroundColor: "#0D0B09",
          backgroundImage:
            "radial-gradient(560px 340px at 30% 40%, rgba(217,180,91,0.16), transparent 65%), radial-gradient(520px 380px at 12% 88%, rgba(193,85,59,0.12), transparent 65%), radial-gradient(520px 380px at 90% 78%, rgba(94,127,178,0.11), transparent 65%)",
          fontFamily: "NotoSerifKR",
        }}
      >
        {/* 일원상 + 풍성한 연꽃 */}
        <div
          style={{
            width: 300,
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <svg
            width="300"
            height="300"
            viewBox="0 0 150 150"
            fill="none"
            style={{ transform: "rotate(-80deg)" }}
          >
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#E9CD82" />
                <stop offset="0.5" stopColor="#C1553B" />
                <stop offset="1" stopColor="#5E7FB2" />
              </linearGradient>
            </defs>
            <circle
              cx="75"
              cy="75"
              r="66"
              stroke="url(#g)"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeDasharray="382 33"
            />
          </svg>
          <svg
            width="132"
            height="132"
            viewBox="0 0 48 48"
            fill="none"
            stroke="#D9B45B"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute" }}
          >
            <path d="M24 11c3 3.8 4.5 7.2 4.5 10.4 0 3.4-2 6-4.5 7.6-2.5-1.6-4.5-4.2-4.5-7.6C19.5 18.2 21 14.8 24 11z" />
            <path d="M24 29c-2.7-1.4-5.6-4.2-7-7.7-.6-1.6-.8-3.3-.7-5 2 .8 4.3 2.6 5.7 4.9 1.5 2.4 2.2 5 2 7.8z" />
            <path d="M24 29c2.7-1.4 5.6-4.2 7-7.7.6-1.6.8-3.3.7-5-2 .8-4.3 2.6-5.7 4.9-1.5 2.4-2.2 5-2 7.8z" />
            <path d="M24 29.5c-3.3-.6-7-2.4-9.7-5.4-1.2-1.4-2.1-3-2.6-4.8 2.5.1 5.5 1.4 8 3.8 2.1 2 3.7 4.4 4.3 6.4z" />
            <path d="M24 29.5c3.3-.6 7-2.4 9.7-5.4 1.2-1.4 2.1-3 2.6-4.8-2.5.1-5.5 1.4-8 3.8-2.1 2-3.7 4.4-4.3 6.4z" />
            <path
              d="M13.5 32.5c3 1.7 6.7 2.6 10.5 2.6s7.5-.9 10.5-2.6"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* 화두 + 슬로건 + 도메인 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 30,
              color: "#B99A54",
              letterSpacing: "0.5em",
              fontWeight: 300,
            }}
          >
            話頭
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 132,
              fontWeight: 600,
              color: "#D9B45B",
              letterSpacing: "0.32em",
              textIndent: "0.32em",
              lineHeight: 1,
              textShadow: "0 0 60px rgba(217,180,91,0.35)",
            }}
          >
            화두
          </div>
          <div
            style={{
              marginTop: 34,
              fontSize: 33,
              fontWeight: 300,
              color: "#EDE6D4",
              letterSpacing: "0.04em",
              lineHeight: 1.5,
            }}
          >
            {SLOGAN}
          </div>
          <div style={{ marginTop: 34, display: "flex", gap: 13 }}>
            {["#5E7FB2", "#C1553B", "#D9B45B", "#E8E2D2", "#494340"].map((c) => (
              <div
                key={c}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 99,
                  backgroundColor: c,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 23,
              fontWeight: 300,
              color: "#8A8271",
              letterSpacing: "0.25em",
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
