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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16 pt-8 md:pt-12">
      {/* ── 머리 — 게시판이니 말은 아낀다 ── */}
      <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        손잡고 절로 — 모임
      </p>

      {/* ── 모임 마당 ── */}
      <section className="rise rise-d1 mt-8">
        <GatheringBoard
          initialTemple={temple}
          initialDate={date}
          autoOpen={autoOpen}
        />
      </section>

      {/* 절을 고르러 — 지도로 */}
      <Link
        href="/pilgrimage"
        className="rise rise-d3 mt-10 self-center rounded-[10px] border border-ink-3 px-5 py-2.5 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
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
