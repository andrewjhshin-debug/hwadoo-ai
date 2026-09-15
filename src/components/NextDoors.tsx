"use client";

// ────────────────────────────────────────────────────────────────
// 이어지는 문 — 한 방을 마치고 아래로 내려가면 다음 방이 나온다.
//
// 뜰에서만 하던 것을 도량 전체에 깐다. 화면을 다 쓴 사람이 뒤로가기를
// 누르게 두면 거기서 끊긴다. 끝에 문 셋을 놓아 두면 이어 간다.
//
// 문은 방마다 다르다 — 목탁을 치고 나면 삼배가, 삼배를 하고 나면
// 백팔배가 나오는 식으로, 결이 이어지는 쪽을 골라 둔다.
// 지도에 없는 방에는 아무것도 그리지 않는다(뜰·서랍·정책 화면 등).
// ────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banga,
  Bojagi,
  Book,
  Breath,
  Dharmachakra,
  Jeoul,
  Iljumun,
  Nohda,
  Lotus,
  LotusMark,
  LotusPond,
  Mandala,
  Moktak,
  Person,
  Seogo,
  Moment,
  SeonMaster,
  Teacup,
  Yeonkkot,
} from "./icons";

type Door = {
  href: string;
  label: string;
  say: string;
  Icon: React.ComponentType<{ className?: string; stroke?: string }>;
};

const D: Record<string, Door> = {
  moktak: { href: "/moktak", label: "목탁·염주·싱잉볼", say: "손끝으로 세다", Icon: Moktak },
  sambae: { href: "/sambae", label: "삼배", say: "서른 초면 된다", Icon: Banga },
  bae: { href: "/bae", label: "백팔배", say: "백여덟 번 굽히다", Icon: Banga },
  breath: { href: "/breath", label: "호흡 명상", say: "들이쉬고 내쉬다", Icon: Breath },
  sutra: { href: "/sutra", label: "경전 외우기", say: "입에 붙이다", Icon: Book },
  mandala: { href: "/mandala", label: "만다라", say: "색을 앉히다", Icon: Mandala },
  empty: { href: "/empty", label: "비움", say: "쓰지 않은 하루", Icon: Moktak },
  draw: { href: "/draw", label: "오늘의 운세", say: "한 장을 뒤집다", Icon: Lotus },
  rank: { href: "/rank", label: "육도 랭킹", say: "지금 내 자리", Icon: Dharmachakra },
  settings: { href: "/settings", label: "내 도량", say: "공덕과 부적", Icon: Person },
  archive: { href: "/archive", label: "서고", say: "지난 화두", Icon: Seogo },
  room: { href: "/room", label: "사유의 방", say: "떠오르는 것을 적다", Icon: Banga },
  home: { href: "/", label: "뜰", say: "화두를 받는 자리", Icon: LotusMark },
  pilgrimage: { href: "/pilgrimage", label: "손잡고 절로", say: "가까운 절", Icon: Iljumun },
  gathering: { href: "/gathering", label: "인연", say: "함께 갈 이", Icon: Person },
  community: { href: "/community", label: "연지원", say: "묻고 답하다", Icon: LotusPond },
  moment: { href: "/moment", label: "시절인연", say: "절에 다녀온 한 장", Icon: Moment },
  myHwadu: { href: "/my-hwadu", label: "내가 던지는 화두", say: "물음을 놓다", Icon: Nohda },
  ganhwaseon: { href: "/ganhwaseon", label: "간화선이란?", say: "물음을 드는 법", Icon: Dharmachakra },
  masters: { href: "/masters", label: "선지식의 한마디", say: "옛 어른의 말", Icon: SeonMaster },
  tamjinchi: { href: "/tamjinchi", label: "불심 투자", say: "탐·진·치를 보다", Icon: Jeoul },
  lotus: { href: "/lotus", label: "연꽃 공양", say: "등을 밝히다", Icon: Yeonkkot },
  goods: { href: "/goods", label: "굿즈", say: "손에 쥐는 것", Icon: Bojagi },
  tea: { href: "/tea", label: "차 한 잔", say: "잠깐 쉬다", Icon: Teacup },
};

/** 이 방을 마치면 다음은 어디로 */
const AFTER: Record<string, (keyof typeof D)[]> = {
  "/moktak": ["sambae", "breath", "rank"],
  "/sambae": ["bae", "moktak", "sutra"],
  "/bae": ["sambae", "breath", "rank"],
  "/breath": ["moktak", "sutra", "room"],
  "/sutra": ["moktak", "sambae", "rank"],
  "/mandala": ["breath", "room", "draw"],
  "/empty": ["tamjinchi", "breath", "settings"],
  "/draw": ["empty", "breath", "moktak"],
  "/rank": ["moktak", "sambae", "settings"],
  "/room": ["home", "archive", "masters"],
  "/archive": ["home", "room", "community"],
  "/pilgrimage": ["moment", "gathering", "community"],
  "/gathering": ["pilgrimage", "community", "myHwadu"],
  "/community": ["moment", "gathering", "myHwadu"],
  "/moment": ["community", "pilgrimage", "gathering"],
  "/my-hwadu": ["community", "archive", "masters"],
  "/ganhwaseon": ["home", "masters", "room"],
  "/masters": ["ganhwaseon", "room", "community"],
  "/tamjinchi": ["empty", "settings", "masters"],
  "/settings": ["rank", "lotus", "goods"],
  "/lotus": ["settings", "goods", "community"],
  "/goods": ["lotus", "tea", "settings"],
  "/tea": ["masters", "community", "home"],
  "/about": ["home", "ganhwaseon", "pilgrimage"],
};

export default function NextDoors() {
  const here = usePathname();
  const keys = AFTER[here];
  if (!keys?.length) return null;

  return (
    <nav
      aria-label="이어지는 방"
      className="mx-auto mt-14 w-full max-w-2xl border-t border-ink-3 px-6 pb-4 pt-7"
    >
      <p className="text-[10.5px] tracking-[0.34em] text-hanji-faint">
        <span className="mr-2 font-serif text-gold-soft">次</span>
        이어서
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {keys.map((k) => {
          const d = D[k];
          return (
            <Link
              key={k}
              href={d.href}
              className="flex flex-col rounded-[14px] border border-ink-3 bg-ink-2/45 px-3 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold/[0.06]"
            >
              <d.Icon className="h-[22px] w-[22px] shrink-0 text-gold-soft" />
              <span className="mt-2 block break-keep text-[12.5px] leading-tight text-hanji">
                {d.label}
              </span>
              <span className="mt-1 block break-keep text-[10.5px] leading-4 text-hanji-faint">
                {d.say}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
