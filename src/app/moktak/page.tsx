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

  // 염주 — total 이 늘수록 고리가 왼쪽(시계 방향)으로 돈다
  const [total, setTotal] = useState(0);
  const pos = total % BEADS;
  const rounds = Math.floor(total / BEADS);
  const angle = total * STEP; // 고리의 누적 회전각
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
        @keyframes stick-swing {
          0% { transform: rotate(16deg); }
          28% { transform: rotate(-22deg); }
          100% { transform: rotate(16deg); }
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
              {/* 목탁채 — 칠 때마다 손목이 꺾인다 */}
              <span
                key={`s${hits}`}
                aria-hidden
                className="pointer-events-none absolute -right-11 top-[26%] origin-bottom-right"
                style={{
                  animation: hits > 0 ? "stick-swing 0.2s ease-out" : "none",
                  transform: "rotate(16deg)",
                }}
              >
                <svg viewBox="0 0 96 40" className="h-[44px] w-[106px]" aria-hidden>
                  <defs>
                    <linearGradient id="stickw" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6d4a24" />
                      <stop offset="100%" stopColor="#3c2812" />
                    </linearGradient>
                    <radialGradient id="stickb" cx="35%" cy="30%" r="75%">
                      <stop offset="0%" stopColor="#9a6c3c" />
                      <stop offset="60%" stopColor="#5f3f1e" />
                      <stop offset="100%" stopColor="#3a2510" />
                    </radialGradient>
                  </defs>
                  <rect x="24" y="16" width="70" height="8" rx="4" fill="url(#stickw)" />
                  <circle cx="17" cy="20" r="15" fill="url(#stickb)" />
                  <ellipse cx="12" cy="14" rx="6" ry="4" fill="rgba(255,230,190,0.35)" />
                </svg>
              </span>
              <span
                key={`m${hits}`}
                className="block"
                style={{
                  animation: hits > 0 ? "moktak-hit 0.16s ease-out" : "none",
                }}
              >
                {/* 목탁 몸통 — 빛·그림자·나뭇결로 입체감 */}
                <svg
                  viewBox="0 0 220 214"
                  className="h-[236px] w-[242px]"
                  aria-hidden
                >
                  <defs>
                    <radialGradient id="wood" cx="30%" cy="24%" r="85%">
                      <stop offset="0%" stopColor="#c08c50" />
                      <stop offset="35%" stopColor="#8d5f2c" />
                      <stop offset="70%" stopColor="#5c3c1b" />
                      <stop offset="100%" stopColor="#33200e" />
                    </radialGradient>
                    <linearGradient id="under" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
                    </linearGradient>
                    <linearGradient id="slit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#241409" />
                      <stop offset="100%" stopColor="#070402" />
                    </linearGradient>
                    <radialGradient id="sheen" cx="32%" cy="20%" r="38%">
                      <stop offset="0%" stopColor="rgba(255,238,205,0.38)" />
                      <stop offset="100%" stopColor="rgba(255,238,205,0)" />
                    </radialGradient>
                    <radialGradient id="ground" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.55)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </radialGradient>
                  </defs>

                  {/* 바닥 그림자 — 떠 있지 않고 놓여 있다 */}
                  <ellipse cx="110" cy="200" rx="84" ry="13" fill="url(#ground)" />

                  {/* 물고기 꼬리 손잡이 — 몸통 아래 */}
                  <path
                    d="M96 176 L84 202 C94 197 126 197 136 202 L124 176 Z"
                    fill="#452c13"
                  />
                  <path
                    d="M96 176 L84 202 C89 200 98 198 106 198 L104 176 Z"
                    fill="rgba(255,220,170,0.12)"
                  />

                  {/* 몸통 */}
                  <path
                    d="M110 14 C167 14 198 57 198 104 C198 152 160 182 110 182 C60 182 22 152 22 104 C22 57 53 14 110 14 Z"
                    fill="url(#wood)"
                  />
                  {/* 아래쪽 어둠 — 구(球)의 무게 */}
                  <path
                    d="M110 14 C167 14 198 57 198 104 C198 152 160 182 110 182 C60 182 22 152 22 104 C22 57 53 14 110 14 Z"
                    fill="url(#under)"
                  />
                  {/* 나뭇결 — 아주 희미한 동심 곡선 */}
                  <path
                    d="M48 62 C76 44 144 44 172 62"
                    fill="none"
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M40 84 C74 62 146 62 180 84"
                    fill="none"
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth="2"
                  />
                  {/* 물고기 입 — 벌어진 소리 틈 */}
                  <path
                    d="M34 124 C62 152 158 152 186 124 C168 170 132 182 110 182 C88 182 52 170 34 124 Z"
                    fill="url(#slit)"
                  />
                  {/* 틈 안쪽 깊이 — 한 겹 더 어두운 속 */}
                  <path
                    d="M52 138 C80 156 140 156 168 138 C150 168 122 176 110 176 C98 176 70 168 52 138 Z"
                    fill="rgba(0,0,0,0.55)"
                  />
                  {/* 틈 가장자리 빛 */}
                  <path
                    d="M36 123 C64 149 156 149 184 123"
                    fill="none"
                    stroke="rgba(217,180,91,0.35)"
                    strokeWidth="2.5"
                  />
                  {/* 왼쪽 위 림 라이트 — 광원의 방향, 은은하게 */}
                  <path
                    d="M42 42 C58 24 84 15 108 15"
                    fill="none"
                    stroke="rgba(255,235,200,0.14)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* 광 */}
                  <ellipse cx="78" cy="52" rx="44" ry="28" fill="url(#sheen)" />
                  {/* 손잡이 꼭지 */}
                  <path d="M100 8 C100 2 120 2 120 8 L117 18 L103 18 Z" fill="#5c3c1b" />
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
              {/* 실 — 알 뒤로 둥글게 */}
              <span
                aria-hidden
                className="absolute rounded-full border-2 border-[#3a2c1a]"
                style={{
                  left: BOX / 2 - R,
                  top: BOX / 2 - R,
                  width: R * 2,
                  height: R * 2,
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
                  const fromBottom = Math.min(
                    Math.abs(eff - 180),
                    360 - Math.abs(eff - 180)
                  );
                  const nearBottom = Math.max(0, 1 - fromBottom / 46);
                  const size = (mother ? 34 : 26) * (1 + nearBottom * 0.32);
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
                          background: mother
                            ? "radial-gradient(circle at 35% 28%, #ecca82, #b58440 45%, #74521f 80%, #4c3413)"
                            : "radial-gradient(circle at 35% 28%, #a06e40, #6f4827 50%, #452a10 85%, #2b1a08)",
                          boxShadow:
                            "0 4px 9px rgba(0,0,0,0.45), inset 0 -3px 6px rgba(0,0,0,0.35)",
                          opacity: 0.78 + nearBottom * 0.22,
                        }}
                      />
                    </span>
                  );
                })}
              </div>
              {/* 아래 표지 — 지금 넘기는 자리 */}
              <span
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 text-gold-soft"
                style={{ bottom: 6, fontSize: 11, letterSpacing: "0.2em" }}
              >
                ▲
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
