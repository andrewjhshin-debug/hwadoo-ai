"use client";

// ────────────────────────────────────────────────────────────────
// 도량 한눈에 — 오른쪽 아래에 늘 떠 있는 단추, 그리고 그 단추가 여는 방.
//
// 왼쪽 탭을 펼치는 것으로는 부족하다. 도량에 들어서면 마당이 한눈에
// 보이듯, 이 앱이 가진 방 전부가 한 화면에 깔려야 한다.
// 그래서 서랍이 아니라 **판**을 연다 — 격자로 깔고, 굵게 세우고,
// 지금 공덕과 이어 온 날을 맨 위에 한 줄로 얹는다.
//
// 손안에서도 뜬다(아래 띠 위로). 사유의 방은 이 판 안의 한 칸이 된다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotesDrawer from "@/components/NotesDrawer";
import {
  Banga,
  Jeol,
  Jeol108,
  Bojagi,
  Book,
  Breath,
  Dharmachakra,
  Jeoul,
  Iljumun,
  Nohda,
  Letter,
  Lotus,
  LotusMark,
  LotusPond,
  Moment,
  Mandala,
  Yeomju,
  Person,
  SeonMaster,
  Seogo,
  Teacup,
  YeonkkotGold,
  Baru,
  Chotbul,
} from "./icons";
import { inRound, loadMerit, rankByNeed, ROUND } from "@/lib/merit";
import { realmOf } from "@/lib/realm";
import { loadStore } from "@/lib/store";
import { streakOf } from "@/lib/daily";
import { watchOnlineCount } from "@/lib/presence";

type Door = {
  href?: string;
  label: string;
  say: string;
  Icon: React.ComponentType<{ className?: string; stroke?: string }>;
  /** 화면이 아니라 그 자리에서 열리는 방 */
  act?: "notes";
};

const YARDS: { title: string; hanja: string; doors: Door[] }[] = [
  {
    title: "오늘",
    hanja: "今",
    doors: [
      { href: "/", label: "뜰", say: "화두를 받는 자리", Icon: LotusMark },
      { label: "사유의 방", say: "떠오르는 것을 적다", Icon: Banga, act: "notes" },
      { href: "/draw", label: "오늘의 운세", say: "한 장을 뒤집다", Icon: Lotus },
      { href: "/rank", label: "정진 랭킹", say: "어제의 자리", Icon: Dharmachakra },
    ],
  },
  {
    title: "수행",
    hanja: "行",
    doors: [
      { href: "/moktak", label: "목탁·염주·싱잉볼", say: "손끝으로 세다", Icon: Yeomju },
      { href: "/sambae", label: "삼배", say: "서른 초면 된다", Icon: Jeol },
      { href: "/bae", label: "백팔배", say: "백여덟 번 굽히다", Icon: Jeol108 },
      { href: "/breath", label: "호흡 명상", say: "들이쉬고 내쉬다", Icon: Breath },
      { href: "/sutra", label: "경전 외우기", say: "입에 붙이다", Icon: Book },
      { href: "/mandala", label: "만다라", say: "색을 앉히다", Icon: Mandala },
      { href: "/empty", label: "비움", say: "쓰지 않은 하루", Icon: Baru },
      { href: "/archive", label: "서고", say: "지난 화두", Icon: Seogo },
    ],
  },
  {
    title: "말씀",
    hanja: "說",
    doors: [
      { href: "/ganhwaseon", label: "간화선이란?", say: "물음을 드는 법", Icon: Dharmachakra },
      { href: "/masters", label: "선지식의 한마디", say: "옛 어른의 말", Icon: SeonMaster },
      { href: "/tamjinchi", label: "불심 투자", say: "탐·진·치를 보다", Icon: Jeoul },
    ],
  },
  {
    title: "함께",
    hanja: "同",
    doors: [
      // 법당이 여기 없어서 폰에서는 초를 켤 길이 아예 없었다.
      // 공덕이 가 닿는 끝자리라 「함께」의 맨 앞에 세운다.
      { href: "/candle", label: "법당 — 초 공양", say: "초 한 자루", Icon: Chotbul },
      { href: "/pilgrimage", label: "손잡고 절로", say: "가까운 절", Icon: Iljumun },
      { href: "/gathering", label: "인연", say: "함께 갈 이", Icon: Person },
      { href: "/community", label: "연지원 — 커뮤니티", say: "묻고 답하다", Icon: LotusPond },
      { href: "/moment", label: "시절인연", say: "절에 다녀온 한 장", Icon: Moment },
      { href: "/my-hwadu", label: "내가 던지는 화두", say: "물음을 놓다", Icon: Nohda },
      { href: "/letters", label: "쪽지함", say: "주고받은 말", Icon: Letter },
      { href: "/tea", label: "차 한 잔", say: "잠깐 쉬다", Icon: Teacup },
    ],
  },
  {
    title: "나",
    hanja: "我",
    doors: [
      { href: "/settings", label: "내 도량", say: "공덕과 부적", Icon: Person },
      { href: "/lotus", label: "연꽃 공양", say: "등을 밝히다", Icon: YeonkkotGold },
      { href: "/goods", label: "굿즈", say: "불교용품", Icon: Bojagi },
    ],
  },
];

