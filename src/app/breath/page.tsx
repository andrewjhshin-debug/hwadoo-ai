"use client";

// ────────────────────────────────────────────────────────────────
// 호흡 명상 — 들숨 4초에 원이 부드럽게 커지고, 날숨 6초에 다시 작아진다.
// 애니메이션은 CSS keyframes 하나(10초 주기)가 맡고, JS 는 시작·마침과
// 문구 전환만 거든다 — 문구는 setInterval 누적이 아니라 시작 시각으로부터의
// 경과로 계산해, 원의 움직임과 어긋나지 않는다.
// 길이 선택은 없다 — 스스로 마칠 때까지. 10초 = 1식(息).
// 음향: 마디가 바뀔 때 경쇠 한 음만 — 높은 음이 들숨, 낮은 음이 날숨.
// (에셋 없이 Web Audio 로 합성 · 끄기 단추 있음)
//
// 화면을 다시 짠 까닭 —
// 여기는 읽는 자리가 아니라 앉는 자리다. 눈을 감기 직전에 보는 것이
// 설명문이면 몸에 남는 게 없다. 그래서 안내는 한 문장도 버리지 않고
// <details> 안으로 접었고, 한가운데에는 큰 숫자 하나만 남겼다.
// 그 숫자 하나가 판마다 뜻을 바꾼다 —
//   시작 전: 오늘 몇 판 · 숨 쉬는 중: 지금까지 몇 식 · 마친 뒤: 이번에 쉰 숨.
// 오늘치는 하루 장부(daily)에서 읽는다 — 어제 앉은 것이 오늘로 넘어오지 않게.
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { recordMeditation } from "@/lib/meditation";
import { loadDaily } from "@/lib/daily";
import { MERIT_VALUE } from "@/lib/merit";

const INHALE_MS = 4000; // 들숨 4초
const CYCLE_MS = 10000; // 들숨 4초 + 날숨 6초 = 1식
const SEC_PER_BREATH = CYCLE_MS / 1000;

// 진행 고리 — 원이 가장 크게 부풀었을 때(128 × 1.6 ≈ 205) 고리에 닿도록 잡았다
const RING_R = 104;
const RING_BOX = 224;
const RING_C = (2 * Math.PI * RING_R).toFixed(2);

// 숨마다 돌아가며 건네는 알아차림의 말
const GUIDES = [
  "호흡을 알아차려 보세요",
  "가슴이 오르내리는 것을 느껴 보세요",
  "생각이 지나가면, 다시 숨으로 돌아옵니다",
  "지금 이 숨이 전부입니다",
];

