"use client";

// ─────────────────────────────────────────────────────────────
// 방을 옮기면 맨 위부터 — 화면에 아무것도 그리지 않는다.
//
// 이 앱의 스크롤 통은 창(window)이 아니라 layout 안쪽의 div 다
// (obang-aura · overflow-y-auto). Next 의 기본 스크롤 복원은 창만 보므로,
// 아래 탭에서 다른 방으로 건너가면 **앞 방에서 내려 둔 자리 그대로** 열렸다.
// 열자마자 손가락을 한 번 더 올려야 머리글이 보이는 그 불편이 이것이었다.
//
// 길이 바뀌면 통을 0 으로 되돌린다. 뒤로 가기도 마찬가지다 —
// 어차피 우리 화면은 목록이 짧아 자리를 기억해 줄 이득이 거의 없고,
// 「눌렀는데 엉뚱한 데가 보인다」가 훨씬 크게 거슬린다.
//
// 그리기가 끝난 뒤에 옮겨야 한다. 그리기 중에 옮기면 새 방의 높이가
// 아직 0 이라 아무 일도 안 일어난다 — 두 겹으로 민다(즉시 + 다음 칠).
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollTop() {
  const path = usePathname();

  useEffect(() => {
    const box = document.getElementById("scroll-box");
    const top = () => {
      if (box) box.scrollTop = 0;
      // 창도 함께 — 넓은 화면에서 통 대신 창이 구르는 경우가 있다
      window.scrollTo(0, 0);
    };
    top();
    const id = requestAnimationFrame(top);
    return () => cancelAnimationFrame(id);
  }, [path]);

  return null;
}
