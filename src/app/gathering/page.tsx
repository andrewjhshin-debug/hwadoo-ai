// ────────────────────────────────────────────────────────────────
// 명상 모임 — 함께 앉을 자리를 열고 모으는 게시판.
// 연지원과 같은 게시판 포맷이므로 살림은 Board 부품이 맡고,
// 여기에는 모임 마당의 말만 둔다. (board="gathering")
// ────────────────────────────────────────────────────────────────

import Board from "@/components/Board";

export default function GatheringPage() {
  return (
    <Board
      board="gathering"
      bowedKey="hwadoo-bowed-gathering-v1"
      texts={{
        heading: "명상 모임",
        sub: "함께 앉는 자리 — 모임을 열고, 함께할 이를 만나다",
        write: "모임 열기",
        submit: "모임 열기",
        submitting: "여는 중…",
        loginNotice: "모임 열기와 댓글은 로그인한 분만 남길 수 있습니다.",
        placeholder: "언제, 어디서, 어떻게 모일지 적어 주십시오.",
        failed: "모임 마당이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.",
        empty: "아직 열린 모임이 없습니다. 첫 모임을 열어 보십시오.",
      }}
    />
  );
}