// 원의 숨 — 빛깔은 금 토큰(--color-gold)에서 뽑는다.
// 낮·밤이 토큰에서 이미 갈리므로 여기서 모드별로 색을 따로 적을 필요가 없다.
// 줄여 달라는 설정(prefers-reduced-motion)이면 커지는 폭만 줄이고 리듬은 남긴다.
const BREATH_CSS = `
.breath-circle {
  --breath-max: 1.6;
  --breath-line: color-mix(in srgb, var(--color-gold) 45%, transparent);
  --breath-core: color-mix(in srgb, var(--color-gold) 14%, transparent);
  --breath-glow-dim: color-mix(in srgb, var(--color-gold) 10%, transparent);
  --breath-glow-bright: color-mix(in srgb, var(--color-gold) 30%, transparent);
  width: 128px;
  height: 128px;
  border-radius: 9999px;
  border: 1px solid var(--breath-line);
  background: radial-gradient(circle at 50% 42%, var(--breath-core), transparent 74%);
  box-shadow: 0 0 26px var(--breath-glow-dim);
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
/* 진행 고리 — 들숨에 차오르고 날숨에 빠진다.
   원과 똑같은 10초 곡선을 쓰므로 둘이 어긋나 보이는 일이 없다. */
.breath-ring {
  stroke-dasharray: ${RING_C};
  stroke-dashoffset: ${RING_C};
  animation: breath-ring ${CYCLE_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes breath-ring {
  0% {
    stroke-dashoffset: ${RING_C};
  }
  40% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: ${RING_C};
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
  const [today, setToday] = useState(0); // 오늘 몇 판
  const startRef = useRef(0);

  // 오늘치는 브라우저 서랍에만 있다 — 서버가 그린 화면과 어긋나지 않게
  // 첫 그림 뒤에 읽는다.
  useEffect(() => {
    setToday(loadDaily().by.breath ?? 0);
  }, []);

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
    recordMeditation(); // 이달의 마음이 이 걸음을 세도록
    // 공덕이 하루 장부에 적힌 뒤라야 오늘치가 맞다 — 그래서 여기서 다시 읽는다
    setToday(loadDaily().by.breath ?? 0);
  };

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  // 한가운데의 숫자 하나 — 판마다 뜻이 갈린다
  const hero =
    stage === "breathing"
      ? {
          cap: phase === "in" ? "들숨" : "날숨",
          n: Math.floor(seconds / SEC_PER_BREATH),
          unit: "식",
        }
      : stage === "done"
        ? { cap: "이번에", n: breaths, unit: "숨" }
        : { cap: "오늘", n: today, unit: "판" };

  // 세 자리가 넘어가면 글자를 낮춘다 — 원 밖으로 삐져나가지 않게
  const heroSize =
    String(hero.n).length >= 3 ? "text-[52px]" : "text-[68px]";

  // 음향 단추 — 글자 대신 그림 하나로. 이름은 aria-label 이 지킨다
  const soundButton = (
    <button
      type="button"
      onClick={() => setSoundOn((v) => !v)}
      aria-pressed={soundOn}
      aria-label={soundOn ? "음향 끄기" : "음향 켜기"}
      title={soundOn ? "음향 끄기" : "음향 켜기"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-3 text-hanji-faint transition-colors hover:text-hanji"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.4h3.3L12 5.4v13.2l-4.7-4H4z" />
        {soundOn ? (
          <>
            <path d="M15.7 9.3a3.9 3.9 0 0 1 0 5.4" />
            <path d="M18.2 6.8a7.4 7.4 0 0 1 0 10.4" />
          </>
        ) : (
          <path d="M16.2 9.6l4.4 4.8m0-4.8l-4.4 4.8" />
        )}
      </svg>
    </button>
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-4 text-center">
      {/* 클라이언트 페이지라 metadata 는 못 내보낸다 — 만다라와 같은 관례 */}
      <style>{BREATH_CSS}</style>

      {/* 머리는 두 겹까지 — 한자 한 줄과 제목 한 줄.
          나머지 안내는 아래 접힌 자리에 그대로 들어 있다 */}
      <p className="rise text-[11px] tracking-[0.5em] text-gold-soft">
        息 · 호흡
      </p>
      <h1 className="rise rise-d1 mt-2 break-keep font-serif text-lg font-light text-hanji">
        숨이 돌아오는 자리
      </h1>

      {/* 원은 transform 으로만 커지므로 자리는 흔들리지 않는다 */}
      <div
        className="rise rise-d2 relative mt-4 flex items-center justify-center"
        style={{ width: RING_BOX, height: RING_BOX }}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
          className="absolute inset-0 h-full w-full -rotate-90"
        >
          <circle
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_R}
            fill="none"
            stroke="var(--color-ink-3)"
            strokeWidth="1"
          />
          {stage === "breathing" && (
            <circle
              className="breath-ring"
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_R}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>

        <div
          aria-hidden
          className={`breath-circle ${stage === "breathing" ? "breath-anim" : ""}`}
        />

        {/* 큰 숫자 하나 — 이 화면의 카피는 문장이 아니라 이 숫자다 */}
        <div className="absolute flex flex-col items-center">
          <p
            aria-live="polite"
            className="text-[11px] tracking-[0.4em] text-hanji-faint"
          >
            {hero.cap}
          </p>
          <p
            className={`mt-1 font-serif ${heroSize} font-light leading-none tabular-nums text-hanji`}
          >
            {hero.n}
            <span className="ml-1 text-[13px] tracking-[0.2em] text-hanji-faint">
              {hero.unit}
            </span>
          </p>
        </div>
      </div>

      {stage === "ready" && (
        <div className="rise rise-d3 flex w-full max-w-[300px] flex-col items-center">
          <p className="mt-4 break-keep text-[13px] leading-6 text-hanji-dim">
            눈을 감으면 더 잘 보입니다.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={begin}
              className="btn-obang px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
            >
              숨을 고르다
            </button>
            {soundButton}
          </div>

          {/* 안내는 지우지 않고 접었다 — 처음 앉는 사람만 펴 보면 된다 */}
          <details className="mt-5 w-full rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3 text-left">
            <summary className="cursor-pointer list-none text-[12.5px] text-hanji-dim marker:hidden">
              <span className="text-gold-soft">＋</span> 처음이신가요
            </summary>
            <div className="mt-3 space-y-2.5 border-t border-ink-3 pt-3">
              <p className="break-keep text-[12.5px] leading-6 text-hanji-dim">
                날숨을 들숨보다 길게 — 몸이 스스로 가라앉습니다. 넷을 세며
                천천히 들이쉬고, 여섯을 세며 길게 내쉽니다.
              </p>
              <p className="break-keep text-[12.5px] leading-6 text-hanji-dim">
                시작하면 <span className="text-hanji">눈을 감아 보세요</span> —
                그래야 더 알아차릴 수 있습니다. 높은 경쇠가 울리면 들숨, 낮은
                경쇠가 울리면 날숨입니다.
              </p>
              <p className="break-keep text-[12px] leading-6 text-hanji-faint">
                열 번을 세는 동안이 한 식(息)입니다. 한 판을 마치면 공덕{" "}
                {MERIT_VALUE.breath}이 쌓여요.
              </p>
            </div>
          </details>
        </div>
      )}

      {stage === "breathing" && (
        <div className="flex flex-col items-center">
          {/* 알아차림의 말 — 숨마다 돌아가며 하나씩 */}
          <p className="mt-4 break-keep text-[12.5px] tracking-wide text-gold-soft/90">
            {GUIDES[Math.floor(seconds / SEC_PER_BREATH) % GUIDES.length]}
          </p>
          <p className="mt-1.5 text-[11px] tabular-nums tracking-[0.3em] text-hanji-faint">
            {clock}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={finish}
              className="rounded-full border border-ink-3 px-9 py-3 text-[13px] tracking-[0.3em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              마치다
            </button>
            {soundButton}
          </div>
        </div>
      )}

      {stage === "done" && (
        <div className="flex flex-col items-center">
          <p className="mt-4 break-keep text-[12.5px] tracking-wide text-hanji-dim">
            공덕 <span className="text-vermilion">{MERIT_VALUE.breath}</span> ·
            오늘 {today}판째
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={begin}
              className="btn-obang px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
            >
              한 판 더
            </button>
            {soundButton}
          </div>
        </div>
      )}
    </div>
  );
}
