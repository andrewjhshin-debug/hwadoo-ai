// 감시탑 — DSN 은 공개용 값이다(브라우저에 어차피 드러난다). 그래서 코드에
// 둔다 — 형이 베르셀 설정까지 들어가 변수를 넣을 일이 없게. 환경변수가
// 있으면 그쪽이 이긴다(다른 환경에서 갈아 끼울 수 있게).
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://38fec9b608ffcac1582c19c17b212f58@o4512201760047104.ingest.us.sentry.io/4512201768435712";
