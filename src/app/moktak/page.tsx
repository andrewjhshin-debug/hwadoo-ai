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
import { buzz, clickBead, strikeMoktak } from "@/lib/sound";

const BEADS = 108;
const RING = 36; // 고리에 걸린 알 수 — 세 바퀴가 곧 백팔
const STEP = 360 / RING;
const R = 118;
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
  const [tab, setTab] = useState<"moktak" | "yeomju">("moktak");
  const [vol, setVol] = useState(0.8);

  // 공덕
  const [merit, setMerit] = useState(0);
  const [round, setRound] = useState<number | null>(null);
  const earn = (src: "moktak" | "bead") => {
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

  // ── 염주 ──────────────────────────────────────────────────
  const [total, setTotal] = useState(0);
  const dragX = useRef<number | null>(null);
  const dragAcc = useRef(0);

  // 하루 장부에서 오늘치를 이어받는다
  useEffect(() => {
    const b = loadDaily();
    setMerit(loadMerit().total);
    setHits(b.by.moktak ?? 0);
    setTotal(b.by.bead ?? 0);
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
  const topIdx = total % RING; // 지금 위에 올라온 알
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
      `}</style>

      {/* ── 갈래 — 알약 하나에 둘 ── */}
      <div className="rise flex w-full max-w-[280px] rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {(
          [
            ["moktak", "목탁"],
            ["yeomju", "염주"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`flex-1 rounded-full py-2.5 text-[14px] tracking-[0.2em] transition-colors ${
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
                <span
                  className="block h-[236px] w-[340px]"
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
      ) : (
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

          {/* ── 염주 — 넘긴 알이 금빛 보리로 물든다 ── */}
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

              {/* 실 */}
              <span
                aria-hidden
                className="absolute rounded-full border-2 border-[#221912]"
                style={{
                  left: BOX / 2 - R,
                  top: BOX / 2 - R,
                  width: R * 2,
                  height: R * 2,
                  maskImage:
                    "linear-gradient(to bottom, black 45%, rgba(0,0,0,0.15) 80%, transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 45%, rgba(0,0,0,0.15) 80%, transparent)",
                }}
              />

              {/* 고리 */}
              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transition: "transform 0.16s ease-out",
                }}
              >
                {Array.from({ length: RING }, (_, k) => {
                  const mother = k === 0; // 모주
                  const bodhi = k < topIdx; // 이미 넘긴 알 — 보리로 물들었다
                  const eff = (((k * STEP + angle) % 360) + 360) % 360;
                  const fromTop = Math.min(eff, 360 - eff);
                  const nearTop = Math.max(0, 1 - fromTop / 46);
                  const vis = Math.max(0, 1 - fromTop / 132);
                  const size = (mother ? 34 : 26) * (1 + nearTop * 0.32);
                  return (
                    <span
                      key={k}
                      aria-hidden
                      className="absolute left-1/2 top-1/2"
                      style={{ transform: `rotate(${k * STEP}deg) translateY(${-R}px)` }}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: size,
                          height: size,
                          marginLeft: -size / 2,
                          marginTop: -size / 2,
                          transform: `rotate(${-(k * STEP + angle)}deg)`,
                          transition:
                            "transform 0.16s ease-out, width 0.16s, height 0.16s, margin 0.16s, background 0.5s ease-out, box-shadow 0.5s",
                          // 번뇌는 먹빛 자단, 넘긴 알은 금빛 보리
                          background: mother
                            ? "radial-gradient(circle at 35% 28%, #f3d98d, #cfa757 42%, #8a662a 78%, #57411a)"
                            : bodhi
                              ? "radial-gradient(circle at 35% 28%, #ffe6a0, #dda01c 46%, #9a6c12 82%, #5c400a)"
                              : "radial-gradient(circle at 35% 28%, #8a5c34, #573620 50%, #33200f 85%, #1d1108)",
                          // 1px 테두리 — 흰 바탕에서도 알이 또렷하게 선다
                          boxShadow: bodhi
                            ? "0 0 0 1px rgba(122,84,10,0.45), 0 4px 12px rgba(221,160,28,0.4), inset 0 -3px 6px rgba(90,60,0,0.4)"
                            : "0 0 0 1px rgba(30,17,8,0.5), 0 4px 9px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.4)",
                          opacity: vis,
                        }}
                      />
                    </span>
                  );
                })}
              </div>

              {/* 지금 넘기는 자리 */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 text-gold-soft"
                style={{ top: 16, fontSize: 11, letterSpacing: "0.2em" }}
              >
                ▼
              </span>

              {/* 가운데 — 번뇌즉보리 */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-serif text-[15px] tracking-[0.3em] text-gold-soft">
                  煩惱卽菩提
                </p>
                <p className="mt-1.5 break-keep text-center text-[11px] leading-5 text-hanji-faint">
                  넘긴 알이 금빛으로 물듭니다
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11.5px] tracking-[0.2em] text-hanji-faint">
              쓸거나 눌러서 한 알
            </p>
          </div>
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
