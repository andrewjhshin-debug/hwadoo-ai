import type { NextConfig } from "next";

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
};

export default nextConfig;
