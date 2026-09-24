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
import { usePathname } from "next/navigation";
import LotusCount from "@/components/LotusCount";
import SoundMuteToggle from "@/components/SoundMuteToggle";

export default function HipTop({
  /** 이 판이 더 얹고 싶은 것 — 예: 뜰의 ○(물음만 보기) */
  children,
}: {
  children?: React.ReactNode;
}) {
  // 형: 「맨 위 탭 연꽃이랑 기타 등등 있는 거 위치 맞춰. 탭마다 왔다 갔다
  //      하지 말고. 내 도량에도 그냥 똑같이, 위 탭에는 한자 我 넣어 둬」
  //
  // 내 도량에서만 我 를 빼고 있었다 — 군더더기라고 생각했는데, 넷이던
  // 줄이 셋이 되면서 **나머지 셋이 통째로 오른쪽으로 밀렸다.** 판을
  // 넘길 때마다 연꽃 셈이 자리를 옮기니 눈이 그것을 따라다녔다.
  // 자리는 고정이 먼저다. 지금 있는 자리는 지우는 대신 **채워서** 알린다.
  const path = usePathname();
  const here = path === "/settings";
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
      {here ? (
        <span className="hip-top-ico" data-on="1" aria-current="page">
          <b>我</b>
        </span>
      ) : (
        <Link href="/settings" aria-label="내 도량" className="hip-top-ico">
          <b>我</b>
        </Link>
      )}
      {children}
    </div>
  );
}
