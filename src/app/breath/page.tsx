"use client";

// ────────────────────────────────────────────────────────────────
// 호흡 명상 — 들숨 4초에 원이 부드럽게 커지며 금빛이 번지고,
// 날숨 6초에 다시 작아진다. 아주 단순한 애니메이션 하나.
// 애니메이션은 CSS keyframes 하나(10초 주기)가 맡고, JS 는
// 시작·마침과 문구 전환만 거든다 — 문구는 setInterval 누적이 아니라
// 시작 시각으로부터의 경과로 계산해, 원의 움직임과 어긋나지 않는다.
// 길이 선택은 없다 — 스스로 마칠 때까지.
// 음향: 마디가 바뀔 때 경쇠 한 음만 — 높은 음이 들숨, 낮은 음이 날숨.
// (에셋 없이 Web Audio 로 합성 · 끄기 단추 있음) 마치면 10초 = 1식(息).
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

const INHALE_MS = 4000; // 들숨 4초
const CYCLE_MS = 10000; // 들숨 4초 + 날숨 6초 = 1식

// 숨마다 돌아가며 건네는 알아차림의 말
const GUIDES = [
  "호흡을 알아차리십시오",
  "가슴이 오르내리는 것을 느껴 보십시오",
  "생각이 지나가면, 다시 숨으로 돌아옵니다",
  "지금 이 숨이 전부입니다",
];

// 원의 숨 — 낮 모드는 석간주 계열로 빛깔만 바꾼다.
// 줄여 달라는 설정(prefers-reduced-motion)이면 커지는 폭만 줄이고 리듬은 남긴다.
const BREATH_CSS = `
.breath-circle {
  --breath-max: 1.6;
  --breath-line: rgba(217, 180, 91, 0.45);
  --breath-core: rgba(217, 180, 91, 0.14);
  --breath-glow-dim: rgba(217, 180, 91, 0.1);
  --breath-glow-bright: rgba(217, 180, 91, 0.3);
  width: 128px;
  height: 128px;
  border-radius: 9999px;
  border: 1px solid var(--breath-line);
  background: radial-gradient(circle at 50% 42%, var(--breath-core), transparent 74%);
  box-shadow: 0 0 26px var(--breath-glow-dim);
}
html[data-theme="light"] .breath-circle {
  --breath-line: rgba(138, 35, 24, 0.5);
  --breath-core: rgba(138, 35, 24, 0.09);
  --breath-glow-dim: rgba(138, 35, 24, 0.08);
  --breath-glow-bright: rgba(138, 35, 24, 0.24);
}
.breath-anim {
  animation: breath-cycle ${CYCLE_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes breath-cycle {
  0% {
    transform: scale(1);
    box-shadow: 0 0 26px var(--breath-glow-dim);
  }
  40% {
    transform: scale(var(--breath-max));
    box-shadow: 0 0 70px var(--breath-glow-bright);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 26px var(--breath-glow-dim);
  }
}
@media (prefers-reduced-motion: reduce) {
  .breath-circle {
    --breath-max: 1.12;
  }
}
`;

type Stage = "ready" | "breathing" | "done";

