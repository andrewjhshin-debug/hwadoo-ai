import { ImageResponse } from "next/og";
import { SLOGAN } from "@/lib/config";

// ─────────────────────────────────────────────────────────────
// OG 카드 — 카톡·SNS에 링크를 공유하면 뜨는 미리보기 이미지.
// 빌드 시점에 자동 생성된다. 한글 글꼴은 필요한 글자만 구글 폰트에서 받아온다.
// ─────────────────────────────────────────────────────────────

export const alt = `화두 話頭 — ${SLOGAN}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 이미지에 실제로 쓰이는 글자들만 부분집합으로 요청 (용량 절약)
const USED_TEXT = `화두話頭 ${SLOGAN} hwa-du.com HWADU`;

async function loadGoogleFont(weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@${weight}&text=${encodeURIComponent(USED_TEXT)}`;
  // 오래된 UA로 요청하면 satori가 읽을 수 있는 ttf/otf 형식을 준다
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0D0B09",
          backgroundImage:
            "radial-gradient(560px 340px at 50% 32%, rgba(217,180,91,0.16), transparent 65%), radial-gradient(520px 380px at 15% 85%, rgba(193,85,59,0.12), transparent 65%), radial-gradient(520px 380px at 85% 80%, rgba(94,127,178,0.11), transparent 65%)",
          fontFamily: "NotoSerifKR",
        }}
      >
        <div
          style={{
            fontSize: 34,
            color: "#B99A54",
            letterSpacing: "0.5em",
            fontWeight: 300,
          }}
        >
          話頭
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 150,
            fontWeight: 600,
            color: "#D9B45B",
            letterSpacing: "0.35em",
            textIndent: "0.35em",
            textShadow: "0 0 60px rgba(217,180,91,0.35)",
          }}
        >
          화두
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 34,
            fontWeight: 300,
            color: "#EDE6D4",
            letterSpacing: "0.06em",
          }}
        >
          {SLOGAN}
        </div>
        <div
          style={{
            marginTop: 52,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {["#5E7FB2", "#C1553B", "#D9B45B", "#E8E2D2", "#494340"].map((c) => (
            <div
              key={c}
              style={{
                width: 9,
                height: 9,
                borderRadius: 99,
                backgroundColor: c,
                opacity: 0.75,
              }}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 24,
            fontWeight: 300,
            color: "#8A8271",
            letterSpacing: "0.25em",
          }}
        >
          hwa-du.com
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
