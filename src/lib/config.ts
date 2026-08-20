// ─────────────────────────────────────────────────────────────
// 서비스 설정 — 나중에 바꿀 값들은 전부 여기에 모아 둔다.
// ─────────────────────────────────────────────────────────────

export const SITE_NAME = "화두";
export const SITE_NAME_EN = "HWADU"; // 영문 표기는 hwadu로 통일
// 대표 주소 — Vercel에서 www가 기본(primary)으로 설정되어 있다
export const SITE_URL = "https://www.hwa-du.com";

// 슬로건 — 서비스의 얼굴
export const SLOGAN = "모두가 AI에게 묻는 시대, 화두는 당신에게 묻는다.";
export const SITE_TAGLINE = "AI는 답하지 않습니다. 당신에게 묻습니다.";

// 차 한 잔(찻값 결제) 링크 — 주소가 정해지면 여기만 바꾸면 된다.
// null 이면 "찻자리를 마련하고 있습니다"로 표시된다.
export const DONATION_URL: string | null = "https://qr.kakaopay.com/Fdo2KqicH";

// 문의·광고 이메일 (하이웍스 정리 전까지 gmail로 통일)
export const CONTACT_EMAIL = "admin@ibod.co.kr";

// 관리자 계정 UID — 이 계정으로 로그인해야만 /admin 이 열린다.
// (UID는 이름표일 뿐, 공개되어도 권한과 무관 — 권한은 Firestore 규칙이 지킨다)
export const ADMIN_UID = "HvYY1QPhLiMLc5NezM1jt0QdUiM2";

// 쪽지(모임 1:1 서신) — 아직 닫혀 있다. true 로 바꾸면 모두에게 열린다.
// 닫혀 있는 동안에도 관리자에게는 보인다 — 흐름을 미리 눌러 보기 위함.
// 열 때는 Firestore 규칙의 dm-threads/wallets/reports 블록도 함께 열어야 한다.
export const DM_ENABLED = false;

// 웹푸시(아침 문안) VAPID 키 — 파이어베이스 콘솔 > 프로젝트 설정 > 클라우드 메시징
// > 웹 푸시 인증서의 키 쌍(공개값). 키가 오면 여기만 채우면 된다.
// 비어 있는 동안에는 알림 구획이 "준비 중"으로 표시된다.
export const PUSH_VAPID_KEY =
  "BMvP4X-pCjPq_fZPITtyxpaHKHv_IchD-3OfeE2708oT7GLyHfCV_7V_A22qOjInB6DoidkFugjdCFYabxP7Xo8";
