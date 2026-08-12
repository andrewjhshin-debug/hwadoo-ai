// ────────────────────────────────────────────────────────────────
// 연지원(蓮池院) — 수행자들의 게시판.
// 게시판 살림은 Board 부품이 맡고, 여기에는 연지원의 말만 둔다.
// ────────────────────────────────────────────────────────────────

import Board from "@/components/Board";

export default function CommunityPage() {
  return (
    <Board
      board="community"
      bowedKey="hwadoo-bowed-v1"
      texts={{
        heading: "蓮池院 · 연지원",
        sub: "수행자들의 게시판 — 글로 나누는 도량",
        write: "글쓰기",
        submit: "글 올리기",
        submitting: "올리는 중…",
        loginNotice: "글과 댓글은 로그인한 분만 남길 수 있습니다.",
        placeholder: "나누고 싶은 이야기를 적어 주십시오.",
        failed: "연지원 문이 잠시 닫혀 있습니다. 잠시 후 다시 들러 주세요.",
        empty: "아직 걸린 글이 없습니다. 첫 이야기를 남겨 보십시오.",
      }}
    />
  );
}
