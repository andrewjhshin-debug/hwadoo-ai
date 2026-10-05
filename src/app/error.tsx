"use client";

// 무언가 어긋났을 때 — 여태 이 자리가 비어 있었다.
// 그리기 중에 예외가 나면 Next 의 기본 영문 화면이 떴다. 한글 앱에서
// 영문 스택이 보이는 순간 사람은 「망가졌다」가 아니라 「속았다」로 읽는다.
//
// 길이 끊긴 자리(not-found)와 같은 결로 둔다. 다만 여기서는 **다시
// 해 볼 수 있다** — reset() 이 그 판만 새로 그린다.

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import Enso from "@/components/Enso";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에도 남기고, 감시탑에도 올린다
    console.error("[화두]", error);
    // 감시탑에도 알린다 — DSN 이 없으면 init 이 안 돌았으므로 조용히 지나간다
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rise opacity-70">
        <Enso size={110} />
      </div>
      <p className="rise rise-d1 mt-8 text-xs tracking-[0.5em] text-gold-soft">
        어긋난 자리
      </p>
      <p className="rise rise-d1 mt-6 font-serif text-lg font-light leading-9 text-hanji">
        잠시 길이 흐려졌습니다.
      </p>
      <p className="rise rise-d2 mt-2 text-[13px] leading-7 text-hanji-dim">
        다시 해 보시면 대개 이어집니다.
      </p>
      <div className="rise rise-d3 mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="btn-obang px-8 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
        >
          다시
        </button>
        <Link
          href="/"
          className="rounded-full border border-ink-3 px-7 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:text-hanji"
        >
          도량으로
        </Link>
      </div>
      {/* 자취 번호 — 형에게 말할 때 이것 하나면 로그에서 찾힌다 */}
      {error.digest && (
        <p className="rise rise-d3 mt-6 text-[10px] tracking-wider text-hanji-faint">
          자취 {error.digest}
        </p>
      )}
    </div>
  );
}
