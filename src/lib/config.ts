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

// 사업자 정보 — 전자상거래법상 하단 표기 의무. 연락처는 070 회선이 나오면
// 그 번호로 바꾼다(그전까지는 이메일로 갈음).
export const BIZ_NAME = "스바하"; // 상호
export const BIZ_OWNER = "신준혁"; // 대표자
export const BIZ_REG_NO = "268-68-00422"; // 사업자등록번호
export const BIZ_MAIL_ORDER_NO = "제2026-고양덕양구-2084호"; // 통신판매업신고번호
export const BIZ_ADDRESS = "경기도 고양시 덕양구 안진6길 23, 201호 (지축동)"; // 소재지
export const BIZ_PHONE: string | null = null; // 준비되면 "0XX-XXXX-XXXX" 로 채운다

// 계좌이체(무통장입금) 수납 계좌 — PG 승인 전까지 연꽃 공양이 이 계좌로 받는다.
// null 이면 /lotus 결제 단계가 "준비 중" 안내로 표시된다.
export const BANK_INFO: { bank: string; account: string; holder: string } | null =
  null; // 예: { bank: "카카오뱅크", account: "3333-00-0000000", holder: "신준혁(스바하)" }

// 관리자 계정 UID — 이 계정으로 로그인해야만 /admin 이 열린다.
// (UID는 이름표일 뿐, 공개되어도 권한과 무관 — 권한은 Firestore 규칙이 지킨다)
export const ADMIN_UID = "HvYY1QPhLiMLc5NezM1jt0QdUiM2";

// 뒷방 부계정 — 이메일로 가른다 (규칙에도 같은 이메일이 올라 있어야 한다)
export const ADMIN_EMAILS = ["iphonecharging1@gmail.com"];

// 이 계정이 뒷방 주인인가 — 본계정(UID) 또는 부계정(이메일)
export function isAdminAccount(
  u?: { uid?: string | null; email?: string | null } | null
): boolean {
  if (!u) return false;
  if (u.uid === ADMIN_UID) return true;
  return !!u.email && ADMIN_EMAILS.includes(u.email.toLowerCase());
}

// 쪽지(게시판 연등 1:1 서신) — 2026-08-20 전면 개방.
// 닫을 일이 생기면 false 로 — Firestore 규칙의 dmOpen() 도 함께 닫는다.
export const DM_ENABLED = true;

// 웹푸시(아침 문안) VAPID 키 — 파이어베이스 콘솔 > 프로젝트 설정 > 클라우드 메시징
// > 웹 푸시 인증서의 키 쌍(공개값). 키가 오면 여기만 채우면 된다.
// 비어 있는 동안에는 알림 구획이 "준비 중"으로 표시된다.
export const PUSH_VAPID_KEY =
  "BMvP4X-pCjPq_fZPITtyxpaHKHv_IchD-3OfeE2708oT7GLyHfCV_7V_A22qOjInB6DoidkFugjdCFYabxP7Xo8";
