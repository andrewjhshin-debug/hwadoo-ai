// 인연 값 — 화면과 서버가 같은 표를 본다.
// 형: 「쪽지방 파는 거만 연꽃 받고, 쪽지 보낼 때마다는 과금 안 한다」
//     「호감 보내기 하고 상대가 받으면 번호나 카톡 아이디 열기」
export const LIKE = 1; // 호감 보내기
export const LIKE_SINCERE = 3; // 진심 — 받은 호감함 맨 위, 처음부터 누군지 보인다
export const LIKE_REVEAL = 1; // 받은 호감 — 누군지 다 보기(그날 하루)
export const ROOM = 3; // 쪽지방 열기 — 먼저 여는 쪽이 한 번만. 그 뒤 쪽지는 무제한 무료
export const DM_CONTACT = 5; // 번호·카톡 열기 — 각자
export const DM_CONTACT_BOTH = 9; // 둘 다 내가
export const DM_READ_PASS = { n: 2, days: 7 } as const; // 읽음 확인
export const DM_REVEAL = LIKE_REVEAL; // 옛 이름 — /api/dm/threads 의 「다 보기」가 받은 호감함과 같은 표를 쓴다
