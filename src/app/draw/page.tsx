"use client";

// ─────────────────────────────────────────────────────────────
// 오늘의 운세(運勢) — 하루 한 장을 뒤집는 자리.
//
// 뒤집기 전에는 큰 숫자가 오늘 날짜, 뒤집고 나면 자정까지 남은 시간.
// 어느 쪽이든 화면 한복판에 숫자는 하나뿐이다.
//
// 패에는 오늘의 독만 싣는다. 처방·한 마디·말문은 패 아래로 흘린다 —
// 63:88 짜리 종이에 넷을 다 우겨넣으면 아무것도 안 읽힌다.
// 셈과 문구는 전부 lib/draw.ts 가 쥔다. 여기는 뒤집는 맛만 만든다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { loadMerit } from "@/lib/merit";
import { buzz, clickBead, strikeMoktak } from "@/lib/sound";
import {
  dayKey,
  drawFortune,
  fmtLeft,
  FORTUNE_MERIT,
  loadDraw,
  msToMidnight,
  poisonOf,
  stampOf,
  type DrawBook,
  type Fortune,
  type PoisonCard,
} from "@/lib/draw";

// 카드 한 장 — 3D 로 돈다. 앞뒤 두 면을 겹쳐 두고 축을 돌린다.
// 화투·타로의 비(63:88)를 그대로 썼다 — 손에 쥐는 물건처럼 보이게.
const DRAW_CSS = `
.draw-stage { perspective: 1400px; }
.draw-card {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 63 / 88;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 900ms cubic-bezier(0.22, 0.75, 0.2, 1);
}
.draw-card.is-flipped { transform: rotateY(180deg); }
.draw-card:disabled { cursor: default; }
.draw-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 26px 20px;
  border-radius: 18px;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.draw-front { transform: rotateY(180deg); }
/* 뒤집히면 금빛이 번진다 — 한 번만 */
@keyframes draw-spread {
  from { opacity: 0; transform: scale(0.55); }
  55% { opacity: 1; }
  to { opacity: 0.5; transform: scale(1); }
}
.draw-glow {
  position: absolute;
  inset: -32%;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 46%,
    color-mix(in srgb, var(--color-gold) 34%, transparent),
    transparent 62%
  );
  animation: draw-spread 1300ms 340ms ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .draw-card { transition-duration: 1ms; }
  .draw-glow { animation: none; opacity: 0.4; }
}
`;

