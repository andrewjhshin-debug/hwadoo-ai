import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN } from "./sentry.dsn";

// 사람이 쓴 글(사연·쪽지)은 바깥 서버로 안 보낸다. v11 은 기본이 그렇고,
// 혹 기본이 바뀌어도 여기 주석이 뜻을 남긴다 — 에러를 보자고 남의
// 기도문을 올릴 수는 없다.
Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
