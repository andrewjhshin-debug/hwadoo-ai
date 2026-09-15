"use client";

// ─────────────────────────────────────────────────────────────
// 연꽃 몇 송이 — 내가 쥔 것.
//
// 연꽃은 이 도량에서 쓰는 유일한 재화다. 쪽지를 걸 때도, 글에 등을 달 때도,
// 인연에 손을 내밀 때도 한 송이씩 나간다. 그런데 그 수가 「연꽃 공양」
// 안쪽에만 적혀 있었다 — 정작 쓰는 자리(게시판·인연·손잡고 절로)에서는
// 내가 몇 송이 쥐고 있는지 알 수 없었다.
//
// 그래서 한 조각으로 떼어, 쓰는 자리마다 걸 수 있게 했다.
// 누르면 연꽃 공양으로 간다 — 모자라면 그 자리에서 채우라고.
//
// 지갑은 서버에 있다(wallets/{uid}). 로그인 전에는 아무것도 그리지 않는다 —
// 0 송이라고 적어 두면 '없다'는 말이 되는데, 사실은 '아직 모른다'이다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getLotus } from "@/lib/dm";
import { watchAuth } from "@/lib/sync";
import { Yeonkkot } from "@/components/icons";

/** 연꽃이 오갔을 때 이 신호를 쏘면 걸려 있는 모든 셈이 새로 읽는다 */
export const LOTUS_EVENT = "hwadu-lotus-updated";

export function pingLotus() {
  try {
    window.dispatchEvent(new CustomEvent(LOTUS_EVENT));
  } catch {
    /* 서버에서는 할 일이 없다 */
  }
}

export default function LotusCount({
  className = "",
  /** "chip" 알약 하나 · "line" 글줄 안에 끼우는 작은 것 */
  look = "chip",
}: {
  className?: string;
  look?: "chip" | "line";
}) {
  const [n, setN] = useState<number | null>(null);

  const read = useCallback(() => {
    void getLotus()
      .then(setN)
      .catch(() => setN(null));
  }, []);

  useEffect(() => {
    // 로그인 상태가 잡힌 뒤에 읽는다 — 그 전에 물으면 늘 0 이 나온다
    const off = watchAuth((u) => (u ? read() : setN(null)));
    window.addEventListener(LOTUS_EVENT, read);
    return () => {
      off();
      window.removeEventListener(LOTUS_EVENT, read);
    };
  }, [read]);

  if (n === null) return null;

  if (look === "line") {
    return (
      <Link
        href="/lotus"
        title="연꽃 공양으로"
        className={`inline-flex items-center gap-1 align-middle text-[11.5px] text-hanji-dim transition-colors hover:text-gold ${className}`}
      >
        <Yeonkkot className="h-[13px] w-[13px]" />
        {n.toLocaleString("ko-KR")}
      </Link>
    );
  }

  return (
    <Link
      href="/lotus"
      title="내 연꽃 — 눌러서 연꽃 공양으로"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-3 bg-ink-2/50 px-2.5 py-1 text-[11.5px] text-hanji-dim transition-colors hover:border-gold/45 hover:text-hanji ${className}`}
    >
      <Yeonkkot className="h-[15px] w-[15px]" />
      <span className="tabular-nums">{n.toLocaleString("ko-KR")}</span>
      <span className="text-hanji-faint">송이</span>
    </Link>
  );
}
