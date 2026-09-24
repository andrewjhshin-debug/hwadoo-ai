"use client";

// ─────────────────────────────────────────────────────────────
// 당겨서 새로고침 — 연꽃 한 송이가 돈다.
//
// 형: 「인연 같은 경우는 밑으로 쭈욱 스크롤하면 새로고침 기능 잊지 말고」
//
// 게시판은 남이 쓴 글을 보러 오는 곳이라, 새 글이 붙었는지 **손으로
// 확인할 길**이 있어야 한다. 앱이면 다 되는 그 손짓이 웹이라고 없을
// 까닭이 없다.
//
// 「당겨서 새로고침」이라 적지 않는다 — 형: 「구구절절 텍스트로 설명하는
// 것보다 그냥 손가락으로 만지면서 바로바로 반응」. 당기는 만큼 연꽃이
// 따라 내려오며 커지고 돌아간다. 문턱을 넘으면 색이 든다. 놓으면 돈다.
// 손끝이 먼저 알고, 눈이 나중에 따라온다.
//
// 맨 위에 있을 때만 잡는다. 가운데서 위로 쓸어 올리는 것은 그냥 스크롤이고,
// 가로로 끄는 것은 판 넘기기(HipShell)의 몫이다 — 세로로 확실히 끌 때만
// 우리가 가져간다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

/** 이만큼 당기면 놓았을 때 새로고침이 걸린다 */
const 문턱 = 72;
/** 더 당겨도 이 이상은 안 내려온다 — 고무줄처럼 뻑뻑해진다 */
const 최대 = 116;

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  /** 새로고침 — 끝날 때까지 기다린다(await) */
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const 시작 = useRef<number | null>(null);
  const 시작X = useRef(0);
  const 가로 = useRef(false);

  const 끝내기 = useCallback(async () => {
    const 넘었나 = pull >= 문턱;
    시작.current = null;
    가로.current = false;
    if (!넘었나) {
      setPull(0);
      return;
    }
    // 도는 동안은 자리를 잡아 둔다 — 툭 사라졌다 나타나면 깜빡임이 된다
    setBusy(true);
    setPull(문턱);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
      setPull(0);
    }
  }, [pull, onRefresh]);

  useEffect(() => {
    const 시작하기 = (e: TouchEvent) => {
      if (busy) return;
      if (window.scrollY > 2) return; // 맨 위에서만
      시작.current = e.touches[0].clientY;
      시작X.current = e.touches[0].clientX;
      가로.current = false;
    };
    const 끌기 = (e: TouchEvent) => {
      if (시작.current == null || busy) return;
      const dy = e.touches[0].clientY - 시작.current;
      const dx = e.touches[0].clientX - 시작X.current;
      // 형: 「왜 인연에서 화면 쓸어도 공덕으로 안 가지, 오른쪽으로 쓸어도」
      //
      // 가로로 끄는 손짓까지 내가 물고 있었다. 아래로 조금이라도 흐르면
      // preventDefault 를 걸어 버리니, 판을 넘기려는 쓸기가 중간에 죽었다.
      // **가로가 더 크면 내 일이 아니다** — 판 넘기기(HipShell)에게 넘긴다.
      // 한 번 가로로 판정되면 그 손짓이 끝날 때까지 다시 안 잡는다.
      if (가로.current || (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8)) {
        가로.current = true;
        if (pull) setPull(0);
        시작.current = null;
        return;
      }
      if (dy <= 0) {
        setPull(0);
        시작.current = null;
        return;
      }
      // 고무줄 — 당길수록 덜 따라온다
      const d = Math.min(최대, 최대 * (1 - Math.exp(-dy / 90)));
      if (d > 6) e.preventDefault(); // 브라우저 제 새로고침을 막는다
      setPull(d);
    };
    window.addEventListener("touchstart", 시작하기, { passive: true });
    window.addEventListener("touchmove", 끌기, { passive: false });
    window.addEventListener("touchend", 끝내기);
    window.addEventListener("touchcancel", 끝내기);
    return () => {
      window.removeEventListener("touchstart", 시작하기);
      window.removeEventListener("touchmove", 끌기);
      window.removeEventListener("touchend", 끝내기);
      window.removeEventListener("touchcancel", 끝내기);
    };
  }, [busy, 끝내기]);

  const t = Math.min(1, pull / 문턱);
  const 익음 = pull >= 문턱 || busy;

  return (
    <div className="ptr">
      <span
        aria-hidden
        className={`ptr-mark${익음 ? " on" : ""}${busy ? " spin" : ""}`}
        style={{
          transform: `translate(-50%, ${pull - 44}px) scale(${0.62 + 0.38 * t})`,
          opacity: Math.min(1, t * 1.3),
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 4.2c1.7 2.4 2.4 4.4 2.4 6.3s-1.1 3.7-2.4 4.9c-1.3-1.2-2.4-3-2.4-4.9s.7-3.9 2.4-6.3z" />
          <path d="M12 15.4c-1.9-1.6-4.6-2.3-7.4-2.2.3 2.6 2.4 4.6 5 5 .9.1 1.7 0 2.4-.3" />
          <path d="M12 15.4c1.9-1.6 4.6-2.3 7.4-2.2-.3 2.6-2.4 4.6-5 5-.9.1-1.7 0-2.4-.3" />
        </svg>
      </span>
      <div
        className="ptr-body"
        style={{
          transform: pull ? `translateY(${pull * 0.5}px)` : undefined,
          transition: 시작.current == null ? "transform .3s cubic-bezier(.22,.61,.36,1)" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
