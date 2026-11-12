"use client";

// 오늘의 수행 세 칸 — 법륜 판과 홈이 같이 쓴다.
// 서버는 「오늘」을 모른다(빌드한 날로 굽는다) — 그래서 이 기기에서 장부를 읽은 뒤에만 그린다.
// 서버가 그리면 빌드한 날의 세 칸이 박혀 모든 화면에서 React #418(글자 어긋남)이 났다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { DAILY_EVENT, doneOf, loadDaily, missionsOf, type DailyBook } from "@/lib/daily";

export default function TodayStrip({ tabbable = true }: { tabbable?: boolean }) {
  const [장부, 장부잡기] = useState<DailyBook | null>(null);
  useEffect(() => {
    const 읽기 = () => 장부잡기(loadDaily());
    읽기();
    window.addEventListener(DAILY_EVENT, 읽기);
    return () => window.removeEventListener(DAILY_EVENT, 읽기);
  }, []);
  return (
    <div className="dharma-today" aria-label="오늘의 수행">
      {장부 && missionsOf(장부.day).map((m) => {
        const 한것 = doneOf(m, 장부);
        const 끝 = 한것 >= m.need;
        return (
          <Link key={m.id} href={m.href} data-done={끝 ? "1" : undefined} tabIndex={tabbable ? 0 : -1}>
            <i aria-hidden>{끝 ? "✓" : ""}</i>
            <span>{m.label}</span>
            {!끝 && m.need > 1 && <small>{한것}/{m.need}</small>}
          </Link>
        );
      })}
    </div>
  );
}
