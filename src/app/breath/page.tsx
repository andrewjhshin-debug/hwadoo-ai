"use client";

// ────────────────────────────────────────────────────────────────
// 호흡 명상 — 들숨 4초에 원이 부드럽게 커지며 금빛이 번지고,
// 날숨 6초에 다시 작아진다. 아주 단순한 애니메이션 하나.
// 애니메이션은 CSS keyframes 하나(10초 주기)가 맡고, JS 는
// 시작·마침과 문구 전환만 거든다 — 문구는 setInterval 누적이 아니라
// 시작 시각으로부터의 경과로 계산해, 원의 움직임과 어긋나지 않는다.
// 길이 선택은 없다 — 스스로 마칠 때까지. 소리도 없다.
// 마치면 10초 = 1식(息)으로 세어 "N번의 숨"을 알려 준다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

const INHALE_MS = 4000; // 들숨 4초
const CYCLE_MS = 10000; // 들숨 4초 + 날숨 6초 = 1식

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
  const startRef = useRef(0);

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
  };

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {/* 클라이언트 페이지라 metadata 는 못 내보낸다 — 만다라와 같은 관례 */}
      <style>{BREATH_CSS}</style>

      <p className="rise text-[11px] tracking-[0.5em] text-gold-soft">
        息 · 호흡 명상
      </p>
      <h1 className="rise rise-d1 mt-5 break-keep font-serif text-xl font-light leading-9 text-hanji">
        숨이 돌아오는 자리
      </h1>
      <p className="rise rise-d1 mt-3 break-keep text-[12.5px] leading-6 text-hanji-dim">
        날숨을 들숨보다 길게 — 몸이 스스로 가라앉습니다.
      </p>

      {/* 원은 transform 으로만 커지므로 자리(224px)는 흔들리지 않는다 */}
      <div className="rise rise-d2 relative mt-10 flex h-56 w-56 items-center justify-center">
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
          <p className="mt-5 break-keep text-[13px] leading-6 text-hanji-dim">
            준비되면, 앉은 그대로 시작합니다.
          </p>
          <button
            type="button"
            onClick={begin}
            className="mt-7 border border-gold/40 px-8 py-2.5 text-xs tracking-[0.3em] text-gold-soft transition-colors hover:border-gold/70 hover:text-gold"
          >
            숨을 고르다
          </button>
        </div>
      )}

      {stage === "breathing" && (
        <div className="flex flex-col items-center">
          <p aria-live="polite" className="mt-5 break-keep text-[13px] leading-6 text-hanji-dim">
            {phase === "in"
              ? "넷을 세며 천천히 들이쉽니다"
              : "여섯을 세며 길게 내쉽니다"}
          </p>
          <p className="mt-2 text-xs tabular-nums tracking-[0.25em] text-hanji-faint">
            {clock}
          </p>
          <button
            type="button"
            onClick={finish}
            className="mt-7 border border-ink-3 px-8 py-2.5 text-xs tracking-[0.3em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            마치다
          </button>
        </div>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-center">
          <p className="mt-5 break-keep font-serif text-[15px] leading-7 text-hanji">
            {breaths}번의 숨을 쉬었습니다
          </p>
          <button
            type="button"
            onClick={begin}
            className="mt-7 border border-gold/40 px-8 py-2.5 text-xs tracking-[0.3em] text-gold-soft transition-colors hover:border-gold/70 hover:text-gold"
          >
            다시 시작
          </button>
        </div>
      )}
    </div>
  );
}
