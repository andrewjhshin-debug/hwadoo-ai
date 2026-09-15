"use client";

// ────────────────────────────────────────────────────────────────
// 모임 — 절에 함께 가는 게시판, 이 화면이 통째로 게시판이다.
//
// 「다가오는 절 행사」를 여기 달았다가 뺐다. 위에 두면 게시판에 오려던 사람이
// 달력 다섯 칸을 먼저 읽어야 했고, 아래로 내리니 글이 몇 장만 쌓여도 화면
// 저 밑으로 밀려 아무도 못 봤다. 여긴 **글이 줄줄 붙는 판**이다 — 다른 것이
// 끼면 그 흐름이 끊긴다. 행사는 절로(/pilgrimage)로 옮겼다.
// 절로의 지도 팝업·다가오는 날이 주소 파라미터로 절 이름/날짜를
// 미리 채워 보낸다: /gathering?temple=진관사 · ?date=2026-08-25 · ?open=1
// (useSearchParams 는 Suspense 울타리가 필요하다 — Next 규칙)
// ────────────────────────────────────────────────────────────────

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import GatheringBoard from "@/components/GatheringBoard";

function GatheringInner() {
  const sp = useSearchParams();
  const temple = sp.get("temple") ?? undefined;
  const date = sp.get("date") ?? undefined;
  const autoOpen = sp.get("open") === "1";
  // 글 안에 들어가면 머리글도 접는다 — 위 공간을 아낀다
  const [view, setView] = useState<"list" | "post" | "write">("list");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-0 pb-16 pt-4 sm:px-6 md:pt-10">
      {view === "list" && (
        <>
          <p className="rise px-5 text-center text-[13px] tracking-[0.5em] text-gold-soft sm:px-0">
            因緣 · 인연
          </p>
          {/* 만 19세 고지 — 로그인·화면 크기와 무관하게 게시판에서 늘 보인다 */}
          <p className="rise rise-d1 mt-2.5 px-5 text-center text-[11.5px] tracking-wide text-hanji-faint sm:px-0">
            만 19세 이상만 이용할 수 있습니다 · 익명 법명으로 활동합니다
          </p>

        </>
      )}
      <section className={view === "list" ? "rise rise-d1 mt-5" : ""}>
        <GatheringBoard
          initialTemple={temple}
          initialDate={date}
          autoOpen={autoOpen}
          onViewChange={setView}
        />
      </section>

    </div>
  );
}

export default function GatheringPage() {
  return (
    <Suspense fallback={null}>
      <GatheringInner />
    </Suspense>
  );
}
