"use client";

// ─────────────────────────────────────────────────────────────
// 목탁과 염주 — 손끝의 수행.
//
// 우리 식으로 만든다. 운을 모으는 판이 아니다.
//
// · 염주 — 煩惱卽菩提. 알은 처음에 먹빛 번뇌다. 한 알 넘길 때마다
//   그 알이 금빛 보리로 물든다. 백팔을 다 넘기면 줄 전체가 금이 된다.
//   "오늘 내려놓은 번뇌" 를 센다.
// · 목탁 — 칠 때마다 「나·무·아·미·타·불」 한 글자가 떠오른다.
//   여섯 자를 채우면 한 편. 박자가 고르면 合(합)이 붙는다 — 흐트러지면 풀린다.
// · 싱잉볼 — 셋 중 혼자만 '세는' 물건이 아니다. 한 번 치면 십몇 초를 운다.
//   그동안 할 일은 듣는 것뿐이다. 그래서 여기엔 콤보도 연타도 없다.
//
// 셈은 하루 장부(daily)에서 읽는다 — 어제 친 것이 오늘로 넘어오지 않게.
// 소리는 Web Audio 로 그 자리에서 빚는다(음원 파일이 없다).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MOKTAK_SVG } from "./moktakSvg";
import Dudu from "@/components/Dudu";
import { addMerit, inRound, loadMerit, ROUND, stageOf } from "@/lib/merit";
import { loadDaily } from "@/lib/daily";
import {
  BOWL_TONES,
  buzz,
  clickBead,
  hushBowl,
  strikeBowl,
  strikeMoktak,
  warmMoktak,
  type BowlTone,
} from "@/lib/sound";

const BEADS = 108;
const RING = 36; // 고리에 걸린 알 수 — 세 바퀴가 곧 백팔
const STEP = 360 / RING;
const BOX = 316;
const ARC = 2 * Math.PI * 146; // 바깥 진행 고리 둘레
// 알이 왼쪽으로 넘어가므로 진행 고리도 왼쪽으로 차오른다 — 반시계로 그린 원
const ARC_PATH =
  "M158 12 A146 146 0 0 0 12 158 A146 146 0 0 0 158 304 " +
  "A146 146 0 0 0 304 158 A146 146 0 0 0 158 12";

// 염불 여섯 자 — 목탁을 칠 때마다 한 자씩
const NAMU = ["나", "무", "아", "미", "타", "불"] as const;

type Pop = { id: number; ch: string; dx: number; rot: number };

