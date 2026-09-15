"use client";

// ────────────────────────────────────────────────────────────────
// 모임 — 절에 함께 가는 게시판, 이 화면이 통째로 게시판이다.
// 절로의 지도 팝업·다가오는 날이 주소 파라미터로 절 이름/날짜를
// 미리 채워 보낸다: /gathering?temple=진관사 · ?date=2026-08-25 · ?open=1
// (useSearchParams 는 Suspense 울타리가 필요하다 — Next 규칙)
// ────────────────────────────────────────────────────────────────

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import GatheringBoard from "@/components/GatheringBoard";
import TempleEvents from "@/components/TempleEvents";

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

      {/* 다가오는 절 행사 — 아래로 내렸다.
          위에 두었더니 게시판에 오려던 사람이 달력을 먼저 다섯 칸 읽어야 했다.
          여긴 모임 판이다. 글이 먼저 오고, 날짜는 "언제 갈까"가 궁금해진
          다음에 보면 된다. */}
      {view === "list" && (
        <div className="rise rise-d2 mt-10 px-5 sm:px-0">
          <TempleEvents limit={5} days={150} />
        </div>
      )}
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
