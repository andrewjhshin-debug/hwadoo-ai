"use client";

// ─────────────────────────────────────────────────────────────
// 목탁과 염주 — 손끝의 수행 (ASMR).
// · 목탁: 누르면 울린다. 소리는 Web Audio 로 그 자리에서 빚는다
//   (몸통 울림 + 타격 '딱' + 나무 결 노이즈). 자동 연타(빠르기 조절)도.
// · 염주: 108알 꿰미를 쓸어 넘긴다 — 알마다 딸깍, 108알을 다 넘기면
//   일주(一周) 회향. 위로 쓸거나 톡톡 눌러 한 알씩.
// · 소리 합성이라 파일이 없다 — 첫 터치에서 AudioContext 를 깨운다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

// ── 소리 — 나무를 빚는다 ────────────────────────────────────

let actx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!actx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}

// 짧은 백색소음 버퍼 — 나무 결의 재료
let noiseBuf: AudioBuffer | null = null;
function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// 목탁 한 방 — 몸통 울림(사인, 피치 내림) + '딱'(삼각파) + 결(밴드패스 노이즈)
function strikeMoktak(vol: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol;
  out.connect(ac.destination);

  const base = 540 + Math.random() * 50; // 매 방 미세하게 다른 나무
  const o1 = ac.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(base, t);
  o1.frequency.exponentialRampToValueAtTime(base * 0.52, t + 0.1);
  const g1 = ac.createGain();
  g1.gain.setValueAtTime(0.0001, t);
  g1.gain.exponentialRampToValueAtTime(0.85, t + 0.004);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o1.connect(g1);
  g1.connect(out);
  o1.start(t);
  o1.stop(t + 0.22);

  const o2 = ac.createOscillator();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(1350 + Math.random() * 250, t);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.3, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  o2.connect(g2);
  g2.connect(out);
  o2.start(t);
  o2.stop(t + 0.06);

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 950;
  bp.Q.value = 1.1;
  const g3 = ac.createGain();
  g3.gain.setValueAtTime(0.22, t);
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(bp);
  bp.connect(g3);
  g3.connect(out);
  src.start(t);
}

// 염주 한 알 — 아주 짧은 고음 딸깍 (알끼리 부딪는 소리)
function clickBead(vol: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol * 0.7;
  out.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2600;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t);

  const o = ac.createOscillator();
  o.type = "sine";
  const f = 1750 + Math.random() * 180;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.03);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.18, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  o.connect(g2);
  g2.connect(out);
  o.start(t);
  o.stop(t + 0.07);
}

function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* 진동이 없는 기기 */
  }
}

// ── 화면 ────────────────────────────────────────────────────

const BEADS = 108;
const BEAD_H = 52; // 알 하나가 차지하는 세로 간격(px)
const WINDOW_H = 320; // 꿰미가 보이는 창

