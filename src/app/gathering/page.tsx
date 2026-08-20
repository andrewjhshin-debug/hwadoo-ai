"use client";

// ────────────────────────────────────────────────────────────────
// 모임 — 절에 함께 가는 약속의 마당 (구 차담회 자리).
// 손잡고 절로의 지도 팝업·다가오는 날이 주소 파라미터로 절 이름/날짜를
// 미리 채워 보낸다: /gathering?temple=진관사 · ?date=2026-08-25 · ?open=1
// (useSearchParams 는 Suspense 울타리가 필요하다 — Next 규칙)
// ────────────────────────────────────────────────────────────────

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GatheringBoard from "@/components/GatheringBoard";

function GatheringInner() {
  const sp = useSearchParams();
  const temple = sp.get("temple") ?? undefined;
  const date = sp.get("date") ?? undefined;
  const autoOpen = sp.get("open") === "1";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-0 pb-16 pt-3 sm:px-6 md:pt-8">
      {/* 설명 없이 게시판이 화면 전체를 쓴다 */}
      <section className="rise">
        <GatheringBoard
          initialTemple={temple}
          initialDate={date}
          autoOpen={autoOpen}
        />
      </section>

      {/* 절을 고르러 — 지도로 */}
      <Link
        href="/pilgrimage"
        className="rise rise-d2 mt-8 self-center text-[12px] tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
      >
        지도에서 절 고르기 →
      </Link>
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
