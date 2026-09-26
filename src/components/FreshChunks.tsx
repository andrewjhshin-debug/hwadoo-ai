"use client";

// ─────────────────────────────────────────────────────────────
// 묵은 조각 — 배포가 지나간 뒤 열려 있던 판을 되살린다.
//
// 형: 「인연 프로필 채우려면 계속 이렇게 뜸」 (This page couldn't load)
//
// 무슨 일인가 —
//   Next 는 판을 조각(chunk)으로 잘라 두고, 방을 옮길 때 그 방 몫만
//   따로 받아 온다. 조각 이름에는 **판 번호**가 박혀 있다.
//   그런데 배포를 한 번 하면 그 번호가 통째로 갈린다. 폰에 이미 열려
//   있던 판은 **옛 번호**를 쥐고 있으니, 거기서 방을 옮기는 순간
//   없는 파일을 부르러 간다 → 받아오지 못하고 「이 페이지를 불러올 수
//   없습니다」.
//   베타라 하루에도 몇 번씩 올리니, 형 폰에서는 이게 늘 일어난다.
//
// 고치는 법은 하나뿐이다 — **판을 새로 받는다.**
//   묵은 조각 때문에 넘어진 것을 알아보고 그 자리에서 다시 연다.
//   무한히 되풀이하지 않게 한 번만(세션에 표를 남긴다).
//
// 왜 화면에 아무것도 안 그리나 — 이건 물건이 아니라 **고치는 일**이다.
// 사람 눈에는 「눌렀더니 잠깐 깜빡하고 열렸다」로만 보이면 된다.
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react";

const 표 = "hwadu.freshen";

/** 묵은 조각 때문에 넘어진 것인가 */
function 묵었나(x: unknown): boolean {
  const m =
    typeof x === "string"
      ? x
      : x instanceof Error
        ? `${x.name} ${x.message}`
        : String(x ?? "");
  return (
    /ChunkLoadError/i.test(m) ||
    /Loading chunk [\w-]+ failed/i.test(m) ||
    /Loading CSS chunk/i.test(m) ||
    // 사파리는 남의 말로 적는다 — 「가져오기 모듈 스크립트 실패」
    /error loading dynamically imported module/i.test(m) ||
    /Importing a module script failed/i.test(m)
  );
}

export default function FreshChunks() {
  useEffect(() => {
    // ── 표를 **바로 지우면 안 된다** ──────────────────────
    // 처음엔 뜨자마자 지웠다. 그러면 「넘어짐 → 다시 열기 → 뜨자마자
    // 표 지움 → 또 넘어짐 → 또 다시 열기」로 **끝없이 돈다.**
    // 브라우저는 그걸 보다가 「이 페이지를 불러올 수 없습니다」로 손을
    // 든다 — 고치려던 바로 그 창이 더 자주 뜬다.
    // 스무 초를 버텼으면 그때 지운다. 그 안에 또 넘어지면 표가 살아
    // 있으니 다시 열지 않고, 넘어진 채로 둔다(적어도 화면은 남는다).
    const 치우개 = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(표);
      } catch {
        /* 사생활 창에서는 서랍이 막힌다 */
      }
    }, 20_000);

    const 되살리기 = () => {
      try {
        if (window.sessionStorage.getItem(표)) return; // 이미 한 번 했다
        window.sessionStorage.setItem(표, "1");
      } catch {
        return;
      }
      // 주소는 그대로, 판만 새로. replace 라 뒤로 가기에 자국이 안 남는다
      window.location.replace(window.location.href);
    };

    const 넘어짐 = (e: ErrorEvent) => {
      if (묵었나(e.message) || 묵었나(e.error)) 되살리기();
    };
    const 삼킨넘어짐 = (e: PromiseRejectionEvent) => {
      if (묵었나(e.reason)) 되살리기();
    };

    window.addEventListener("error", 넘어짐);
    window.addEventListener("unhandledrejection", 삼킨넘어짐);
    return () => {
      window.clearTimeout(치우개);
      window.removeEventListener("error", 넘어짐);
      window.removeEventListener("unhandledrejection", 삼킨넘어짐);
    };
  }, []);

  return null;
}
