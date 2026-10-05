import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN } from "../sentry.dsn";

// 수행 중에는 화면이 쉴 새 없이 움직인다 — 추적은 조금만 뜬다.
// 사람이 쓴 글은 바깥으로 안 보낸다.
Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
