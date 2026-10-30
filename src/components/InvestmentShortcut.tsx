"use client";

// ─────────────────────────────────────────────────────────────
// 법륜 단추 — 아래 띠 오른쪽 위에 떠 있는 동그라미.
//
// 형: 「이 동그라미를 법륜 정도로 하고 눌리면 위로 똥똥똥 동그라미
//      버튼 나오면서 그간 숨겨진 메뉴 띄우라고」
//
// 여태는 불심투자 하나로만 가는 지름길이었다. 내 도량(我) 안에만
// 묻혀 있던 방들 — 비움·불심투자·하심·호흡·멍·연꽃·정진 — 을 이
// 바퀴가 품는다. 누르면 위로 알이 차례로 튀어 오르고, 알마다 한자
// 하나. 글자 없이 아래 띠(話功堂緣我)와 같은 말로 말한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dharmachakra } from "./icons";

/** 숨어 있던 방 — 아래가 먼저 튀어 오른다 */
const 알: { href: string; mark: string; name: string }[] = [
  { href: "/tamjinchi", mark: "投", name: "불심투자" },
  { href: "/empty", mark: "空", name: "비움" },
  { href: "/hasim", mark: "下", name: "하심" },
  { href: "/breath", mark: "息", name: "호흡" },
  { href: "/mung", mark: "無", name: "멍" },
  { href: "/lotus", mark: "蓮", name: "연꽃" },
  { href: "/rank", mark: "進", name: "정진" },
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
              <Link href={b.href} aria-label={b.name} title={b.name} data-on={path === b.href ? "1" : undefined} tabIndex={열림 ? 0 : -1}>
                <b>{b.mark}</b>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
