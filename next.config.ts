import type { NextConfig } from "next";
// v11 에서 설정 감싸개는 하위 경로로 옮겨졌다
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // firebase-admin(정확히는 jwks-rsa가 물어오는 jose)이 Turbopack의 서버 번들링을
  // 거치면 ESM/CJS 간섭으로 런타임에서 그대로 죽는다(ERR_REQUIRE_ESM) —
  // 번들에서 빼고 node_modules에서 그대로 require 하게 둔다.
  serverExternalPackages: ["firebase-admin"],

  // ── 구글 로그인을 **우리 도메인 안에서** 끝낸다 ──────────────
  //
  // 형: 「지금 큰일 난 게 화두 로그인이 안 돼」 (단추가 「여는 중」에서 멈춤)
  //
  // 지금까지 로그인 손잡이(auth handler)는 hwadu-9dc7b.firebaseapp.com 에
  // 있었다. 우리 집은 hwa-du.com 이니 **남의 집 문간을 빌려 쓰는 꼴**이다.
  // 팝업으로 열 때는 그럭저럭 됐는데 —
  //   · 홈 화면에 담아 쓰면(standalone) 팝업을 못 여니 리다이렉트로 가고
  //   · 리다이렉트는 남의 도메인 저장소를 읽어야 하는데, 요즘 브라우저는
  //     그 3자 저장소를 막는다(사파리 ITP · 크롬 3P 쿠키 차단)
  // 그래서 갔다 와도 돌아온 줄을 모르고, 단추는 「여는 중」에 멈춘다.
  //
  // 파이어베이스가 일러 준 길이 이것이다 — 손잡이만 우리 집 주소로
  // 끌어온다. /__/auth/* 를 그대로 넘겨 주고, authDomain 을 hwa-du.com 으로
  // 바꾸면 팝업도 리다이렉트도 **한 집 안**에서 끝난다. 막힐 3자가 없다.
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://hwadu-9dc7b.firebaseapp.com/__/auth/:path*",
      },
    ];
  },

  // ── 헤더 ─────────────────────────────────────────────────
  // 출시 점검(2026-10-28)에서 잰 두 가지.
  //
  // ① 그림·소리·글꼴은 max-age=0 이었다 — 코드만 1년 캐시였다. 그러면 재방문마다
  //    파일 하나하나에 「바뀌었나?」를 묻는다. 느린 망에선 그 왕복이 그림 수만큼
  //    더 든다. 하루는 그냥 쓰고, 그 뒤 일주일은 쓰면서 뒤에서 새로 받는다.
  //    (제자리에서 다시 구운 파일 — sil-*.png, sfx — 이 있어 1년은 못 준다.)
  // ② 보안 헤더는 HTTPS 강제 하나뿐이었다. 다른 사이트가 화두를 액자에 끼워
  //    속이는 것, MIME 추측, 안 쓰는 권한(마이크·결제)을 막는다.
  //    CSP 는 구글 태그·네이버·센트리와 부딪혀 깨질 수 있어 일부러 뺐다.
  async headers() {
    const 하루 = "public, max-age=86400, stale-while-revalidate=604800";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 카메라: 얼굴 인증 · 위치: 포행·절 지도 · 센서: 포행·백팔배. 마이크·결제는 안 쓴다
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), microphone=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
      ...["obj", "brand", "dudu", "sticker", "twin", "images", "seo", "sfx"].map((d) => ({
        source: `/${d}/:path*`,
        headers: [{ key: "Cache-Control", value: 하루 }],
      })),
    ];
  },
};

// ── 감시탑 ──────────────────────────────────────────────
// 터지면 알려 주는 자리. 여태 서버 에러가 어디에도 안 남았다.
// 소스맵 올리기는 SENTRY_AUTH_TOKEN 이 있을 때만 돈다 — 없으면 조용히
// 건너뛰므로 지금처럼 토큰 없이도 빌드가 지나간다.
export default withSentryConfig(nextConfig, {
  org: "hwadu",
  project: "hwadoo-ai",
  silent: !process.env.CI,
  // 광고 차단기가 센트리로 가는 길을 막는다 — 우리 집을 거쳐 보낸다
  tunnelRoute: "/monitoring",
});
