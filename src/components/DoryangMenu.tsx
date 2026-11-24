"use client";

// ────────────────────────────────────────────────────────────────
// ☰ 전체 메뉴 — 머리 오른쪽 세 줄을 누르면 앱의 방 전부가 한 판에 깔린다.
//
// 형(2026-11-24): 「오른쪽 위 세줄 메뉴 같은거 충분히 활용」
//                「디자인 변경 너무 말고 일단 구성만 바꿔」
//
// 머리의 我 는 아래 띠의 我 와 같은 길(/settings)이라 두 번 서 있었다.
// 그 자리에 ☰ 를 세우고, 흩어져 있던 방(내 도량 「전체 보기」, 緣 판,
// 功 줄)으로 가는 길을 여기 한 판에 모은다. 아래 띠 다섯 칸의 첫 화면
// (뜰·법당·공덕·내 도량)은 띠에 있으니 여기 다시 적지 않는다.
//
// 생김새는 새로 짓지 않는다 — 緣 판(DharmaSheet)의 한지색 판과 흰 칸
// (.dharma-rooms)을 그대로 쓰고, 그림 대신 내 도량과 같은 한자 한 글자.
//
// 옛 「도량 한눈에」(오른쪽 아래 떠 있는 단추 + 먹빛 판)는 폰에서
// 늘 꺼져 있었다(hip.css). 그 자리를 이 판이 잇는다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** 머리의 ☰ 단추가 쏘는 신호 — 판은 layout 에 한 번만 놓인다 */
export const MENU_EVENT = "hwadu-menu";
export const openMenu = () => window.dispatchEvent(new Event(MENU_EVENT));

/** [길, 이름, 한자] — 이름·한자는 내 도량(settings ME_MARK·SERVICES)과 같게 */
const GROUPS: { title: string; rooms: [string, string, string][] }[] = [
  {
    title: "수행",
    rooms: [
      ["/bae", "백팔배", "拜"],
      ["/sambae", "삼귀의", "歸"],
      ["/breath", "호흡", "息"],
      ["/mung", "멍", "無"],
      ["/hasim", "하심", "下"],
      ["/mandala", "만다라", "曼"],
      ["/walking", "포행", "步"],
      ["/tower", "돌탑", "塔"],
      ["/sutra", "외우기", "經"],
      ["/empty", "비움", "空"],
    ],
  },
  {
    title: "공부",
    rooms: [
      ["/ganhwaseon", "간화선", "禪"],
      ["/masters", "선지식", "師"],
      ["/learn", "불교 공부", "學"],
      ["/room", "사유의 방", "思"],
      ["/my-hwadu", "화두 던지기", "問"],
      // 형: 「버튼 중에 체험하기 하나 넣고 되살리자」 — 내 도량 「전체 보기」를 걷으며 길이 끊겼던 것을 여기로
      ["/try", "체험하기", "試"],
      ["/archive", "지난 화두", "庫"],
      ["/goods", "서고", "書"],
    ],
  },
  {
    title: "함께",
    rooms: [
      ["/gathering", "인연", "緣"],
      ["/pilgrimage", "손잡고 절로", "寺"],
      ["/moment", "시절인연", "時"],
      ["/pet", "배웅", "送"],
      ["/tea", "차 한 잔", "茶"],
      ["/letters", "쪽지", "信"],
    ],
  },
  {
    title: "나",
    rooms: [
      ["/card", "신도증", "證"],
      ["/wish", "소원", "願"],
      ["/unryeok", "운력", "力"],
      ["/lotus", "연꽃", "蓮"],
      ["/archive#saved-sentences", "간직한 문장", "藏"],
      ["/rank", "랭킹", "進"],
      ["/draw", "오늘의 운세", "占"],
      ["/saju", "산신각", "山"],
      ["/tamjinchi", "불심투자", "投"],
      ["/settings/preferences", "설정", "設"],
    ],
  },
];

export default function DoryangMenu() {
  const [open, setOpen] = useState(false);
  const here = usePathname();

  // ── 뒤로가기는 판만 닫는다 ──
  // 법당·인연 판과 같은 결(hwadooLayer): 열 때 층을 하나 쌓고, popstate 가 접는다.
  // ✕·Esc 도 뒤로가기를 불러 쌓은 층을 같이 걷는다. 판 안의 길은 replace 로
  // 그 층 자리를 갈아 끼운다 — 새 방에서 뒤로 가면 판을 연 그 방으로 한 번에.
  useEffect(() => {
    const onMenu = () => {
      if (document.querySelector(".hip-menu")) return;
      try {
        window.history.pushState({ ...window.history.state, hwadooLayer: true }, "");
      } catch {
        /* 못 쌓아도 판은 열린다 */
      }
      setOpen(true);
    };
    const onPop = () => setOpen(false);
    window.addEventListener(MENU_EVENT, onMenu);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener(MENU_EVENT, onMenu);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && window.history.back();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  // 닫혀 있을 땐 아예 그리지 않는다 — [role=dialog] 가 문서에 있기만 해도
  // 아래 띠를 끄는 규칙(globals.css)이 걸린다
  if (!open) return null;

  const close = () => window.history.back();
  return (
    <div className="hip-menu" role="dialog" aria-modal="true" aria-label="전체 메뉴">
      <div className="hip-menu-top">
        <button type="button" className="hip-top-ico" aria-label="닫기" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title}>
          <p className="hip-menu-sec">{g.title}</p>
          <div className="dharma-rooms">
            {g.rooms.map(([href, label, mark]) => (
              <Link
                key={href}
                href={href}
                replace
                onClick={() => setOpen(false)}
                // 판은 열렸을 때만 그려지니 주소의 # 를 읽어도 된다 — 지난 화두와 간직한 문장(#saved-sentences)을 가른다
                aria-current={href === here + window.location.hash ? "page" : undefined}
              >
                <span>{mark}</span>
                {label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
