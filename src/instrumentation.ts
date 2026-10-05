// 서버·엣지에서 센트리를 깨운다 — Next 가 부팅 때 한 번 부른다.
// 형: 「sentry 그거부터 내가 할 거 설명」 → 형은 DSN 한 줄만 주고,
// 붙이는 일은 여기서 끝난다.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

// 서버 컴포넌트·미들웨어에서 난 것도 잡는다
export const onRequestError = Sentry.captureRequestError;
