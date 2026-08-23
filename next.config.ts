import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin(정확히는 jwks-rsa가 물어오는 jose)이 Turbopack의 서버 번들링을
  // 거치면 ESM/CJS 간섭으로 런타임에서 그대로 죽는다(ERR_REQUIRE_ESM) —
  // 번들에서 빼고 node_modules에서 그대로 require 하게 둔다.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