export default function DrawPage() {
  const [book, setBook] = useState<DrawBook | null>(null);
  const [got, setGot] = useState<Fortune | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [waiting, setWaiting] = useState(0); // 자정까지 남은 밀리초

  // 서랍은 붙고 난 뒤에 읽는다 — 서버 그림과 어긋나지 않게
  const refresh = useCallback(() => {
    setBook(loadDraw());
  }, []);

  useEffect(() => {
    const b = loadDraw();
    setBook(b);
    // 오늘 이미 뒤집었으면 그 장이 그대로 놓여 있게 — 돌아가는 시늉은 없다
    if (b.today) {
      setGot(b.today);
      setFlipped(true);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      setWaiting(msToMidnight());
      // 자정을 넘겼는데 화면이 어제에 머물면 안 된다 — 새 장을 놓는다
      const now = dayKey();
      setBook((prev) => (prev && prev.day !== now ? loadDraw() : prev));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // 새 날이 되어 오늘 것이 비면 패도 뒷면으로 되돌린다
  useEffect(() => {
    if (book && !book.today && flipped) {
      setFlipped(false);
      window.setTimeout(() => setGot(null), 520);
    }
  }, [book, flipped]);

  const flip = () => {
    if (!book || flipped || book.today) return;
    const f = drawFortune();
    if (!f) return;
    clickBead(0.55);
    buzz(10);
    setGot(f);
    // 서랍을 **그 자리에서** 다시 읽는다. 900ms 뒤에 읽으면 그사이에
    // ‘오늘 것이 비었는데 패만 뒤집혔다’고 본 아래 효과가 바로 되돌려 버렸다.
    setBook(loadDraw());
    setFlipped(true);
    // 반쯤 돌았을 때 목탁 한 방 — 소리가 그림보다 먼저 오면 김이 샌다
    window.setTimeout(() => strikeMoktak(0.55), 330);
    window.setTimeout(refresh, 900);
  };

  if (!book) return <div className="h-[70vh]" aria-hidden />;

  const open = Boolean(book.today && got);
  const p = got ? poisonOf(got.poison) : null;
  // 오늘 것은 위에 이미 있다 — 자취에 두 번 적지 않는다
  const trail = (book.today ? book.log.slice(1) : book.log).slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{DRAW_CSS}</style>

      {/* 머리에 얼굴을 올리지 않는다 — 이 화면의 주인공은 뒤집는 한 장이다 */}
      <p className="rise mt-2 text-[12px] tracking-[0.35em] text-hanji-faint">運 · 오늘의 운세</p>

      {open ? (
        <>
          <p className="rise rise-d1 mt-1 font-serif text-[46px] font-light leading-none tracking-tight text-hanji tabular-nums sm:text-[58px]">
            {fmtLeft(waiting)}
          </p>
          <p className="rise rise-d1 mt-2.5 text-[12.5px] text-hanji-faint">다음 운세까지</p>
        </>
      ) : (
        <>
          <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
            {Number(book.day.slice(8))}
            <span className="ml-1 align-middle text-[20px] text-hanji-faint">일</span>
          </p>
          <p className="rise rise-d1 mt-2.5 text-[12.5px] text-hanji-faint">
            패를 누르면 오늘이 열려요
          </p>
        </>
      )}

      {/* ── 패 ── */}
      <div className="draw-stage rise rise-d2 mt-7 w-full max-w-[284px]">
        <button
          type="button"
          onClick={flip}
          disabled={flipped}
          aria-label={flipped ? "오늘의 운세" : "오늘의 운세 뒤집기"}
          className={`draw-card ${flipped ? "is-flipped" : ""}`}
        >
          <span className="draw-face border border-ink-3 bg-ink-2">
            <Back />
          </span>
          <span className="draw-front draw-face border border-ink-3 bg-ink-2">
            {got && p && <Face sign={got.sign} poison={p} />}
          </span>
        </button>
      </div>

      {/* ── 얹힌 것 ── */}
      {/* 「이어서 N일」 칩을 뗐다 — 오늘 한 번 뽑으면 그만인 자리에
          날수를 세어 보이면 끊길까 봐 누르게 된다. 운세는 숙제가 아니다. */}
      {open && (
        <ul className="rise rise-d3 mt-6 flex flex-wrap items-center justify-center gap-2 text-[11.5px]">
          <li className="rounded-full border border-gold/45 px-3 py-1.5 text-gold">
            공덕 +{FORTUNE_MERIT}
          </li>
        </ul>
      )}

      {open && got && (
        <>
          {/* 처방 한 줄과 「비움으로」 단추, 그 아래 어록 한 편을 다 내렸다.
              한 장 뽑고 나면 읽을 것이 셋이라 정작 카드가 안 읽혔다. */}

          {/* ── 오늘의 말문 — 절에서 건넬 첫 마디 ── */}
          <div className="mt-9 w-full max-w-[284px] rounded-[14px] border border-ink-3 bg-ink-2/50 p-4">
            <p className="text-[11px] tracking-[0.25em] text-hanji-faint">言 · 오늘의 말문</p>
            <p className="mt-2 break-keep font-serif text-[14px] leading-7 text-hanji">
              {got.opener}
            </p>
            <Link
              href="/pilgrimage"
              className="mt-3 inline-block text-[12px] text-gold underline-offset-4 hover:underline"
            >
              손잡고 절로
            </Link>
          </div>
        </>
      )}

      {/* ── 지나온 자취 ── */}
      {trail.length > 0 && (
        <ul className="mt-9 w-full max-w-[284px] border-t border-ink-3">
          {trail.map((f) => (
            <li
              key={f.at}
              className="flex items-baseline justify-between gap-3 border-b border-ink-3 py-2.5"
            >
              <span className="shrink-0 text-[11.5px] text-hanji-faint">{stampOf(f.day)}</span>
              <span className="min-w-0 flex-1 truncate text-right text-[12px] text-hanji-dim">
                <span className="font-serif text-gold-soft">{poisonOf(f.poison).hanja}</span>{" "}
                {f.sign}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 뒷면 — 금빛 고리 안에 心 ─────────────────────────────────

function Back() {
  return (
    <>
      {/* 빛깔은 토큰에서 — currentColor 라야 저절로 따라온다 */}
      <svg viewBox="0 0 120 120" className="h-[132px] w-[132px] text-gold-soft" aria-hidden>
        <g fill="none" stroke="currentColor">
          <circle cx="60" cy="60" r="46" strokeWidth="0.8" opacity="0.55" />
          <circle cx="60" cy="60" r="34" strokeWidth="0.6" opacity="0.35" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse
              key={a}
              cx="60"
              cy="30"
              rx="7"
              ry="15"
              strokeWidth="0.6"
              opacity="0.4"
              transform={`rotate(${a} 60 60)`}
            />
          ))}
        </g>
      </svg>
      <span className="absolute font-serif text-[30px] leading-none text-gold">心</span>
      <span className="absolute bottom-6 text-[11px] tracking-[0.3em] text-hanji-faint">運勢</span>
    </>
  );
}

// ── 앞면 — 오늘의 독 ────────────────────────────────────────

function Face({ sign, poison }: { sign: string; poison: PoisonCard }) {
  return (
    <>
      <span className="draw-glow" aria-hidden />
      <span className="relative grid h-[38px] w-[38px] place-items-center rounded-full bg-gold font-serif text-[18px] leading-none text-ink">
        {poison.hanja}
      </span>
      <span className="relative mt-3.5 break-keep font-serif text-[21px] leading-none text-hanji">
        {poison.verdict}
      </span>
      <span className="relative mt-2 text-[11px] tracking-[0.25em] text-gold-soft">
        三毒 · 오늘의 독
      </span>
      <span className="relative mt-4 h-px w-9 bg-ink-3" aria-hidden />
      <span className="relative mt-4 break-keep px-1 text-center font-serif text-[15px] leading-7 text-hanji">
        {sign}
      </span>
    </>
  );
}
