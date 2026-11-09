"use client";

// ─────────────────────────────────────────────────────────────
// 법륜 판 — 아래 띠 가운데 緣 을 누르면 아래서 오른다.
//
// 형: 「가운데 눌리면 여러 메뉴」 「지금 법륜 없애고」 「불교적으로 우리 디자인 넣어서,
//      가장 효율적으로」 「텍스트 최소화」 → 시안 v5.
// 떠 있던 법륜 단추(옛 InvestmentShortcut)가 품던 것을 다 여기로 옮겼다 —
//   인연(먹 카드 한 장) · 오늘의 수행(가로 세 칸) · 숨은 방 여섯(금빛 선 아이콘).
// 게시판·새 인연·쪽지는 인연 화면 머리에 이미 탭으로 있다 — 여기선 문 하나만 낸다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DAILY_EVENT, doneOf, loadDaily, missionsOf, type DailyBook } from "@/lib/daily";

/** 금빛 선 아이콘 — 로고(public/brand/hwadu-mark-gold.svg)와 같은 결 */
const 선 = {
  board: <><path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5L16 18h-3" /></>,
  enso: <path d="M17.5 5.6A8 8 0 1 0 20 12" strokeWidth={2} />,
  staff: <><path d="M9 21 15 3" /><circle cx="15.6" cy="4.6" r="2.2" /><path d="M12.6 9.5h4" /></>,
  sutra: <><path d="M12 6.5C10 5 7 4.6 3.5 5v13c3.5-.4 6.5 0 8.5 1.5 2-1.5 5-1.9 8.5-1.5V5C17 4.6 14 5 12 6.5Z" /><path d="M12 6.5v13" /></>,
  bowl: <><path d="M3 11h18c0 4.6-4 8-9 8s-9-3.4-9-8Z" /><path d="M9 19.5h6" /></>,
  // 운세 — 산가지 셋이 꽂힌 통(곧게 세우면 손바닥처럼 보인다 — 가지를 부채로 벌린다)
  lots: <><path d="M6.5 11h11l-1.2 9a1.2 1.2 0 0 1-1.2 1H8.9a1.2 1.2 0 0 1-1.2-1Z" /><path d="M9.6 11 7.6 3.6M12 11V3M14.4 11l2-7.4" /></>,
  // 불심투자 — 오르는 선 하나. 형: 「위 말고 요기 넣자, 어울리게」
  stock: <><path d="M3.5 20h17" /><path d="m4 15.5 5-5 4 3 6.5-6.5" /><path d="M14.5 7h5v5" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12C12 7.5 9 5 4.5 5c0 4.5 3 7 7.5 7Z" /><path d="M12 14c0-3.6 2.4-5.6 6.5-5.6 0 3.6-2.4 5.6-6.5 5.6Z" /></>,
};
const 방: { href: string; name: string; ico: keyof typeof 선 }[] = [
  { href: "/ganhwaseon", name: "간화선", ico: "enso" },
  { href: "/masters", name: "선지식", ico: "staff" },
  { href: "/sutra", name: "외우기", ico: "sutra" },
  { href: "/empty", name: "비움", ico: "bowl" },
  { href: "/draw", name: "운세", ico: "lots" },
  { href: "/tamjinchi", name: "불심투자", ico: "stock" },
  { href: "/try", name: "체험하기", ico: "sprout" },
];

function Ico({ k }: { k: keyof typeof 선 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="url(#dharma-gold)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {선[k]}
    </svg>
  );
}

export default function DharmaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [장부, 장부잡기] = useState<DailyBook | null>(null);
  useEffect(() => {
    if (!open) return;
    const 읽기 = () => 장부잡기(loadDaily());
    읽기();
    window.addEventListener(DAILY_EVENT, 읽기);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener(DAILY_EVENT, 읽기); window.removeEventListener("keydown", esc); };
  }, [open, onClose]);

  // 아래로 쓸어 닫기 — 60px 넘게 끌면 닫는다
  const 끌기 = useRef<number | null>(null);
  const [dy, dySet] = useState(0);

  const 오늘셋 = missionsOf(장부?.day);
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs><linearGradient id="dharma-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e7bf62" /><stop offset="1" stopColor="#b07d26" /></linearGradient></defs>
      </svg>
      <button type="button" className="dharma-scrim" data-open={open ? "1" : undefined} aria-label="닫기" tabIndex={open ? 0 : -1} onClick={onClose} />
      <section
        className="dharma-sheet"
        data-open={open ? "1" : undefined}
        aria-label="법륜"
        aria-hidden={!open}
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
        onPointerDown={(e) => { 끌기.current = e.clientY; }}
        onPointerMove={(e) => { if (끌기.current !== null) dySet(Math.max(0, e.clientY - 끌기.current)); }}
        onPointerUp={() => { if (dy > 60) onClose(); 끌기.current = null; dySet(0); }}
        onPointerCancel={() => { 끌기.current = null; dySet(0); }}
      >
        <span className="dharma-grip" aria-hidden />
        <Link href="/gathering" className="dharma-yeon" tabIndex={open ? 0 : -1}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f3d58a" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{선.board}</svg>
          <b>인연</b>
          <span aria-hidden>›</span>
        </Link>
        <div className="dharma-today" aria-label="오늘의 수행">
          {오늘셋.map((m) => {
            const 한것 = 장부 ? doneOf(m, 장부) : 0;
            const 끝 = 한것 >= m.need;
            return (
              <Link key={m.id} href={m.href} data-done={끝 ? "1" : undefined} tabIndex={open ? 0 : -1}>
                <i aria-hidden>{끝 ? "✓" : ""}</i>
                <span>{m.label}</span>
                {!끝 && m.need > 1 && <small>{한것}/{m.need}</small>}
              </Link>
            );
          })}
        </div>
        <div className="dharma-rooms">
          {방.map((r) => (
            <Link key={r.href} href={r.href} tabIndex={open ? 0 : -1}>
              <span><Ico k={r.ico} /></span>
              {r.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
