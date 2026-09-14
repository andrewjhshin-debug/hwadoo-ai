"use client";

// ─────────────────────────────────────────────────────────────
// 오늘의 한 장(籤) — 하루에 놓이는 패 한 장을 뒤집는 자리.
//
// 화면은 셋뿐이다 — 큰 숫자 하나, 패 한 장, 모아 둔 것.
// 뒤집으면 되돌릴 수 없으니 되감기 단추도 두지 않았다.
// 다 뒤집은 날에는 큰 숫자가 자정까지 남은 시간으로 바뀐다 — 내일 또 오게.
//
// 셈과 효과는 전부 lib/draw.ts 가 맡는다. 여기는 뒤집는 맛만 만든다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import Dudu from "@/components/Dudu";
import type { Charm } from "@/lib/charm";
import { loadMerit, stageOf } from "@/lib/merit";
import { buzz, clickBead, strikeMoktak } from "@/lib/sound";
import { watchAuth } from "@/lib/sync";
import { getLotus, spendLotus } from "@/lib/dm";
import {
  addExtra,
  canBuyExtra,
  canDraw,
  claimCharm,
  drawOne,
  fmtLeft,
  gotLine,
  leftToday,
  loadDraw,
  msToMidnight,
  nextCharm,
  PIECES_FOR_CHARM,
  sayOf,
  todaysGot,
  type DrawBook,
  type Got,
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
  const [got, setGot] = useState<Got | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [stage, setStage] = useState(0);
  const [waiting, setWaiting] = useState(0); // 자정까지 남은 밀리초
  const [next, setNext] = useState<Charm | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [lotus, setLotus] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [hint, setHint] = useState<{ text: string; href?: string; go?: string } | null>(null);
  const [taken, setTaken] = useState<Charm | null>(null);

  // 서랍은 붙고 난 뒤에 읽는다 — 서버 그림과 어긋나지 않게
  const refresh = useCallback(() => {
    setBook(loadDraw());
    setNext(nextCharm());
    setStage(stageOf(loadMerit().total));
  }, []);

  useEffect(() => {
    const b = loadDraw();
    refresh();
    // 오늘 이미 뒤집었으면 그 패가 그대로 놓여 있게
    const g = todaysGot(b);
    if (g && !canDraw(b)) {
      setGot(g);
      setFlipped(true);
    }
  }, [refresh]);

  useEffect(() => {
    const tick = () => setWaiting(msToMidnight());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => watchAuth(setUser), []);

  useEffect(() => {
    if (!user) {
      setLotus(null);
      return;
    }
    let alive = true;
    void getLotus().then((n) => {
      if (alive) setLotus(n);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const flip = () => {
    if (!book || flipped || !canDraw(book)) return;
    const g = drawOne();
    if (!g) return;
    clickBead(0.55);
    buzz(10);
    setGot(g);
    setFlipped(true);
    setHint(null);
    // 반쯤 돌았을 때 목탁 한 방 — 소리가 그림보다 먼저 오면 김이 샌다
    window.setTimeout(() => strikeMoktak(0.55), 330);
    window.setTimeout(refresh, 900);
  };

  const buyExtra = async () => {
    if (!book || buying) return;
    if (!user) {
      setHint({ text: "연꽃은 들어오신 뒤에 쓸 수 있어요." });
      return;
    }
    setBuying(true);
    setHint(null);
    const ok = await spendLotus().catch(() => false);
    if (!ok) {
      setHint({ text: "연꽃이 다 떨어졌어요.", href: "/lotus", go: "연꽃 공양" });
      setBuying(false);
      return;
    }
    addExtra();
    setLotus((n) => (typeof n === "number" ? Math.max(0, n - 1) : n));
    setFlipped(false);
    refresh();
    // 뒷면이 다시 보인 뒤에 앞면을 비운다 — 도는 중에 내용이 사라지면 어색하다
    window.setTimeout(() => setGot(null), 520);
    setBuying(false);
  };

  const claim = () => {
    const c = claimCharm();
    if (!c) return;
    strikeMoktak(0.6);
    buzz(14);
    setTaken(c);
    refresh();
  };

  if (!book) return <div className="h-[70vh]" aria-hidden />;

  const rest = leftToday(book);
  const boostOn = book.boost === book.day;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{DRAW_CSS}</style>

      <Dudu
        stage={stage}
        mood={flipped ? "joy" : "tilt"}
        uid="draw"
        className="rise h-[84px] w-[84px]"
      />
      <p className="rise mt-2 text-[12px] tracking-[0.35em] text-hanji-faint">
        籤 · 오늘의 한 장
      </p>

      {rest > 0 ? (
        <>
          <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
            {rest}
            <span className="ml-1 align-middle text-[20px] text-hanji-faint">장</span>
          </p>
          <p className="rise rise-d1 mt-2.5 text-[12.5px] text-hanji-faint">
            패를 누르면 뒤집혀요
          </p>
        </>
      ) : (
        <>
          <p className="rise rise-d1 mt-1 font-serif text-[46px] font-light leading-none tracking-tight text-hanji tabular-nums sm:text-[58px]">
            {fmtLeft(waiting)}
          </p>
          <p className="rise rise-d1 mt-2.5 text-[12.5px] text-hanji-faint">다음 한 장까지</p>
        </>
      )}

      {/* ── 패 ── */}
      <div className="draw-stage rise rise-d2 mt-7 w-full max-w-[284px]">
        <button
          type="button"
          onClick={flip}
          disabled={rest <= 0 || flipped}
          aria-label={flipped ? "오늘 뒤집은 패" : "오늘의 한 장 뒤집기"}
          className={`draw-card ${flipped ? "is-flipped" : ""}`}
        >
          <span className="draw-face border border-ink-3 bg-ink-2">
            <Back />
          </span>
          <span className="draw-front draw-face border border-ink-3 bg-ink-2">
            {got && <Face got={got} />}
          </span>
        </button>
      </div>

      {/* ── 한 장 더 ── */}
      {rest <= 0 && canBuyExtra(book) && (
        <button
          onClick={buyExtra}
          disabled={buying}
          className="btn-obang mt-6 w-full max-w-[284px] py-3 text-[13px] tracking-[0.15em] text-hanji"
        >
          {buying ? "…" : "연꽃 한 송이로 한 장 더"}
          {lotus !== null && !buying && (
            <span className="ml-2 text-[11.5px] text-hanji-faint">연꽃 {lotus}</span>
          )}
        </button>
      )}

      {hint && (
        <p className="mt-3 text-[12px] text-hanji-faint">
          {hint.text}
          {hint.href && (
            <Link href={hint.href} className="ml-1.5 text-gold underline-offset-4 hover:underline">
              {hint.go}
            </Link>
          )}
        </p>
      )}

      {/* ── 모아 둔 것 ── */}
      <ul className="rise rise-d3 mt-7 flex flex-wrap items-center justify-center gap-2 text-[11.5px]">
        <li className="rounded-full border border-ink-3 px-3 py-1.5 text-hanji-dim">
          동행권 {book.tickets}
        </li>
        <li className="rounded-full border border-ink-3 px-3 py-1.5 text-hanji-dim">
          부적 조각 {book.pieces} / {PIECES_FOR_CHARM}
        </li>
        {boostOn && (
          <li className="rounded-full border border-gold/45 px-3 py-1.5 text-gold">
            인연패 · 오늘
          </li>
        )}
      </ul>

      {book.pieces >= PIECES_FOR_CHARM && next && !taken && (
        <button
          onClick={claim}
          className="mt-4 w-full max-w-[284px] rounded-full border border-gold/50 py-2.5 text-[12.5px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
        >
          조각 셋으로 {next.name} 청하기
        </button>
      )}

      {taken && (
        <p className="mt-4 text-[12.5px] text-vermilion">
          {taken.name} 한 장을 받았어요
          <Link href="/settings" className="ml-1.5 text-gold underline-offset-4 hover:underline">
            도량에 걸기
          </Link>
        </p>
      )}

      {/* ── 지나온 자취 ── */}
      {book.log.length > 1 && (
        <ul className="mt-9 w-full max-w-[284px] border-t border-ink-3">
          {book.log.slice(0, 5).map((g) => (
            <li
              key={g.at}
              className="flex items-baseline justify-between gap-3 border-b border-ink-3 py-2.5"
            >
              <span className="shrink-0 text-[11.5px] text-hanji-faint">{stamp(g.at)}</span>
              <span className="min-w-0 flex-1 truncate text-right text-[12px] text-hanji-dim">
                {g.name} · {gotLine(g)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 뒷면 — 금빛 고리 안에 一 ─────────────────────────────────

function Back() {
  return (
    <>
      {/* 빛깔은 토큰에서 — currentColor 라야 낮·밤이 저절로 갈린다 */}
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
      <span className="absolute font-serif text-[30px] leading-none text-gold">一</span>
      <span className="absolute bottom-6 text-[11px] tracking-[0.3em] text-hanji-faint">
        籤
      </span>
    </>
  );
}

// ── 앞면 ────────────────────────────────────────────────────

function Face({ got }: { got: Got }) {
  const word = got.kind === "malmun" || got.kind === "saying";
  return (
    <>
      <span className="draw-glow" aria-hidden />
      <span className="relative grid h-[38px] w-[38px] place-items-center rounded-full bg-gold font-serif text-[18px] leading-none text-ink">
        {got.mark}
      </span>
      <span className="relative mt-3.5 font-serif text-[21px] leading-none text-hanji">
        {got.name}
      </span>
      <span className="relative mt-1.5 text-[11px] tracking-[0.2em] text-gold-soft">
        {got.hanja}
      </span>
      <span className="relative mt-4 h-px w-9 bg-ink-3" aria-hidden />

      {got.kind === "merit" ? (
        <span className="relative mt-4 font-serif text-[54px] font-light leading-none text-gold">
          {got.merit}
        </span>
      ) : word ? (
        <span className="relative mt-4 break-keep px-1 text-center font-serif text-[15px] leading-7 text-hanji">
          {got.text}
        </span>
      ) : (
        <span className="relative mt-4 break-keep px-1 text-center text-[12.5px] leading-6 text-hanji-dim">
          {sayOf(got.kind)}
        </span>
      )}

      {got.by && (
        <span className="relative mt-2.5 text-[11px] tracking-wide text-hanji-faint">
          {got.by}
        </span>
      )}
    </>
  );
}

// 자취의 날짜 — 09.14
function stamp(at: number): string {
  const d = new Date(at);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
