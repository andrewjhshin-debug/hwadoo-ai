"use client";

// 인연 머리 — 게시판·새 인연·받은 호감·쪽지 넷이 **같은 한 장**을 쓴다.
// 형: 「게시판 옆 탭 새 인연 등으로 넘어가더라도 고정, 나머지 다 고정, 그 내용만 바뀌게」
// 방마다 머리를 따로 그리면 탭을 누를 때마다 위가 들썩였다. 이 한 장이 늘 같은 자리에 붙어 있다.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import LotusCount from "@/components/LotusCount";
import AlertBell from "@/components/AlertBell";
import "./gathering-a.css";

type Tab = "board" | "new" | "likes" | "letters";
const 탭: [Tab, string, string][] = [
  ["board", "/gathering", "게시판"],
  ["new", "/gathering/yeon", "새 인연"],
  ["likes", "/gathering/likes", "받은 호감"],
  ["letters", "/letters", "쪽지"],
];

export default function InyeonNav({ active }: { active?: Tab; secondary?: boolean }) {
  // 방마다 감싼 통(여백·가운데 맞춤)이 달라 머리가 방마다 다른 자리에 앉았다 — 화면 꼭대기 한 층(#hip-header-layer)에 바로 단다.
  // 제자리엔 같은 높이 빈칸만 둔다. 서버 그림과 어긋나지 않게(#418) 뜬 뒤에 단다
  const [떴다, 떴다잡기] = useState(false);
  useEffect(() => 떴다잡기(true), []);
  const 머리 = (
    <header className="hip-yh yA-head">
      <div className="hip-yh-top">
        <h1>因緣<small> · 손잡고 절로</small></h1>
        <span className="hip-yh-right">
          <Link href="/gathering/me" className="yA-me">내 프로필 ›</Link>
          <AlertBell />
          <Link href="/lotus" className="hip-yh-lotus" aria-label="연꽃"><LotusCount look="line" /></Link>
        </span>
      </div>
      <nav className="yA-tabs" aria-label="인연 메뉴">
        {탭.map(([id, href, label]) => (
          <Link key={id} href={href} aria-current={active === id ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
    </header>
  );
  return <>
    <div className="yA-head-slot" aria-hidden />
    {떴다 && createPortal(머리, document.getElementById("hip-header-layer") ?? document.body)}
  </>;
}
