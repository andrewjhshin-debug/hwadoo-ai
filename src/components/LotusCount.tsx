"use client";

// ─────────────────────────────────────────────────────────────
// 내가 쥔 것 — 연꽃 몇 송이, 공덕 얼마.
//
// 연꽃은 이 도량에서 쓰는 유일한 재화다. 쪽지를 걸 때도, 글에 등을 달 때도,
// 초 한 자루를 켤 때도 한 송이씩 나간다. 그런데 그 수가 「연꽃 공양」
// 안쪽에만 적혀 있었다 — 정작 쓰는 자리에서는 몇 송이 쥐었는지 알 수 없었다.
//
// 공덕도 함께 붙인다. 둘은 한 몸이다 —
// **공덕 6,480 이 연꽃 한 송이**(merit.ts LOTUS_PRICE). 나란히 두지 않으면
// 「이거 모아서 뭐 하는 건데」가 남는다. 누르면 바꾸는 자리로 간다.
//
// 지갑은 서버에 있다(wallets/{uid}). 로그인 전에는 연꽃을 그리지 않는다 —
// 0 송이라고 적어 두면 '없다'는 말이 되는데, 사실은 '아직 모른다'이다.
// 공덕은 이 기기의 장부라 로그인과 상관없이 보여 준다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getLotus } from "@/lib/dm";
import { watchAuth } from "@/lib/sync";
import { LOTUS_PRICE, loadMerit, MERIT_EVENT } from "@/lib/merit";
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
  /** 공덕도 같이 보일까 — 좁은 자리에서는 끈다 */
  merit = true,
}: {
  className?: string;
  look?: "chip" | "line";
  merit?: boolean;
}) {
  const [n, setN] = useState<number | null>(null);
  const [m, setM] = useState<number | null>(null);

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

  // 공덕은 이 기기의 장부 — 그리기 중에 읽으면 서버/브라우저가 어긋난다
  useEffect(() => {
    if (!merit) return;
    const readMerit = () => setM(loadMerit().total);
    readMerit();
    window.addEventListener(MERIT_EVENT, readMerit);
    return () => window.removeEventListener(MERIT_EVENT, readMerit);
  }, [merit]);

  if (n === null && m === null) return null;

  const title =
    n === null
      ? `공덕 ${(m ?? 0).toLocaleString("ko-KR")} — ${LOTUS_PRICE.toLocaleString("ko-KR")}이면 연꽃 한 송이`
      : `연꽃 ${n}송이 · 공덕 ${(m ?? 0).toLocaleString("ko-KR")} — ${LOTUS_PRICE.toLocaleString("ko-KR")}이면 한 송이`;

  if (look === "line") {
    // 맨 글자로 두었더니 곁의 아이콘들에 묻혔다. 옅은 금 테를 둘러
    // 「눌러서 가는 자리」임을 드러낸다.
    return (
      <Link
        href="/lotus"
        title={title}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/25 bg-gold/[0.07] py-[3px] pl-[5px] pr-2 align-middle text-[11px] text-gold-soft transition-colors hover:border-gold/55 hover:bg-gold/15 ${className}`}
      >
        <Yeonkkot className="h-[14px] w-[14px]" />
        {n !== null && <span className="tabular-nums">{n.toLocaleString("ko-KR")}</span>}
        {merit && m !== null && (
          <>
            {n !== null && (
              <span aria-hidden className="text-gold/35">
                ·
              </span>
            )}
            <span className="tabular-nums text-hanji-faint">{m.toLocaleString("ko-KR")}</span>
          </>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/lotus"
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-3 bg-ink-2/50 px-2.5 py-1 text-[11.5px] text-hanji-dim transition-colors hover:border-gold/45 hover:text-hanji ${className}`}
    >
      <Yeonkkot className="h-[15px] w-[15px]" />
      {/* 좁은 화면에서는 「송이 · 공덕」 글자를 접는다 — 알약이 넓어지면
          머리줄의 제목과 겹친다. 아이콘이 연꽃을, 功 이 공덕을 말한다. */}
      {n !== null && (
        <>
          <span className="tabular-nums">{n.toLocaleString("ko-KR")}</span>
          <span className="hidden text-hanji-faint sm:inline">송이</span>
        </>
      )}
      {merit && m !== null && (
        <>
          {n !== null && (
            <span aria-hidden className="text-ink-3">
              |
            </span>
          )}
          <span aria-hidden className="font-serif text-[10px] text-hanji-faint sm:hidden">
            功
          </span>
          <span className="tabular-nums text-gold-soft">{m.toLocaleString("ko-KR")}</span>
          <span className="hidden text-hanji-faint sm:inline">공덕</span>
        </>
      )}
    </Link>
  );
}