export default function BreathPage() {
  const [stage, setStage] = useState<Stage>("ready");
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [seconds, setSeconds] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const startRef = useRef(0);

  // ── 음향 — 경쇠 한 음만 (파일 없이 합성) ──────────────────────
  const audioRef = useRef<AudioContext | null>(null);

  const ensureAudio = (): AudioContext | null => {
    try {
      if (!audioRef.current) {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return null;
        audioRef.current = new Ctx();
      }
      const ctx = audioRef.current;
      void ctx.resume();
      return ctx;
    } catch {
      return null; // 소리가 안 나와도 명상은 흐른다
    }
  };

  // 마디가 바뀌는 순간의 경쇠 — 눈을 감고도 전환을 놓치지 않게.
  // 들숨은 높은 한 음(맑게), 날숨은 낮은 한 음(무겁게, 여운 길게).
  const playCue = (ctx: AudioContext, kind: "in" | "out", t: number) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = "sine";
    osc2.type = "sine";
    const f = kind === "in" ? 660 : 330; // 들숨 높이, 날숨 낮이
    osc.frequency.value = f;
    osc2.frequency.value = f * 2.01; // 살짝 어긋난 배음 — 경쇠의 울림
    const gain = ctx.createGain();
    const peak = kind === "in" ? 0.16 : 0.14;
    const tail = kind === "in" ? 1.1 : 1.8;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + tail);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    osc.connect(gain);
    osc2.connect(g2);
    g2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + tail + 0.1);
    osc2.stop(t + tail + 0.1);
  };

  // 마디 소리 — 경쇠 한 음이면 충분하다 (숨결 소리는 걷어냈다)
  const playBreath = (kind: "in" | "out") => {
    const ctx = ensureAudio();
    if (!ctx) return;
    playCue(ctx, kind, ctx.currentTime);
  };

  // 숨의 마디가 바뀔 때마다 소리 한 번 — 들숨/날숨이 각자의 결을 낸다
  useEffect(() => {
    if (stage !== "breathing" || !soundOn) return;
    playBreath(phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage, soundOn]);

  // 문구·경과 시간 — 시작 시각으로부터 계산 (같은 값이면 React 가 그리지 않는다)
  useEffect(() => {
    if (stage !== "breathing") return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      setPhase(elapsed % CYCLE_MS < INHALE_MS ? "in" : "out");
      setSeconds(Math.floor(elapsed / 1000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const begin = () => {
    ensureAudio(); // 사용자 손길이 있을 때 오디오 문을 연다 (iOS 규칙)
    startRef.current = performance.now();
    setPhase("in");
    setSeconds(0);
    setStage("breathing");
  };

  const finish = () => {
    const elapsed = performance.now() - startRef.current;
    // 10초 = 1식. 한 호흡을 채 못 채웠어도, 앉았던 숨 하나는 쳐 준다.
    setBreaths(Math.max(1, Math.floor(elapsed / CYCLE_MS)));
    setStage("done");
    void audioRef.current?.suspend(); // 소리도 함께 내려놓는다
  };

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-4 text-center">
      {/* 클라이언트 페이지라 metadata 는 못 내보낸다 — 만다라와 같은 관례 */}
      <style>{BREATH_CSS}</style>

      <p className="rise text-[11px] tracking-[0.5em] text-gold-soft">
        息 · 호흡 명상
      </p>
      <h1 className="rise rise-d1 mt-3 break-keep font-serif text-xl font-light leading-8 text-hanji">
        숨이 돌아오는 자리
      </h1>
      <p className="rise rise-d1 mt-1.5 break-keep text-[12.5px] leading-6 text-hanji-dim">
        날숨을 들숨보다 길게 — 몸이 스스로 가라앉습니다.
      </p>

      {/* 원은 transform 으로만 커지므로 자리는 흔들리지 않는다 */}
      <div className="rise rise-d2 relative mt-4 flex h-52 w-52 items-center justify-center">
        <div
          aria-hidden
          className={`breath-circle ${stage === "breathing" ? "breath-anim" : ""}`}
        />
        <p className="absolute font-serif text-lg font-light text-hanji">
          {stage === "breathing" ? (phase === "in" ? "들숨" : "날숨") : "息"}
        </p>
      </div>

      {stage === "ready" && (
        <div className="rise rise-d3 flex flex-col items-center">
          <p className="mt-3 break-keep text-[13.5px] leading-7 text-hanji-dim">
            시작하면 <span className="text-hanji">눈을 감으십시오</span> —
            그래야 더 알아차릴 수 있습니다.
            <br />
            높은 경쇠가 울리면 들숨, 낮은 경쇠가 울리면 날숨입니다.
          </p>
          <button
            type="button"
            onClick={begin}
            className="mt-4 border border-gold/40 px-8 py-2.5 text-xs tracking-[0.3em] text-gold-soft transition-colors hover:border-gold/70 hover:text-gold"
          >
            숨을 고르다
          </button>
        </div>
      )}

      {stage === "breathing" && (
        <div className="flex flex-col items-center">
          <p aria-live="polite" className="mt-3 break-keep text-[13px] leading-6 text-hanji-dim">
            {phase === "in"
              ? "넷을 세며 천천히 들이쉽니다"
              : "여섯을 세며 길게 내쉽니다"}
          </p>
          {/* 알아차림의 말 — 숨마다 돌아가며 하나씩 */}
          <p className="mt-1.5 break-keep text-[12.5px] tracking-wide text-gold-soft/90">
            {GUIDES[Math.floor(seconds / (CYCLE_MS / 1000)) % GUIDES.length]}
          </p>
          <p className="mt-1.5 text-xs tabular-nums tracking-[0.25em] text-hanji-faint">
            {clock}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={finish}
              className="border border-ink-3 px-8 py-2.5 text-xs tracking-[0.3em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              마치다
            </button>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              aria-pressed={soundOn}
              className="text-[11px] tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              {soundOn ? "음향 끄기" : "음향 켜기"}
            </button>
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-center">
          <p className="mt-3 break-keep font-serif text-[15px] leading-7 text-hanji">
            {breaths}번의 숨을 쉬었습니다
          </p>
          <button
            type="button"
            onClick={begin}
            className="mt-4 border border-gold/40 px-8 py-2.5 text-xs tracking-[0.3em] text-gold-soft transition-colors hover:border-gold/70 hover:text-gold"
          >
            다시 시작
          </button>
        </div>
      )}
    </div>
  );
}
