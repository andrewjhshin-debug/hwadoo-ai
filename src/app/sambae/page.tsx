"use client";

// ─────────────────────────────────────────────────────────────
// 삼배(三拜) — 황금 불상 앞에 세 번 절한다.
//
// 백팔배는 마음먹어야 하지만 삼배는 서른 초면 된다.
// 문턱이 없어야 매일 한다 — 그래서 이 방이 있다.
//
// 절은 눌러서 한다. 기울기로 세는 「숙여서」를 두었다가 걸었다 —
// 기기마다 값이 달라 잘 안 세지고, 안 세는 단추는 없니만 못하다.
//
// 절할 때마다 광배가 한 겹씩 밝아지고, 셋을 채우면 금빛이 퍼진다.
// 광배는 그림이 아니라 SVG 다 — 그래야 한 겹씩 살아난다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Info from "@/components/Info";
import { addMerit, inRound, loadMerit, ROUND } from "@/lib/merit";
import { buzz, hushVoice, setVoice, speak, strikeJukbi, strikeMoktak, voiceReady } from "@/lib/sound";
import { BOWS, doneToday, finishSambae, loadSambae, TO } from "@/lib/sambae";

export default function SambaePage() {
  const [n, setN] = useState(0); // 이번 판에 몇 배
  const [rounds, setRounds] = useState(0);
  const [total, setTotal] = useState(0);
  const [merit, setMerit] = useState(0);
  const [done, setDone] = useState(false);
  const [glow, setGlow] = useState(0); // 방금 절한 표시

  const nRef = useRef(0);
  nRef.current = n;

  // 소리 내어 읽기 — 삼귀의는 원래 입으로 하는 것이다.
  // 기본은 켬. 한 번 끄면 이 기기가 기억한다.
  const [readAloud, setReadAloud] = useState(true);
  const readRef = useRef(true);
  readRef.current = readAloud;

  useEffect(() => {
    const b = loadSambae();
    setRounds(b.rounds);
    setTotal(b.total);
    setMerit(loadMerit().total);
    try {
      const off = window.localStorage.getItem("hwadu.sambae.voice") === "off";
      if (off) {
        setReadAloud(false);
        setVoice(false);
      }
    } catch {
      /* 못 읽으면 켠 채로 */
    }
    return () => hushVoice();
  }, []);

  // 한 배
  const bow = useCallback(() => {
    if (nRef.current >= BOWS) return;
    const next = nRef.current + 1;
    nRef.current = next;
    setN(next);
    setGlow(next);
    strikeJukbi(0.7);
    buzz(14);
    window.setTimeout(() => setGlow(0), 420);
    // 죽비가 울린 뒤에 읽는다 — 소리가 겹치면 둘 다 안 들린다
    if (readRef.current) {
      const line = TO[Math.min(next - 1, BOWS - 1)]?.say;
      if (line) window.setTimeout(() => speak(line), 220);
    }

    if (next >= BOWS) {
      // 한 판 — 공덕은 절 세 번 몫
      const r = addMerit("bow", BOWS, 1); // 세 배를 한꺼번에 — 세는 단위는 「한 판」
      setMerit(r.total);
      const rd = finishSambae();
      setRounds(rd);
      setTotal(loadSambae().total);
      setDone(true);
      window.setTimeout(() => strikeMoktak(0.75), 260);
    }
  }, []);

  const again = () => {
    hushVoice();
    nRef.current = 0;
    setN(0);
    setDone(false);
  };

  const toggleVoice = () => {
    const on = !readAloud;
    setReadAloud(on);
    setVoice(on);
    if (!on) hushVoice();
    try {
      window.localStorage.setItem("hwadu.sambae.voice", on ? "on" : "off");
    } catch {
      /* 못 적어도 이번 판은 그대로 간다 */
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{`
        @keyframes sb-bow { 0%{transform:scale(1)} 34%{transform:scale(.955) translateY(6px)} 100%{transform:scale(1)} }
        @keyframes sb-spread { 0%{transform:scale(.86);opacity:.55} 100%{transform:scale(1.5);opacity:0} }
        @keyframes sb-breathe { 0%,100%{opacity:.20} 50%{opacity:.40} }
      `}</style>

      <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
        三拜 · 삼배
      </p>
      <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
        {n}
        <span className="ml-1 align-middle text-[20px] text-hanji-faint">/ {BOWS}</span>
      </p>
      <div className="rise rise-d1 mt-2.5 flex h-6 items-center justify-center gap-2">
        <p className="text-[13px] tracking-wide text-gold-soft">
          {done ? "삼배를 마쳤습니다" : TO[Math.min(n, BOWS - 1)].say}
        </p>
        {voiceReady() && (
          <button
            onClick={toggleVoice}
            aria-pressed={readAloud}
            aria-label={readAloud ? "소리 내어 읽기 끄기" : "소리 내어 읽기 켜기"}
            title={readAloud ? "소리 내어 읽기 — 켬" : "소리 내어 읽기 — 끔"}
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
              readAloud
                ? "border-gold/50 text-gold"
                : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-3 w-3">
              <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4z" />
              {readAloud ? (
                <>
                  <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
                  <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" opacity="0.6" />
                </>
              ) : (
                <path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* ── 불상 ── */}
      <button
        onClick={bow}
        disabled={done}
        aria-label="한 배"
        className="rise rise-d2 relative mt-2 block select-none outline-none disabled:cursor-default"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 광배 — 절마다 한 겹씩 밝아진다. 그림이 아니라 SVG 라야 살아난다 */}
        <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="sb_aura" cx="50%" cy="42%" r="50%">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.5" />
              <stop offset="60%" stopColor="var(--color-gold)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            cx="150"
            cy="126"
            r="118"
            fill="url(#sb_aura)"
            style={{ animation: "sb-breathe 4s ease-in-out infinite" }}
          />
          {[0, 1, 2].map((k) => (
            <circle
              key={k}
              cx="150"
              cy="126"
              r={72 + k * 21}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth={n > k ? 2.4 : 1}
              opacity={n > k ? 0.85 : 0.16}
              style={{ transition: "opacity .5s, stroke-width .5s" }}
            />
          ))}
          {glow > 0 && (
            <circle
              key={glow}
              cx="150"
              cy="126"
              r="96"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="3"
              style={{ animation: "sb-spread .42s ease-out forwards" }}
            />
          )}
        </svg>

        <span
          key={`b${n}`}
          className="relative block"
          style={{ animation: n > 0 ? "sb-bow .34s ease-out" : "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/obj/buddha.png"
            alt=""
            aria-hidden
            className="block h-[232px] w-[232px] object-contain"
            style={{ filter: `drop-shadow(0 0 ${18 + n * 14}px rgba(217,180,91,${0.18 + n * 0.14}))` }}
          />
        </span>
      </button>

      <p className="mt-1 h-5 text-[12px] tracking-[0.2em] text-hanji-faint">
        {done ? "" : "불상을 눌러 한 배"}
      </p>

      {/* ── 마쳤다 ── */}
      {done && (
        <div className="rise mt-3 w-full max-w-sm rounded-[14px] border border-gold/40 bg-gold/10 px-5 py-4 text-center">
          <p className="font-serif text-[26px] leading-none text-gold">+9</p>
          <p className="mt-1.5 text-[11.5px] tracking-[0.2em] text-hanji-faint">공덕</p>
          <p className="mt-3 break-keep text-[12.5px] leading-6 text-hanji-dim">
            오늘 {rounds}번째 삼배예요.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={again}
              className="rounded-full border border-gold/50 px-5 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/15"
            >
              한 번 더
            </button>
            <Link
              href="/bae"
              className="rounded-full border border-ink-3 px-5 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
            >
              백팔배로
            </Link>
          </div>
        </div>
      )}

      {/* ── 공덕 ── */}
      <Link
        href="/settings"
        className="rise rise-d3 mt-4 w-full max-w-sm rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-3 transition-colors hover:border-gold/40"
      >
        <div className="flex items-baseline justify-between text-[11.5px] tracking-wide">
          <span className="flex items-center gap-1 text-hanji-faint">
            백팔 한 바퀴
              <Info title="줄이 둘인 까닭" className="ml-1">
                <span className="text-hanji">맨 위 가는 금선</span>은 연꽃 한 송이까지입니다 —
                예순 바퀴를 채우면 한 송이가 여뭅니다.
                <br />
                <br />
                <span className="text-hanji">이 줄</span>은 백팔 한 바퀴입니다. 한 바퀴를 채울
                때마다 동자가 한마디 합니다. 둘 다 같은 공덕을 재고, 자만 다릅니다.
              </Info>
          </span>
          <span className="text-gold-soft tabular-nums">
            {inRound(merit)}
            <span className="text-hanji-faint">/{ROUND}</span>
          </span>
        </div>
        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink-3">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${(inRound(merit) / ROUND) * 100}%` }}
          />
        </div>
      </Link>

      {!done && doneToday() && (
        <p className="mt-4 text-[11.5px] tracking-wide text-hanji-faint">
          오늘 이미 {rounds}번 했어요
        </p>
      )}
    </div>
  );
}