export default function MoktakPage() {
  const [tab, setTab] = useState<"moktak" | "yeomju" | "bowl">("moktak");
  const [vol, setVol] = useState(0.8);

  // 공덕
  const [merit, setMerit] = useState(0);
  const [round, setRound] = useState<number | null>(null);
  const earn = (src: "moktak" | "bead" | "bowl") => {
    const r = addMerit(src);
    setMerit(r.total);
    if (r.crossed) {
      setRound(r.round);
      window.setTimeout(() => setRound(null), 2800);
    }
  };

  // ── 목탁 ──────────────────────────────────────────────────
  const [hits, setHits] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [combo, setCombo] = useState(0); // 고른 박자로 이어 친 수
  const [auto, setAuto] = useState(false);
  const [bpm, setBpm] = useState(168);
  const popId = useRef(0);
  const beats = useRef<number[]>([]); // 최근 타점 사이 간격
  const lastAt = useRef(0);
  const autoRef = useRef({ on: false, bpm: 168, vol: 0.8 });
  autoRef.current = { on: auto, bpm, vol };

  // ── 싱잉볼 ────────────────────────────────────────────────
  const [tone, setTone] = useState<BowlTone>("mid");
  const [bowlHits, setBowlHits] = useState(0);
  const [ringing, setRinging] = useState(false);
  const ringTimer = useRef<number | null>(null);

  const ringBowl = () => {
    const secs = strikeBowl(vol, tone);
    if (!secs) return;
    earn("bowl");
    buzz(14);
    setBowlHits((n) => n + 1);
    setRinging(true);
    if (ringTimer.current) window.clearTimeout(ringTimer.current);
    ringTimer.current = window.setTimeout(() => setRinging(false), secs * 1000);
  };

  const stopBowl = () => {
    hushBowl();
    if (ringTimer.current) window.clearTimeout(ringTimer.current);
    setRinging(false);
  };

  // ── 염주 ──────────────────────────────────────────────────
  const [total, setTotal] = useState(0);
  const dragX = useRef<number | null>(null);
  const dragAcc = useRef(0);

  // 하루 장부에서 오늘치를 이어받는다
  useEffect(() => {
    warmMoktak(); // 음원을 미리 받아 둔다 — 첫 타가 늦지 않게
    const b = loadDaily();
    setMerit(loadMerit().total);
    setHits(b.by.moktak ?? 0);
    setTotal(b.by.bead ?? 0);
    setBowlHits(b.by.bowl ?? 0);
  }, []);

  // 한 타 — 소리 · 글자 · 박자
  const strike = (byHand: boolean) => {
    strikeMoktak(autoRef.current.vol);
    setHits((n) => {
      const ch = NAMU[n % NAMU.length];
      const id = ++popId.current;
      setPops((p) => [
        ...p.slice(-7),
        { id, ch, dx: (Math.random() - 0.5) * 54, rot: (Math.random() - 0.5) * 22 },
      ]);
      window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1000);
      return n + 1;
    });

    // 박자 — 최근 세 간격이 고르면 合이 붙는다
    const now = performance.now();
    if (lastAt.current) {
      const gap = now - lastAt.current;
      if (gap > 120 && gap < 2400) {
        const list = [...beats.current, gap].slice(-3);
        beats.current = list;
        const avg = list.reduce((s, x) => s + x, 0) / list.length;
        const even = list.every((x) => Math.abs(x - avg) / avg < 0.16);
        setCombo((c) => (list.length >= 2 && even ? c + 1 : 0));
      } else {
        beats.current = [];
        setCombo(0);
      }
    }
    lastAt.current = now;

    if (byHand) {
      earn("moktak");
      buzz(8);
    }
  };

  const hit = () => strike(true);

  // 자동 목탁을 틀어 둔 채 염주로 넘가거나 앱을 나가면 소리만 따라온다 —
  // 끜 수 없는 소리는 수행이 아니라 소음이다. 둘 다 그 자리에서 끔는다.
  useEffect(() => {
    if (tab !== "moktak") setAuto(false);
    // 그릇도 같은 규칙 — 다른 갈래로 넘어가면 여운만 남기고 멎는다
    if (tab !== "bowl") {
      hushBowl();
      setRinging(false);
    }
  }, [tab]);

  useEffect(() => {
    const hush = () => {
      if (document.visibilityState === "hidden") {
        setAuto(false);
        hushBowl();
        setRinging(false);
      }
    };
    document.addEventListener("visibilitychange", hush);
    window.addEventListener("pagehide", hush);
    return () => {
      document.removeEventListener("visibilitychange", hush);
      window.removeEventListener("pagehide", hush);
    };
  }, []);

  // 자동 목탁 — 사람 손처럼 박자를 아주 살짝 흔든다
  useEffect(() => {
    if (!auto) return;
    let alive = true;
    let timer: number;
    const tick = () => {
      if (!alive || !autoRef.current.on) return;
      strike(false);
      const base = 60000 / autoRef.current.bpm;
      timer = window.setTimeout(tick, base * (0.94 + Math.random() * 0.12));
    };
    timer = window.setTimeout(tick, 60);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // 한 알 — 번뇌 하나가 보리로
  const advance = () => {
    clickBead(vol);
    earn("bead");
    buzz(6);
    setTotal((n) => n + 1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
    dragAcc.current = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragX.current === null) return;
    const dx = dragX.current - e.clientX; // 왼쪽으로 쓸면 +
    dragX.current = e.clientX;
    dragAcc.current += dx;
    while (dragAcc.current >= 42) {
      dragAcc.current -= 42;
      advance();
    }
    if (dragAcc.current < 0) dragAcc.current = 0;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX.current !== null && Math.abs(dragAcc.current) < 8) advance();
    dragX.current = null;
    dragAcc.current = 0;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const pos = total % BEADS;
  const rounds = Math.floor(total / BEADS);
  const angle = -total * STEP;
  // 물든 만큼만 금빛 겹을 보여 준다 — 위에서 시계방향으로
  const f = pos / BEADS;
  const goldMask =
    f <= 0
      ? "linear-gradient(#0000, #0000)"
      : `conic-gradient(from 0deg at 50% 50%, #000 0turn ${f}turn, #0000 ${f + 0.008}turn 1turn)`;
  const phrases = Math.floor(hits / NAMU.length); // 나무아미타불 몇 편

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{`
        @keyframes mk-hit {
          0% { transform: scale(1); filter: brightness(1); }
          18% { transform: scale(0.955) translateY(3px); filter: brightness(1.3); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes mk-ripple {
          0% { transform: scale(0.7); opacity: 0.55; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes mk-pop {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          22% { transform: translateY(-18px) scale(1.12); opacity: 1; }
          100% { transform: translateY(-96px) scale(0.94); opacity: 0; }
        }
        @keyframes mk-glow {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.34; }
        }
        .moktak-svg { display: block; width: 100%; height: 100%; }

        /* 그릇의 울림 — 소리가 나는 동안 파문이 번진다.
           세 겹을 시차로 띄워 놓으면 끊기지 않고 이어진다. */
        .bowl-wave {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 150px;
          height: 46px;
          margin-left: -75px;
          margin-top: -23px;
          border-radius: 50%;
          border: 1px solid rgba(217, 180, 91, 0.55);
          animation: bowl-ring 2.6s ease-out infinite;
          pointer-events: none;
        }
        .bowl-wave-2 { animation-delay: 0.87s; }
        .bowl-wave-3 { animation-delay: 1.74s; }
        @keyframes bowl-ring {
          0%   { transform: scale(0.72); opacity: 0; }
          18%  { opacity: 0.6; }
          100% { transform: scale(2.1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bowl-wave { animation: none; opacity: 0.25; }
        }
      `}</style>

      {/* ── 갈래 — 알약 하나에 셋 ── */}
      <div className="rise flex w-full max-w-[340px] rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {(
          [
            ["moktak", "목탁"],
            ["yeomju", "염주"],
            ["bowl", "싱잉볼"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`flex-1 rounded-full py-2.5 text-[13.5px] tracking-[0.14em] transition-colors ${
              tab === k
                ? "bg-hanji text-ink"
                : "text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "moktak" ? (
        <>
          {/* ── 오늘 울린 수 — 크게 ── */}
          <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
            오늘 울린 목탁
          </p>
          <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
            {hits.toLocaleString("ko-KR")}
          </p>
          <p className="rise rise-d1 mt-2.5 flex items-center gap-2 text-[12.5px] tracking-wide">
            {combo >= 2 ? (
              <>
                <span className="rounded-full bg-gold px-2.5 py-[3px] font-serif text-[13px] leading-none text-ink">
                  合
                </span>
                <span className="text-gold">{combo}타 이어짐 — 박자가 고릅니다</span>
              </>
            ) : (
              <span className="text-hanji-faint">
                「나무아미타불」 {phrases.toLocaleString("ko-KR")}편 · 고르게 치면 合
              </span>
            )}
          </p>

          {/* ── 목탁 ── */}
          <div className="rise rise-d2 relative mt-4 flex flex-col items-center">
            {/* 떠오르는 글자 */}
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 z-10">
              {pops.map((p) => (
                <span
                  key={p.id}
                  className="absolute font-serif text-[30px] leading-none text-gold"
                  style={{
                    left: p.dx,
                    transform: `rotate(${p.rot}deg)`,
                    animation: "mk-pop 1s cubic-bezier(.2,.7,.3,1) forwards",
                    textShadow: "0 2px 12px rgba(221,160,28,0.45)",
                  }}
                >
                  {p.ch}
                </span>
              ))}
            </span>

            <button
              onClick={hit}
              aria-label="목탁 치기"
              className="relative block select-none outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* 바닥 빛무리 — 칠수록 살아난다 */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, var(--color-gold) 0%, transparent 62%)",
                  animation: "mk-glow 3.4s ease-in-out infinite",
                }}
              />
              <span
                key={`r${hits}`}
                aria-hidden
                className="pointer-events-none absolute rounded-full border border-gold/35"
                style={{
                  left: "10%",
                  top: "22%",
                  width: "62%",
                  height: "62%",
                  animation: hits > 0 ? "mk-ripple 0.6s ease-out forwards" : "none",
                }}
              />
              <span
                key={`m${hits}`}
                className="block"
                style={{ animation: hits > 0 ? "mk-hit 0.16s ease-out" : "none" }}
              >
                {/* 3D 일러스트 — 코드로 깎은 것보다 낫다. 없으면 SVG 로 돌아간다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/obj/moktak.png"
                  alt=""
                  aria-hidden
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const fb = el.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = "block";
                  }}
                  className="block h-[300px] w-[300px] object-contain"
                />
                <span
                  className="hidden h-[236px] w-[340px]"
                  dangerouslySetInnerHTML={{ __html: MOKTAK_SVG }}
                />
              </span>
            </button>
            <p className="mt-1 text-[12px] tracking-[0.25em] text-hanji-faint">
              {hits === 0 ? "눌러 보세요" : ""}
            </p>
          </div>

          {/* 자동 목탁 */}
          <div className="rise rise-d3 mt-7 w-full max-w-sm space-y-4 rounded-[14px] border border-ink-3 bg-ink-2/40 px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] tracking-[0.2em] text-hanji-dim">
                자동 목탁 — 틀어 두고 듣기
              </span>
              <button
                role="switch"
                aria-checked={auto}
                aria-label="자동 목탁"
                onClick={() => setAuto((v) => !v)}
                className={`relative h-[26px] w-[46px] rounded-full border transition-colors ${
                  auto ? "border-gold bg-gold" : "border-hanji-faint bg-transparent"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-200 ${
                    auto ? "translate-x-5 bg-ink" : "bg-hanji-faint"
                  }`}
                />
              </button>
            </div>
            <label className="block">
              <span className="flex justify-between text-[11px] tracking-wide text-hanji-faint">
                <span>빠르기</span>
                <span>{bpm} 회/분</span>
              </span>
              <input
                type="range"
                min={60}
                max={300}
                step={6}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#D9B45B]"
              />
            </label>
            <label className="block">
              <span className="flex justify-between text-[11px] tracking-wide text-hanji-faint">
                <span>음량</span>
                <span>{Math.round(vol * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={(e) => setVol(Number(e.target.value))}
                className="mt-1.5 w-full accent-[#D9B45B]"
              />
            </label>
          </div>
        </>
      ) : tab === "yeomju" ? (
        <>
          {/* ── 오늘 내려놓은 번뇌 ── */}
          <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
            오늘 내려놓은 번뇌
          </p>
          <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
            {total.toLocaleString("ko-KR")}
          </p>
          <p className="rise rise-d1 mt-2.5 text-[12.5px] tracking-wide text-hanji-faint">
            {rounds > 0 ? (
              <>
                백팔 <span className="text-gold">{rounds}바퀴</span> · 이번 바퀴 {pos}/108
              </>
            ) : (
              <>한 알에 번뇌 하나 — 백팔이면 한 바퀴</>
            )}
          </p>

          {/* ── 염주 — 넘긴 만큼 줄이 금빛 보리로 물든다 ── */}
          <div className="rise rise-d2 mt-3 flex flex-col items-center">
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative touch-none select-none"
              style={{ width: BOX, height: BOX, cursor: "grab" }}
              aria-label="염주 굴리기 — 왼쪽으로 쓸거나 톡 누르면 한 알"
            >
              {/* 바깥 진행 고리 — 백팔이 차오른다 */}
              <svg
                aria-hidden
                viewBox="0 0 316 316"
                className="absolute inset-0 h-full w-full"
              >
                <path d={ARC_PATH} fill="none" stroke="var(--color-ink-3)" strokeWidth="2" />
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ARC}
                  strokeDashoffset={ARC * (1 - pos / BEADS)}
                  style={{ transition: "stroke-dashoffset 0.2s ease-out" }}
                />
              </svg>

              {/* 염주 — 굴리면 돈다 */}
              <div className="absolute inset-0 grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/obj/bead.png"
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="block h-[262px] w-[262px] object-contain"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transition: "transform 0.16s ease-out",
                    filter: "drop-shadow(0 10px 26px rgba(0,0,0,0.55))",
                  }}
                />
              </div>

              {/* 물든 만큼 금빛 — 위에서 시계방향으로 차오른다 */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 grid place-items-center"
                style={{ maskImage: goldMask, WebkitMaskImage: goldMask }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/obj/bead.png"
                  alt=""
                  draggable={false}
                  className="block h-[262px] w-[262px] object-contain"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transition: "transform 0.16s ease-out",
                    filter:
                      "sepia(1) saturate(2.6) hue-rotate(-8deg) brightness(1.32) contrast(1.04) drop-shadow(0 0 16px rgba(217,180,91,0.45))",
                  }}
                />
              </div>

              {/* 지금 넘기는 자리 */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 text-gold-soft"
                style={{ top: 14, fontSize: 11, letterSpacing: "0.2em" }}
              >
                ▼
              </span>
            </div>

            <p className="mt-3 text-[11.5px] tracking-[0.2em] text-hanji-faint">
              쓸거나 눌러서 한 알
            </p>
          </div>
        </>
      ) : (
        <>
          {/* ── 싱잉볼 — 치고, 듣는다 ── */}
          <p className="rise rise-d1 mt-8 text-[12px] tracking-[0.35em] text-hanji-faint">
            오늘 울린 그릇
          </p>
          <p className="rise rise-d1 mt-1 font-serif text-[68px] font-light leading-none text-hanji">
            {bowlHits.toLocaleString("ko-KR")}
          </p>

          {/* 그릇 고르기 — 클수록 낮게 운다 */}
          <div className="rise rise-d1 mt-6 flex gap-2">
            {BOWL_TONES.map((b) => (
              <button
                key={b.id}
                onClick={() => setTone(b.id)}
                aria-pressed={tone === b.id}
                className={`rounded-full border px-3.5 py-1.5 text-[11.5px] transition-colors ${
                  tone === b.id
                    ? "border-gold/60 bg-gold/12 text-gold"
                    : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* ── 그릇 ── */}
          <button
            onClick={ringBowl}
            aria-label="싱잉볼 치기"
            className="rise rise-d2 relative mt-5 flex h-[198px] w-[268px] items-center justify-center outline-none"
          >
            {/* 울림 — 소리가 나는 동안만 파문이 번진다 */}
            {ringing && (
              <>
                <span className="bowl-wave" />
                <span className="bowl-wave bowl-wave-2" />
                <span className="bowl-wave bowl-wave-3" />
              </>
            )}
            {/* 위쪽 빈 칸은 잘라 낸다 — 그릇이 통을 꽉 채우도록 */}
            <svg viewBox="8 60 234 173" className="relative h-full w-full">
              <defs>
                {/* 놋쇠 몸통 — 가로로 밝고 어두운 띠가 갈마들어야 둥글어 보인다 */}
                <linearGradient id="bowlBrass" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c5a1e" />
                  <stop offset="8%" stopColor="#c59a3c" />
                  <stop offset="21%" stopColor="#fbeec0" />
                  <stop offset="33%" stopColor="#e0b754" />
                  <stop offset="50%" stopColor="#b98e2f" />
                  <stop offset="65%" stopColor="#edc76a" />
                  <stop offset="79%" stopColor="#fff2cd" />
                  <stop offset="92%" stopColor="#b6862c" />
                  <stop offset="100%" stopColor="#6d4e1a" />
                </linearGradient>
                {/* 아래로 갈수록 어두워진다 — 빛은 위에서 온다 */}
                {/* 아래로 갈수록 살짝만 어둡게. 진하게 덮었더니 놋쇠가
                    올리브색으로 죽었다 — 금속은 어두운 데서도 빛을 문다. */}
                <linearGradient id="bowlShade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000" stopOpacity="0" />
                  <stop offset="62%" stopColor="#000" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#2a1c06" stopOpacity="0.34" />
                </linearGradient>
                {/* 그릇 안 — 깊을수록 어둡고, 먼 벽에 빛이 닿는다 */}
                <radialGradient id="bowlIn" cx="0.5" cy="0.18" r="0.95">
                  <stop offset="0%" stopColor="#b18f42" />
                  <stop offset="34%" stopColor="#5c451a" />
                  <stop offset="72%" stopColor="#2e2210" />
                  <stop offset="100%" stopColor="#7a5d24" />
                </radialGradient>
                {/* 방석 */}
                <radialGradient id="cushTop" cx="0.42" cy="0.3" r="0.8">
                  <stop offset="0%" stopColor="#b4503a" />
                  <stop offset="62%" stopColor="#8c3626" />
                  <stop offset="100%" stopColor="#5a1d13" />
                </radialGradient>
                {/* 바닥 그림자 */}
                <radialGradient id="floorShade" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.62" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* 바닥에 드리운 그늘 */}
              <ellipse cx="127" cy="210" rx="92" ry="20" fill="url(#floorShade)" />

              {/* 방석 — 두께가 있어야 그릇이 얹힌 것으로 보인다.
                  옆구리를 한 겹 깔고 그 위에 윗면을 얹는다. */}
              <path d="M47 196v9a78 21 0 0 0 156 0v-9z" fill="#68231708" />
              <path d="M47 196v9a78 21 0 0 0 156 0v-9z" fill="#6d2718" />
              <ellipse cx="125" cy="196" rx="78" ry="21" fill="url(#cushTop)" />
              <ellipse cx="125" cy="194" rx="66" ry="15" fill="#000" opacity="0.26" />

              {/* 그릇 몸통 */}
              <path d="M49 96c0 49 34 89 76 89s76-40 76-89z" fill="url(#bowlBrass)" />
              <path d="M49 96c0 49 34 89 76 89s76-40 76-89z" fill="url(#bowlShade)" />
              {/* 두드려 편 자국 — 가로로 난 얕은 띠 */}
              {[114, 132, 150, 166].map((y, n) => {
                const k = (y - 96) / 89;
                const half = 76 * Math.sqrt(Math.max(0, 1 - k * k));
                return (
                  <path
                    key={y}
                    d={`M${125 - half} ${y}q${half} ${7 - n} ${half * 2} 0`}
                    fill="none"
                    stroke="#3d2c0f"
                    strokeWidth="1.1"
                    opacity="0.22"
                  />
                );
              })}
              {/* 왼쪽 어깨에 든 빛 한 줄 */}
              <path
                d="M69 104c2 26 11 46 25 58"
                fill="none"
                stroke="#fff0c6"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.2"
              />
              {/* 방석에 닿는 자리 — 어둡게 눌러 붙인다 */}
              <ellipse cx="125" cy="180" rx="34" ry="11" fill="#1a1207" opacity="0.5" />

              {/* 아가리 */}
              <ellipse cx="125" cy="96" rx="76" ry="22" fill="url(#bowlIn)" />
              {/* 테 — 위쪽은 밝고 아래쪽은 어둡다 (금속의 두께) */}
              <path
                d="M49 96a76 22 0 0 1 152 0"
                fill="none"
                stroke="#fff4d2"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M49 96a76 22 0 0 0 152 0"
                fill="none"
                stroke="#7a5b22"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* 안쪽 벽에 비친 빛 */}
              <path
                d="M74 103c11 8 28 12 47 12"
                fill="none"
                stroke="#d9b45b"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.32"
              />

              {/* 방석 — 앞쪽 테두리가 그릇 앞을 살짝 감싼다 */}
              <path
                d="M47 196a78 21 0 0 0 156 0"
                fill="url(#cushTop)"
                stroke="#5a1d13"
                strokeWidth="1"
              />
              <path
                d="M51 199a74 17 0 0 0 148 0"
                fill="none"
                stroke="#d9b45b"
                strokeWidth="1.2"
                opacity="0.45"
              />

              {/* 채는 그리지 않는다. 방석에 반쯤 묻혀 숟가락처럼 보였다 —
                  그릇 하나만 놓여 있는 편이 낫다. */}
            </svg>
          </button>

          <p className="rise rise-d2 mt-2 text-[11.5px] tracking-[0.2em] text-hanji-faint">
            {ringing ? "울리는 중 — 끝까지 들어 보세요" : "그릇을 눌러 한 번"}
          </p>

          {ringing && (
            <button
              onClick={stopBowl}
              className="mt-3 rounded-full border border-ink-3 px-4 py-2 text-[11.5px] text-hanji-dim transition-colors hover:text-hanji"
            >
              손으로 감싸 그치기
            </button>
          )}
        </>
      )}

      {/* ── 공덕 — 아래에 얇게 ── */}
      <Link
        href="/settings"
        className="rise rise-d3 mt-8 w-full max-w-sm rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-3.5 transition-colors hover:border-gold/40"
      >
        <div className="flex items-baseline justify-between text-[11.5px] tracking-wide">
          <span className="text-hanji-faint">공덕 功德</span>
          <span className="text-gold-soft">
            {merit.toLocaleString("ko-KR")}
            <span className="ml-1 text-hanji-faint">
              · 이번 바퀴 {inRound(merit)}/{ROUND}
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-ink-3">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${(inRound(merit) / ROUND) * 100}%` }}
          />
        </div>
      </Link>

      {/* 한 바퀴를 넘었다 — 나무가 잠깐 나온다 */}
      {round !== null && (
        <div
          role="status"
          className="rise mt-4 flex items-center gap-3 rounded-[14px] border border-gold/40 bg-gold/10 px-4 py-3"
        >
          <Dudu stage={stageOf(merit)} mood="joy" uid="round" className="h-14 w-14 shrink-0" />
          <p className="break-keep text-[13px] leading-6 text-hanji">
            백팔 한 바퀴를 돌았어요 — <span className="text-gold">{round}바퀴째</span>
            <br />
            <span className="text-[11.5px] text-hanji-dim">
              쌓인 공덕은 내 도량에서 남에게 회향할 수 있어요.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