export default function DoryangMenu() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(false);
  const [merit, setMerit] = useState(0);
  const [days, setDays] = useState(0);
  const [returned, setReturned] = useState(0); // 회향한 화두 — 자리에 같이 든다
  // 지금 도량에 몇이 있나 — 단추에 얹는다.
  // 뜰 한복판에 「도량에 3명」이라고 적어 두었더니 낯간지러웠다.
  // 수를 없앨 것은 아니고(혼자가 아니라는 건 봐야 한다) 자리를 옮긴 것이다 —
  // 늘 떠 있는 단추 어깨에 작게 붙으면 눈에 걸리지 않고 언제든 보인다.
  const [online, setOnline] = useState<number | null>(null);
  const here = usePathname();

  useEffect(() => watchOnlineCount(setOnline), []);

  // 판을 열 때마다 셈을 다시 읽는다 — 열자마자 오늘 것이 보여야 한다
  useEffect(() => {
    if (!open) return;
    setMerit(loadMerit().total);
    setReturned(loadStore().history.length);
    setDays(streakOf());
  }, [open]);

  // 길이 바뀌면 판은 스스로 닫힌다
  useEffect(() => setOpen(false), [here]);

  // 판이 열린 동안 뒤가 밀리지 않게
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  // 자리는 공덕만으로 안 오른다 — 뜰·내 도량과 같은 셈을 쓴다.
  // 여기만 rankOf(공덕) 였어서, 카드에는 「사미」 카드를 닫으면 뜰에는
  // 「동자」가 떴다. 한 번의 탭으로 두 이름이 번갈아 보였다.
  const rank = rankByNeed(realmOf(merit, returned).need);

  return (
    <>
      <style>{`
        @keyframes dm-in { from { opacity:0; transform: translateY(14px) } to { opacity:1; transform:none } }
        .dm-card { animation: dm-in .34s cubic-bezier(.2,.8,.3,1) both }
      `}</style>

      {/* 늘 떠 있는 단추 — 손안에서는 아래 띠 위로 올라선다 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "닫기" : "도량 한눈에"}
        title={
          open
            ? "닫기"
            : online && online > 0
              ? `도량 한눈에 · 지금 ${online}명이 들어와 있습니다`
              : "도량 한눈에"
        }
        aria-expanded={open}
        className="doryang-fab notes-fab fixed right-4 z-50 bottom-[calc(76px+env(safe-area-inset-bottom,0px)+18px)] flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-ink-2/95 shadow-[0_12px_34px_rgba(0,0,0,0.6)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/70 active:scale-95 md:bottom-8 md:right-8 md:h-14 md:w-14"
      >
        <span
          aria-hidden
          className="relative block h-[15px] w-[19px]"
          style={{ transition: "transform .3s", transform: open ? "rotate(90deg)" : "none" }}
        >
          {[0, 6, 12].map((y, i) => (
            <span
              key={y}
              className="absolute left-0 block h-[1.6px] w-full rounded-full bg-gold"
              style={{
                top: open ? 6 : y,
                opacity: open && i === 1 ? 0 : 1,
                transform: open ? `rotate(${i === 0 ? 45 : i === 2 ? -45 : 0}deg)` : "none",
                transition: "top .3s, transform .3s, opacity .2s",
              }}
            />
          ))}
        </span>
        {/* 접속자 수는 여기 안 적는다 — 단추 어깨에 숫자만 있으면
            무슨 수인지 알 길이 없다. 「손잡고 절로」 머리로 옮겼다. */}
      </button>

      {/* ── 판 ── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="도량 한눈에"
          className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-ink/95 backdrop-blur-xl"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="mx-auto w-full max-w-3xl px-6 pb-[150px] pt-9 md:pb-24">
            {/* 머리 — 지금 내 자리 한 줄 */}
            <div className="dm-card flex items-baseline justify-between">
              <p className="text-[11px] tracking-[0.42em] text-hanji-faint">道場 · 도량</p>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="text-[11.5px] tracking-wide text-gold-soft transition-colors hover:text-gold"
              >
                {rank.name} · {merit.toLocaleString("ko-KR")} 공덕
                {days > 0 && <span className="text-hanji-faint"> · {days}일째</span>}
              </Link>
            </div>
            <div className="dm-card mt-2.5 h-[3px] overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-500"
                style={{ width: `${(inRound(merit) / ROUND) * 100}%` }}
              />
            </div>

            {/* 단추 어깨에 붙은 수가 무엇인지 — 여기서 말해 준다.
                손안에서는 툴팁이 안 뜨니 숫자만 덩그러니 남아 있었다. */}
            {online !== null && online > 0 && (
              <p className="dm-card mt-2.5 text-[11.5px] text-hanji-faint">
                지금 도량에{" "}
                <span className="tabular-nums text-gold-soft">
                  {online.toLocaleString("ko-KR")}
                </span>
                명이 들어와 있습니다
              </p>
            )}

            {YARDS.map((yard, yi) => (
              <section key={yard.title} className="mt-9">
                <p
                  className="dm-card text-[11px] tracking-[0.34em] text-hanji-faint"
                  style={{ animationDelay: `${yi * 40}ms` }}
                >
                  <span className="mr-2 font-serif text-gold-soft">{yard.hanja}</span>
                  {yard.title}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {yard.doors.map((d, di) => {
                    const on = d.href === here;
                    const body = (
                      <>
                        <d.Icon
                          className={`h-[26px] w-[26px] shrink-0 ${on ? "text-gold" : "text-gold-soft"}`}
                        />
                        <span className="mt-2.5 block break-keep text-[13.5px] leading-tight text-hanji">
                          {d.label}
                        </span>
                        <span className="mt-1 block break-keep text-[11px] leading-4 text-hanji-faint">
                          {d.say}
                        </span>
                      </>
                    );
                    const shell = `dm-card flex flex-col rounded-[15px] border px-3.5 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/55 hover:bg-gold/[0.06] ${
                      on ? "border-gold/55 bg-gold/10" : "border-ink-3 bg-ink-2/45"
                    }`;
                    const delay = { animationDelay: `${yi * 40 + di * 26}ms` };
                    return d.act === "notes" ? (
                      <button
                        key={d.label}
                        onClick={() => {
                          setOpen(false);
                          setNotes(true);
                        }}
                        className={shell}
                        style={delay}
                      >
                        {body}
                      </button>
                    ) : (
                      <Link
                        key={d.label}
                        href={d.href ?? "/"}
                        onClick={() => setOpen(false)}
                        className={shell}
                        style={delay}
                      >
                        {body}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      <NotesDrawer open={notes} onClose={() => setNotes(false)} />
    </>
  );
}
