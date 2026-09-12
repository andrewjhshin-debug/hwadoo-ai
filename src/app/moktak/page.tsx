"use client";

// ─────────────────────────────────────────────────────────────
// 목탁과 염주 — 손끝의 수행 (ASMR).
// · 목탁: 누르면 울린다. 소리는 Web Audio 로 그 자리에서 빚는다
//   (몸통 울림 + 타격 '딱' + 나무 결 노이즈). 칠 때마다 목탁채가 움직인다.
// · 염주: 정면에서 본 108염주 — 동그란 고리가 누를 때마다 왼쪽으로
//   한 알씩 돈다. 고리에는 36알(한 바퀴 = 36, 세 바퀴 = 백팔).
//   금빛 모주(母珠)가 표지. 알마다 딸깍, 108알을 넘기면 일주(一周) 회향.
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

// 염주 한 알 — 알끼리 부딪는 또렷한 딸깍 (묵직한 속살 한 점 포함)
function clickBead(vol: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = vol * 1.15;
  out.connect(ac.destination);

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.8, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t);

  const o = ac.createOscillator();
  o.type = "sine";
  const f = 1700 + Math.random() * 200;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.78, t + 0.035);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.32, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g2);
  g2.connect(out);
  o.start(t);
  o.stop(t + 0.08);

  // 알의 속살 — 낮은 나무 울림 아주 짧게 (소리에 무게를 준다)
  const o3 = ac.createOscillator();
  o3.type = "sine";
  o3.frequency.setValueAtTime(420 + Math.random() * 40, t);
  const g3 = ac.createGain();
  g3.gain.setValueAtTime(0.0001, t);
  g3.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
  g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o3.connect(g3);
  g3.connect(out);
  o3.start(t);
  o3.stop(t + 0.08);
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
const RING = 36; // 고리에 보이는 알 수 — 세 바퀴가 곧 백팔
const STEP = 360 / RING; // 한 알에 도는 각도
const R = 118; // 고리 반지름(px)
const BOX = 316; // 고리 상자 한 변

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

  // 염주 — total 이 늘수록 윗알이 왼쪽으로 넘어간다 (반시계 회전)
  const [total, setTotal] = useState(0);
  const pos = total % BEADS;
  const rounds = Math.floor(total / BEADS);
  const angle = -total * STEP; // 고리의 누적 회전각
  const dragX = useRef<number | null>(null);
  const dragAcc = useRef(0);

  const advance = () => {
    clickBead(vol);
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
    if (dragAcc.current < 0) dragAcc.current = 0; // 오른쪽으로는 되돌리지 않는다
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragX.current !== null && Math.abs(dragAcc.current) < 8) advance(); // 톡 — 한 알
    dragX.current = null;
    dragAcc.current = 0;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-8 md:pt-12">
      <style>{`
        @keyframes moktak-hit {
          0% { transform: scale(1); filter: brightness(1); }
          18% { transform: scale(0.96) translateY(2px); filter: brightness(1.28); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes moktak-ripple {
          0% { transform: scale(0.72); opacity: 0.5; }
          100% { transform: scale(1.65); opacity: 0; }
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
                className="pointer-events-none absolute inset-4 rounded-full border border-gold/40"
                style={{
                  animation:
                    hits > 0 ? "moktak-ripple 0.6s ease-out forwards" : "none",
                }}
              />
              <span
                key={`m${hits}`}
                className="block"
                style={{
                  animation: hits > 0 ? "moktak-hit 0.16s ease-out" : "none",
                }}
              >
                {/* 목탁 — 옆에 고리 손잡이가 달린 실물의 실루엣.
                    옻칠한 나무의 넓고 부드러운 광, 가늘게 다문 입. */}
                <svg
                  viewBox="0 0 280 210"
                  className="h-[220px] w-[293px]"
                  aria-hidden
                >
                  <defs>
                    <radialGradient id="wood" cx="34%" cy="26%" r="85%">
                      <stop offset="0%" stopColor="#a97847" />
                      <stop offset="38%" stopColor="#7c4f24" />
                      <stop offset="72%" stopColor="#4b2d13" />
                      <stop offset="100%" stopColor="#291709" />
                    </radialGradient>
                    <linearGradient id="under" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="52%" stopColor="rgba(0,0,0,0)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
                    </linearGradient>
                    <radialGradient id="sheen" cx="36%" cy="22%" r="46%">
                      <stop offset="0%" stopColor="rgba(255,236,206,0.3)" />
                      <stop offset="100%" stopColor="rgba(255,236,206,0)" />
                    </radialGradient>
                    <radialGradient id="ground" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </radialGradient>
                  </defs>

                  {/* 바닥 그림자 */}
                  <ellipse cx="140" cy="192" rx="112" ry="12" fill="url(#ground)" />

                  {/* 고리 손잡이 — 몸통 오른쪽에 붙어 한 몸으로 */}
                  <path
                    fillRule="evenodd"
                    d="M202 56 A44 44 0 1 1 201.9 56 Z M202 80 A20 20 0 1 0 202.1 80 Z"
                    fill="url(#wood)"
                  />
                  <path
                    fillRule="evenodd"
                    d="M202 56 A44 44 0 1 1 201.9 56 Z M202 80 A20 20 0 1 0 202.1 80 Z"
                    fill="url(#under)"
                  />

                  {/* 몸통 — 매끈한 배 모양 */}
                  <path
                    d="M118 20 C172 20 200 58 200 100 C200 144 168 180 118 180 C68 180 36 144 36 100 C36 58 64 20 118 20 Z"
                    fill="url(#wood)"
                  />
                  <path
                    d="M118 20 C172 20 200 58 200 100 C200 144 168 180 118 180 C68 180 36 144 36 100 C36 58 64 20 118 20 Z"
                    fill="url(#under)"
                  />

                  {/* 입 — 가늘고 낮게 다문 소리 틈, 양 끝의 작은 구멍 */}
                  <path
                    d="M58 136 C92 144 144 144 178 136 C144 153 92 153 58 136 Z"
                    fill="#160c05"
                  />
                  <circle cx="58" cy="136.5" r="3.5" fill="#160c05" />
                  <circle cx="178" cy="136.5" r="3.5" fill="#160c05" />
                  <path
                    d="M61 136.5 C93 143 143 143 175 136.5"
                    fill="none"
                    stroke="rgba(217,180,91,0.14)"
                    strokeWidth="1.2"
                  />

                  {/* 옻칠의 광 — 넓고 부드럽게 */}
                  <ellipse cx="92" cy="58" rx="52" ry="32" fill="url(#sheen)" />
                  <ellipse
                    cx="74"
                    cy="46"
                    rx="16"
                    ry="9"
                    fill="rgba(255,240,215,0.22)"
                    transform="rotate(-18 74 46)"
                  />
                </svg>
              </span>
            </button>
            <p className="mt-4 text-[12px] tracking-[0.25em] text-hanji-faint">
              {hits === 0
                ? "목탁을 눌러 보십시오"
                : `${hits.toLocaleString("ko-KR")} 번 울렸습니다`}
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
          {/* 염주 — 정면에서 본 동그란 고리. 누르면 왼쪽으로 한 알 돈다 */}
          <div className="rise rise-d2 mt-8 flex flex-col items-center">
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative touch-none select-none"
              style={{ width: BOX, height: BOX, cursor: "grab" }}
              aria-label="염주 굴리기 — 왼쪽으로 쓸거나 톡 누르면 한 알"
            >
              {/* 실 — 알 뒤로 둥글게, 아래쪽은 어둠에 잠긴다 */}
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
              {/* 고리 — total 에 따라 시계 방향(아랫알이 왼쪽으로) */}
              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transition: "transform 0.16s ease-out",
                }}
              >
                {Array.from({ length: RING }, (_, k) => {
                  const mother = k === 0; // 모주 — 금빛 표지
                  // 지금 화면 기준 이 알의 각도(0=위, 180=아래)
                  const eff = (((k * STEP + angle) % 360) + 360) % 360;
                  const fromTop = Math.min(eff, 360 - eff);
                  const nearTop = Math.max(0, 1 - fromTop / 46);
                  // 위 반원만 진하게 — 양끝은 희미해지고, 아래는 아예 사라진다
                  const vis = Math.max(0, 1 - fromTop / 110);
                  const size = (mother ? 34 : 26) * (1 + nearTop * 0.32);
                  return (
                    <span
                      key={k}
                      aria-hidden
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `rotate(${k * STEP}deg) translateY(${-R}px)`,
                      }}
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: size,
                          height: size,
                          marginLeft: -size / 2,
                          marginTop: -size / 2,
                          // 알의 광원은 늘 왼쪽 위 — 고리 회전을 되돌린다
                          transform: `rotate(${-(k * STEP + angle)}deg)`,
                          transition:
                            "transform 0.16s ease-out, width 0.16s, height 0.16s, margin 0.16s",
                          // 자단(紫檀) 결 — 깊고 차분한 나무빛
                          background: mother
                            ? "radial-gradient(circle at 35% 28%, #cfa757, #8a662a 45%, #57411a 80%, #362a10)"
                            : "radial-gradient(circle at 35% 28%, #8a5c34, #573620 50%, #33200f 85%, #1d1108)",
                          boxShadow:
                            "0 4px 9px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.4)",
                          opacity: vis,
                        }}
                      />
                    </span>
                  );
                })}
              </div>
              {/* 위 표지 — 지금 넘기는 자리 */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 text-gold-soft"
                style={{ top: 2, fontSize: 11, letterSpacing: "0.2em" }}
              >
                ▼
              </span>
              {/* 가운데 — 셈 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[26px] font-light tracking-wide text-hanji">
                  <span className="text-gold-soft">
                    {pos === 0 && total > 0 ? BEADS : pos}
                  </span>
                  <span className="text-[15px] text-hanji-faint"> / {BEADS}</span>
                </p>
                {rounds > 0 && (
                  <p className="mt-1 text-[11.5px] tracking-[0.2em] text-hanji-faint">
                    {rounds}주(周) 회향
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 break-keep text-center text-[11.5px] leading-5 text-hanji-faint">
              왼쪽으로 쓸어 굴리거나, 톡 누르면 한 알씩 넘어갑니다.
            </p>
            {total > 0 && (
              <button
                onClick={() => setTotal(0)}
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
