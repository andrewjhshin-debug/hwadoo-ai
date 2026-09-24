"use client";

// ─────────────────────────────────────────────────────────────
// 머리 오른쪽 — 늘 손이 가는 넷.
//
// 형: 「제 일 일 그거는 지우고, 오른쪽 위에는 음소거 · 쪽지 · 내 도량 ·
//      연꽃/공덕 갯수 이렇게 오리지날처럼 따와서 넣자」
//
// 옛 머리띠(.hip-topbar)를 폰에서 끄면서 그 안에 있던 길들이 같이
// 사라졌다. 음소거도, 쪽지함도, 연꽃 셈도. 없앤 게 아니라 **자리를
// 옮기는 것**이 맞다 — 띠 하나를 통째로 이고 다니는 대신, 판마다
// 머리 오른쪽 귀퉁이에 넷만 앉힌다.
//
// 「第 一 日」은 뺐다. 며칠째인지는 바닥에 「이틀째 품는 중」이라고
// 이미 적혀 있었다. 같은 말을 두 번 하면 둘 다 안 읽힌다.
//
// 연꽃과 공덕은 LotusCount 가 이미 같이 센다(둘은 한 몸이다 —
// 공덕 6,480 이 연꽃 한 송이). 새로 짜지 않고 그대로 꽂는다.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import LotusCount from "@/components/LotusCount";
import SoundMuteToggle from "@/components/SoundMuteToggle";

export default function HipTop({
  /** 이 판에서 갈 곳이 아닌 것은 숨긴다 (내 도량에서 내 도량 단추는 군더더기) */
  hide,
  /** 판이 더 얹고 싶은 것 — 예: 뜰의 ○(물음만 보기) */
  children,
}: {
  hide?: "me";
  children?: React.ReactNode;
}) {
  return (
    <div className="hip-top-right">
      <LotusCount look="line" className="hip-top-count" />
      <SoundMuteToggle compact />
      <Link href="/letters" aria-label="쪽지함" className="hip-top-ico">
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M3.6 7l8.4 6 8.4-6" />
        </svg>
      </Link>
      {hide !== "me" && (
        <Link href="/settings" aria-label="내 도량" className="hip-top-ico">
          <b>我</b>
        </Link>
      )}
      {children}
    </div>
  );
}
