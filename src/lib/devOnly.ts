// 개발용 화면은 실서버에서 404 — 출시 화면에 남길 물건이 아니다.
// 베르셀 빌드는 VERCEL_ENV=production 이고 내 컴퓨터·미리보기 배포는 아니다.
// 열어 봐야 할 일이 생기면 베르셀 환경변수 HWADU_DEV_OPEN=1 을 넣고 다시 배포한다.
import { notFound } from "next/navigation";

export function closeInProduction() {
  if (process.env.VERCEL_ENV === "production" && process.env.HWADU_DEV_OPEN !== "1") notFound();
}