export default function MoktakPage() {
  const [tab, setTab] = useState<"moktak" | "yeomju">("moktak");
  const [vol, setVol] = useState(0.8);

  // 목탁
  const [hits, setHits] = useState(0);
  const [auto, setAuto] = useState(false);
  const [bpm, setBpm] = useState(168);
  const autoRef = useRef<{ on: boolean; bpm: number; vol: number }>({
    on: false,
    bpm: 168,
    vol: 0.8,
  });
  autoRef.current = { on: auto, bpm, vol };

  const hit = () => {
    strikeMoktak(autoRef.current.vol);
    setHits((n) => n + 1);
    buzz(8);
  };

  // 자동 연타 — 사람 손처럼 박자를 아주 살짝 흔든다
  useEffect(() => {
    if (!auto) return;
    let alive = true;
    let timer: number;
    const tick = () => {
      if (!alive || !autoRef.current.on) return;
      strikeMoktak(autoRef.current.vol);
      setHits((n) => n + 1);
      const base = 60000 / autoRef.current.bpm;
      timer = window.setTimeout(tick, base * (0.94 + Math.random() * 0.12));
    };
    timer = window.setTimeout(tick, 60);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [auto]);

  // 염주
  const [total, setTotal] = useState(0); // 이 자리에서 넘긴 알의 총수
  const pos = total % BEADS;
  const rounds = Math.floor(total / BEADS);
  const [noAnim, setNoAnim] = useState(false); // 일주 순간의 되감기엔 애니메이션을 끈다
  const dragY = useRef<number | null>(null);
  const dragAcc = useRef(0);

  const advance = () => {
    clickBead(vol);
    buzz(6);
    setTotal((n) => {
      const next = n + 1;
      if (next % BEADS === 0) {
        // 일주 — 꿰미를 소리 없이 처음 자리로 되감는다
        setNoAnim(true);
        window.setTimeout(() => setNoAnim(false), 60);
      }
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragY.current = e.clientY;
    dragAcc.current = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragY.current === null) return;
    const dy = dragY.current - e.clientY; // 위로 쓸면 +
    dragY.current = e.clientY;
    dragAcc.current += dy;
    while (dragAcc.current >= 40) {
      dragAcc.current -= 40;
      advance();
    }
    if (dragAcc.current < 0) dragAcc.current = 0; // 아래로는 되돌리지 않는다
  };
  const onPointerUp = (e: React.PointerEvent) => {
    // 거의 안 움직였으면 톡 — 한 알
    if (dragY.current !== null && Math.abs(dragAcc.current) < 8) advance();
    dragY.current = null;
    dragAcc.current = 0;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-8 md:pt-12">
      <style>{`
        @keyframes moktak-hit {
          0% { transform: scale(1); filter: brightness(1); }
          18% { transform: scale(0.965); filter: brightness(1.25); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes moktak-ripple {
          0% { transform: scale(0.7); opacity: 0.5; }
          100% { transform: scale(1.7); opacity: 0; }
        }
      `}</style>

      <p className="rise text-xs tracking-[0.5em] text-gold-soft">
        木鐸 · 목탁과 염주
      </p>
      <p className="rise rise-d1 mt-3 break-keep text-center text-[13px] leading-6 text-hanji-dim">
        두드리고, 굴리는 — 손끝의 수행. 소리를 켜 두십시오.
      </p>

      {/* 갈래 */}
      <div className="rise rise-d1 mt-6 flex gap-2">
        {(
          [
            ["moktak", "목탁"],
            ["yeomju", "염주 108"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-5 py-2 text-[13px] tracking-[0.15em] transition-colors ${
              tab === k
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "moktak" ? (
        <>
          {/* 목탁 — 누르는 자리 */}
          <div className="rise rise-d2 relative mt-10 flex flex-col items-center">
            <button
              onClick={hit}
              aria-label="목탁 치기"
              className="relative block select-none outline-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* 울림 물결 */}
              <span
                key={`r${hits}`}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border border-gold/40"
                style={{
                  animation:
                    hits > 0 ? "moktak-ripple 0.6s ease-out forwards" : "none",
                }}
              />
              <span
                key={`m${hits}`}
                className="block"
                style={{
                  animation:
                    hits > 0 ? "moktak-hit 0.16s ease-out" : "none",
                }}
              >
                {/* 목탁 몸통 — 입체감은 빛으로 */}
                <svg
                  viewBox="0 0 200 190"
                  className="h-[220px] w-[232px] drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
                  aria-hidden
                >
                  <defs>
                    <radialGradient id="wood" cx="38%" cy="30%" r="80%">
                      <stop offset="0%" stopColor="#a97b47" />
                      <stop offset="45%" stopColor="#7d5426" />
                      <stop offset="80%" stopColor="#54371a" />
                      <stop offset="100%" stopColor="#3a2512" />
                    </radialGradient>
                    <linearGradient id="slit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c110a" />
                      <stop offset="100%" stopColor="#0d0805" />
                    </linearGradient>
                    <radialGradient id="sheen" cx="35%" cy="22%" r="40%">
                      <stop offset="0%" stopColor="rgba(255,235,200,0.5)" />
                      <stop offset="100%" stopColor="rgba(255,235,200,0)" />
                    </radialGradient>
                  </defs>
                  {/* 몸통 */}
                  <path
                    d="M100 12 C155 12 186 52 186 98 C186 146 150 176 100 176 C50 176 14 146 14 98 C14 52 45 12 100 12 Z"
                    fill="url(#wood)"
                  />
                  {/* 물고기 입 — 아래 벌어진 소리 틈 */}
                  <path
                    d="M32 122 C58 148 142 148 168 122 C150 166 118 176 100 176 C82 176 50 166 32 122 Z"
                    fill="url(#slit)"
                  />
                  {/* 틈 가장자리 하이라이트 */}
                  <path
                    d="M34 121 C60 145 140 145 166 121"
                    fill="none"
                    stroke="rgba(217,180,91,0.28)"
                    strokeWidth="2"
                  />
                  {/* 광 */}
                  <ellipse cx="76" cy="52" rx="46" ry="30" fill="url(#sheen)" />
                  {/* 손잡이 꼭지 */}
                  <path
                    d="M92 8 C92 2 108 2 108 8 L106 18 L94 18 Z"
                    fill="#54371a"
                  />
                </svg>
              </span>
            </button>
            <p className="mt-5 text-[12px] tracking-[0.25em] text-hanji-faint">
              {hits === 0 ? "목탁을 눌러 보십시오" : `${hits.toLocaleString("ko-KR")} 번 울렸습니다`}
            </p>
          </div>

          {/* 자동 연타 + 조절 */}
          <div className="rise rise-d3 mt-8 w-full max-w-sm space-y-4 rounded-[14px] border border-ink-3 bg-ink-2/40 px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] tracking-[0.2em] text-hanji-dim">
                자동 목탁 (ASMR)
              </span>
              <button
                role="switch"
                aria-checked={auto}
                onClick={() => setAuto((v) => !v)}
                className={`relative h-[26px] w-[46px] rounded-full border transition-colors ${
                  auto
                    ? "border-gold bg-gold"
                    : "border-hanji-faint bg-transparent"
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
          {/* 염주 — 쓸어 넘기는 꿰미 */}
          <div className="rise rise-d2 mt-8 flex flex-col items-center">
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative touch-none select-none overflow-hidden"
              style={{
                height: WINDOW_H,
                width: 200,
                cursor: "grab",
                // 위아래를 배경으로 녹인다 — 상자 티가 나지 않게
                maskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              }}
              aria-label="염주 넘기기 — 위로 쓸거나 톡 누르면 한 알"
            >
              {/* 실 */}
              <span
                aria-hidden
                className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-[#3a2c1a] to-transparent"
              />
              {/* 꿰미 */}
              <div
                className="absolute left-0 w-full"
                style={{
                  transform: `translateY(${WINDOW_H / 2 - pos * BEAD_H - BEAD_H / 2}px)`,
                  transition: noAnim ? "none" : "transform 0.16s ease-out",
                }}
              >
                {Array.from({ length: BEADS }, (_, i) => {
                  const d = Math.abs(i - pos);
                  if (d > 4 && BEADS - d > 4) {
                    // 창밖의 알은 자리만 지킨다
                    return (
                      <div key={i} style={{ height: BEAD_H }} aria-hidden />
                    );
                  }
                  const near = Math.min(d, BEADS - d);
                  const scale = 1 - near * 0.13;
                  const dim = 1 - near * 0.22;
                  const mother = i === 0; // 모주(母珠) — 한 바퀴의 표지
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-center"
                      style={{ height: BEAD_H }}
                      aria-hidden
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: mother ? 52 : 42,
                          height: mother ? 52 : 42,
                          transform: `scale(${scale})`,
                          opacity: dim,
                          background: mother
                            ? "radial-gradient(circle at 35% 28%, #e4c37c, #a97b3a 45%, #6a4a1e 80%, #4a3212)"
                            : "radial-gradient(circle at 35% 28%, #9c6b3e, #6b4526 50%, #43290f 85%, #2c1a08)",
                          boxShadow: mother
                            ? "0 6px 14px rgba(0,0,0,0.5), inset 0 -4px 8px rgba(0,0,0,0.35)"
                            : "0 5px 12px rgba(0,0,0,0.45), inset 0 -4px 8px rgba(0,0,0,0.35)",
                          transition: "transform 0.16s, opacity 0.16s",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-4 text-[13px] tracking-[0.2em] text-hanji-dim">
              <span className="text-gold-soft">{pos === 0 && total > 0 ? BEADS : pos}</span>
              <span className="text-hanji-faint"> / {BEADS}</span>
              {rounds > 0 && (
                <span className="ml-3 text-[11.5px] text-hanji-faint">
                  {rounds}주(周) 회향
                </span>
              )}
            </p>
            <p className="mt-2 break-keep text-center text-[11.5px] leading-5 text-hanji-faint">
              위로 쓸어 넘기거나, 톡 누르면 한 알씩 넘어갑니다.
            </p>
            {total > 0 && (
              <button
                onClick={() => {
                  setNoAnim(true);
                  setTotal(0);
                  window.setTimeout(() => setNoAnim(false), 60);
                }}
                className="mt-4 rounded-[10px] border border-ink-3 px-4 py-2 text-[11.5px] tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                처음으로
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
