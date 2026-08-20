"use client";

// ────────────────────────────────────────────────────────────────
// 모임 — 절에 함께 가는 게시판, 이 화면이 통째로 게시판이다.
// 절로의 지도 팝업·다가오는 날이 주소 파라미터로 절 이름/날짜를
// 미리 채워 보낸다: /gathering?temple=진관사 · ?date=2026-08-25 · ?open=1
// (useSearchParams 는 Suspense 울타리가 필요하다 — Next 규칙)
// ────────────────────────────────────────────────────────────────

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GatheringBoard from "@/components/GatheringBoard";

function GatheringInner() {
  const sp = useSearchParams();
  const temple = sp.get("temple") ?? undefined;
  const date = sp.get("date") ?? undefined;
  const autoOpen = sp.get("open") === "1";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-0 pb-16 pt-4 sm:px-6 md:pt-10">
      <p className="rise px-5 text-center text-[13px] tracking-[0.5em] text-gold-soft sm:px-0">
        모임
      </p>
      <section className="rise rise-d1 mt-4">
        <GatheringBoard
          initialTemple={temple}
          initialDate={date}
          autoOpen={autoOpen}
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
