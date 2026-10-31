"use client";

// ─────────────────────────────────────────────────────────────
// 법륜 단추 — 아래 띠 오른쪽 위에 떠 있는 동그라미.
//
// 형: 「이 동그라미를 법륜 정도로 하고 눌리면 위로 똥똥똥 동그라미
//      버튼 나오면서 그간 숨겨진 메뉴 띄우라고」
//
// 여태는 불심투자 하나로만 가는 지름길이었다. 내 도량(我) 안에만
// 묻혀 있던 방들 — 비움·불심투자·하심·호흡·멍·연꽃·정진 — 을 이
// 바퀴가 품는다. 누르면 위로 알이 차례로 튀어 오른다 — 이모지 알에
// 한글 이름표. 형: 「한자 말고 한글이든 이모지로」
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dharmachakra } from "./icons";

/** 잘 안 보이고 숨어 있던 것 — 형이 동그라미 친 다섯. 아래가 먼저 튀어 오른다 */
const 알: { href: string; mark: string; name: string }[] = [
  { href: "/try", mark: "✨", name: "체험하기" },
  { href: "/draw", mark: "🍃", name: "오늘의 운세" },
  { href: "/sutra", mark: "📖", name: "외우기" },
  { href: "/empty", mark: "🥣", name: "비움" },
  { href: "/ganhwaseon", mark: "🧘", name: "간화선" },
];

export default function InvestmentShortcut() {
  const path = usePathname();
  const [열림, 열림잡기] = useState(false);
  // 길이 바뀌면 스스로 접힌다
  useEffect(() => 열림잡기(false), [path]);
  useEffect(() => {
    if (!열림) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && 열림잡기(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [열림]);
  if (path?.startsWith("/admin")) return null;
  return (
    <>
      {열림 && <button type="button" className="wheel-scrim" aria-label="닫기" onClick={() => 열림잡기(false)} />}
      <nav className="wheel-fab" data-open={열림 ? "1" : undefined} aria-label="숨은 방">
        <button type="button" className="investment-shortcut wheel-hub" aria-label={열림 ? "닫기" : "숨은 방"} aria-expanded={열림} onClick={() => 열림잡기((v) => !v)}>
          <Dharmachakra className="wheel-ico" />
        </button>
        <ul className="wheel-beads">
          {알.map((b, i) => (
            <li key={b.href} style={{ "--i": i } as React.CSSProperties}>
              <Link href={b.href} data-on={path === b.href ? "1" : undefined} tabIndex={열림 ? 0 : -1}>
                <span>{b.name}</span><b>{b.mark}</b>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
