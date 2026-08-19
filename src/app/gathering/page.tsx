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
      {/* ── 머리 ── */}
      <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        同行 · 모임
      </p>
      <p className="question-glow rise rise-d1 mt-7 text-center font-serif text-xl font-light leading-[1.9] text-hanji">
        절에 가는 길,
        <br />
        <span className="text-gold-grad">함께 가면 더 가볍습니다.</span>
      </p>
      <p className="rise rise-d2 mt-6 break-keep text-center text-[13px] leading-7 text-hanji-dim">
        날을 잡고, 절을 고르고, 함께 갈 이를 모으세요.
        <br className="hidden sm:block" /> 절은 처음이어도 괜찮습니다.
      </p>

      {/* ── 모임 마당 ── */}
      <section className="rise rise-d2 mt-12">
        <GatheringBoard
          variant="full"
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
