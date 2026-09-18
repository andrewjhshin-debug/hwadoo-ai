"use client";

// ────────────────────────────────────────────────────────────────
// 호흡 명상 — 들숨 4초에 원이 부드럽게 커지고, 날숨 6초에 다시 작아진다.
// 애니메이션은 CSS keyframes 하나(10초 주기)가 맡고, JS 는 시작·마침과
// 문구 전환만 거든다 — 문구는 setInterval 누적이 아니라 시작 시각으로부터의
// 경과로 계산해, 원의 움직임과 어긋나지 않는다.
// 길이 선택은 없다 — 스스로 마칠 때까지. 10초 = 1식(息).
// 음향: 마디가 바뀔 때 경쇠 한 음 + 그 마디 내내 흐르는 숨소리.
// 들숨엔 소리가 밝아지며 차오르고, 날숨엔 어두워지며 잦아든다 —
// 눈을 감으면 화면이 사라지므로, 숨의 길이는 귀가 붙잡아야 한다.
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
import {
  loopPhase,
  startLoop,
  stopLoop,
  warmLoop,
} from "@/lib/breathLoop";
import { loadDaily } from "@/lib/daily";
import { MERIT_VALUE } from "@/lib/merit";
import { breatheIn, breatheOut, wakeBreath } from "@/lib/sound";

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
/* 아직 시작 안 했을 때 — 빛만 아주 천천히 들고 난다.
   「누르세요」라고 적는 대신 원이 혼자 숨 쉬게 둔다.
   크기는 안 건드린다. 커졌다 작아지면 벌써 시작한 줄 안다. */
.breath-idle {
  animation: breath-idle 3.4s ease-in-out infinite;
}
@keyframes breath-idle {
  0%, 100% { box-shadow: 0 0 26px var(--breath-glow-dim); }
  50% { box-shadow: 0 0 46px var(--breath-glow-bright); }
}
@media (prefers-reduced-motion: reduce) {
  .breath-circle {
    --breath-max: 1.12;
  }
  .breath-idle {
    animation: none;
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
  const [today, setToday] = useState(0); // 오늘 몇 식(10초)
  const [earned, setEarned] = useState(0); // 방금 판에 실제로 붙은 공덕
  // 음원 한 바퀴로 돌고 있나 — 이러면 화면이 꺼져도 소리가 이어진다
  const [onFile, setOnFile] = useState(false);
  const startRef = useRef(0);
  // ── 음향 손잡이 둘 ──
  // audioRef: 빚는 소리를 내는 오디오 문
  // hushRef : 지금 흐르는 숨소리를 거두는 손잡이 (마디가 바뀌거나 판을 마칠 때)
  const audioRef = useRef<AudioContext | null>(null);
  const hushRef = useRef<(() => void) | null>(null);

  // 오늘치는 브라우저 서랍에만 있다 — 서버가 그린 화면과 어긋나지 않게
  // 첫 그림 뒤에 읽는다.
  useEffect(() => {
    setToday(loadDaily().by.breath ?? 0);
    warmLoop(); // 음원을 미리 받아 둔다 — 첫 들숨이 늦지 않게
    // 방을 떠나면 **모두** 거둔다 — 음원·빚던 숨소리·오디오 문까지.
    // 음원만 껐더니 합성 숨소리가 남아 계속 들렸다.
    return () => {
      stopLoop();
      hushRef.current?.();
      hushRef.current = null;
      void audioRef.current?.close().catch(() => {});
      audioRef.current = null;
    };
  }, []);

  // ── 음향 — 경쇠 한 음만 (파일 없이 합성) ──────────────────────
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

  // 마디가 바뀔 때마다: 경쇠 한 음으로 전환을 알리고, 그 마디 내내 숨소리를 깐다.
  // 길이는 '지금 이 마디에 남은 시간'으로 준다 — 중간에 소리를 켜도 원의 리듬과
  // 어긋나지 않게. (들숨 4초 · 날숨 6초가 CSS 애니메이션과 같은 시계를 본다)
  useEffect(() => {
    if (stage !== "breathing" || !soundOn) return;
    // 음원 한 바퀴가 돌고 있으면 소리는 그쪽이 낸다 — 겹쳐 울리지 않게
    if (onFile) return;
    const ctx = ensureAudio();
    if (ctx) playCue(ctx, phase, ctx.currentTime);
    const pos = (performance.now() - startRef.current) % CYCLE_MS;
    const left = (phase === "in" ? INHALE_MS - pos : CYCLE_MS - pos) / 1000;
    hushRef.current = phase === "in" ? breatheIn(left) : breatheOut(left);
    return () => {
      hushRef.current?.(); // 두 숨이 겹쳐 울리지 않게 앞 숨을 먼저 거둔다
      hushRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage, soundOn, onFile]);

  // 문구·경과 시간 — 시작 시각으로부터 계산 (같은 값이면 React 가 그리지 않는다)
  useEffect(() => {
    if (stage !== "breathing") return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      // 마디는 **음원의 재생 위치**를 먼저 본다. 화면이 꺼져 있던 동안
      // 이 함수는 아예 안 돌았으니, 돌아왔을 때 제 시계로 세면 소리와
      // 어긋난다. 음원이 곧 시계다(파일 한 바퀴 = 한 식).
      const p = loopPhase();
      setPhase(p ?? (elapsed % CYCLE_MS < INHALE_MS ? "in" : "out"));
      setSeconds(Math.floor(elapsed / 1000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const begin = () => {
    ensureAudio(); // 사용자 손길이 있을 때 오디오 문을 연다 (iOS 규칙)
    wakeBreath(); // 숨소리는 다른 문을 쓴다 — 첫 들숨이 늦지 않게 같이 연다
    startRef.current = performance.now();
    setPhase("in");
    setSeconds(0);
    setStage("breathing");
    // 음원 한 바퀴를 튼다. 이게 되면 폰을 잠가도 소리가 이어지고,
    // 잠금화면에 「화두 · 호흡 명상」과 멈춤 단추가 뜬다.
    // 소리를 꺼 둔 사람이거나 자동재생이 막힌 자리면 false — 그때는
    // 예전대로 빚는 소리로 간다(화면이 켜져 있는 동안만 들린다).
    if (soundOn) {
      void startLoop(0.9, () => finishRef.current?.()).then(setOnFile);
    }
  };

  // 잠금화면의 멈춤 단추가 부른다. begin 이 finish 보다 위에 있어 바로는
  // 못 부르니, 손잡이를 ref 에 걸어 둔다.
  const finishRef = useRef<(() => void) | null>(null);

  const finish = () => {
    const elapsed = performance.now() - startRef.current;
    // 10초 = 1식.
    //
    // 예전엔 `Math.max(1, ...)` 로 한 식을 얹어 줬다. 앉았던 성의를
    // 쳐 준다는 뜻이었는데, 형이 짚었다 —
    //   「숨 눌렸다가 바로 다시 눌려도 왜 공덕 주노」
    // 맞다. 누르자마자 끄면 공덕이 붙는다. 그건 수행이 아니라 단추질이다.
    // **한 식을 못 채우면 공덕도 없고 판도 안 센다.** 그냥 멎는다.
    const n = Math.floor(elapsed / CYCLE_MS);
    if (n < 1) {
      stopLoop();
      setOnFile(false);
      void audioRef.current?.suspend();
      setStage("ready");
      setBreaths(0);
      setEarned(0);
      return;
    }
    setBreaths(n);
    setStage("done");
    stopLoop(); // 음원도 함께 내려놓는다 — 잠금화면의 표시도 같이 사라진다
    setOnFile(false);
    void audioRef.current?.suspend(); // 빚던 소리도 함께
    // 공덕은 판이 아니라 **식마다** 붙는다 — 여섯 식에 끊고 다시 여는 것이
    // 이득이 되면 안 된다. 오래 앉은 사람이 더 가져가야 맞다.
    setEarned(recordMeditation(Date.now(), n));
    // 공덕이 하루 장부에 적힌 뒤라야 오늘치가 맞다 — 그래서 여기서 다시 읽는다
    setToday(loadDaily().by.breath ?? 0);
  };

  finishRef.current = finish;

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
      onClick={() => {
        // 상태 갱신 함수(setSoundOn) 안에서 소리를 여닫고 있었다. 그건
        // 순수해야 하는 자리라 React 가 두 번 부를 수 있고, 그래서 끄기를
        // 눌러도 소리가 다시 살아나곤 했다. 부수효과는 여기서 낸다.
        const next = !soundOn;
        setSoundOn(next);
        if (!next) {
          stopLoop();
          setOnFile(false);
          hushRef.current?.(); // 빚던 숨소리도 그 자리에서 거둔다
          hushRef.current = null;
          void audioRef.current?.suspend();
        } else if (stage === "breathing") {
          void audioRef.current?.resume();
          void startLoop(0.9, () => finishRef.current?.()).then(setOnFile);
        }
      }}
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
    // 판(ready·breathing·done)마다 아래 내용의 양이 달라, 가운데 정렬이
    // 덩어리를 그때그때 다시 잡았다. 그래서 시작만 눌러도 원과 제목이
    // 위로 쑥 올라갔다 — 형: 「할 때마다 위치가 조금씩 바뀌어서 멀미남」.
    // **위에서부터** 세우고, 아래 칸은 키를 못박는다(아래 min-h).
    // 그러면 원은 어느 판에서도 한 픽셀도 안 움직인다.
    <div className="flex flex-1 flex-col items-center justify-start px-6 pb-4 pt-6 text-center sm:pt-10">
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
          className={`breath-circle ${
            stage === "breathing" ? "breath-anim" : "breath-idle"
          }`}
        />

        {/* 동그라미가 곧 단추다 — 시작도 마침도 여기서.
            아래 단추까지 손을 내리는 게 한 박자였다. 명상은 그 한 박자가
            아깝다. 원이 가장 크고 눈이 이미 거기 가 있다.

            처음엔 숨 쉬는 중에는 안 받게 해 두었다. 눈 감고 하는 일이라
            스쳐 누르면 판이 끝나 버린다고 봤는데, 형 말이 맞다 —
            **시작을 원으로 하면 마침도 원이어야 한다.** 시작은 원인데
            마치려면 단추를 찾아 눈을 떠야 하면 그게 더 이상하다. */}
        <button
          type="button"
          onClick={stage === "breathing" ? finish : begin}
          aria-label={
            stage === "breathing"
              ? "마치다"
              : stage === "done"
                ? "한 번 더 명상"
                : "숨 고르기 시작"
          }
          className="absolute inset-0 z-10 rounded-full transition-transform active:scale-[0.97]"
        />

        {/* 큰 숫자 하나 — 이 화면의 카피는 문장이 아니라 이 숫자다.
            손길은 안 받는다(pointer-events-none). 이게 없으면 숫자 위를
            누른 손가락이 여기서 멎어 아래 단추까지 안 내려간다 —
            하필 원 한가운데가, 제일 누르기 좋은 자리가 죽는다. */}
        <div className="pointer-events-none absolute flex flex-col items-center">
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

      {/* 판마다 바뀌는 칸 — **키를 못박아 둔다.** 안이 무엇으로 차든
          위쪽(제목·원)은 제자리를 지킨다. */}
      <div className="flex min-h-[212px] w-full flex-col items-center">
      {stage === "ready" && (
        <div className="rise rise-d3 flex w-full max-w-[300px] flex-col items-center">
          <p className="mt-4 break-keep text-[13px] leading-6 text-hanji-dim">
            눈을 감고 하면 더 효과적입니다.
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

        </div>
      )}
      </div>

      {stage === "breathing" && (
        <div className="flex flex-col items-center">
          {/* 알아차림의 말 — 숨마다 돌아가며 하나씩 */}
          <p className="mt-4 break-keep text-[12.5px] tracking-wide text-gold-soft/90">
            {GUIDES[Math.floor(seconds / SEC_PER_BREATH) % GUIDES.length]}
          </p>
          <p className="mt-1.5 text-[11px] tabular-nums tracking-[0.3em] text-hanji-faint">
            {clock}
          </p>
          {/* 숫자를 보고 있으면 명상이 아니라 구경이다 */}
          <p className="mt-2.5 text-[12px] tracking-[0.2em] text-gold-soft">
            눈을 감고 하면 더 효과적입니다
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
          {/* 늘 「공덕 21」이라 적혀 있었다. 실제로는 식마다 붙으니
              삼 분이면 378 이고, 하루 몫이 찼으면 0 이다. 세 배가 아니라
              열여덟 배가 어긋났다. 붙은 값을 그대로 적는다. */}
          <p className="mt-4 break-keep text-[12.5px] tracking-wide text-hanji-dim">
            {earned > 0 ? (
              <>
                공덕{" "}
                <span className="text-vermilion">
                  {earned.toLocaleString("ko-KR")}
                </span>{" "}
                · 오늘 {today}식째
              </>
            ) : (
              <>오늘 호흡 몫이 찼어요 · 오늘 {today}식째</>
            )}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={begin}
              className="btn-obang px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
            >
              한 번 더 명상
            </button>
            {soundButton}
          </div>
        </div>
      )}

      {/* 안내는 지우지 않고 접었다 — 처음 앉는 사람만 펴 보면 된다.
          한 판을 마쳤다고 사라지지 않는다. 한 판은 삼 분이고, 그 사이에
          안내를 다 외우는 사람은 없다. 숨 쉬는 동안만 비운다. */}
      {/* 「처음이신가요」는 **늘 둔다.** 한 판이 끝나면 사라지게 했더니,
          정작 두 번째 판에서 궁금해진 사람이 찾을 데가 없었다.
          접혀 있으니 자리도 안 먹는다. */}
      <details className="rise rise-d3 mt-5 w-full max-w-[300px] rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3 text-left">
          <summary className="cursor-pointer list-none text-[12.5px] text-hanji-dim marker:hidden">
            <span className="text-gold-soft">＋</span> 처음이신가요
          </summary>
          <div className="mt-3 space-y-2.5 border-t border-ink-3 pt-3">
            <p className="break-keep text-[12.5px] leading-6 text-hanji-dim">
              날숨을 들숨보다 길게 — 몸이 스스로 가라앉습니다. 넷을 세며
              천천히 들이쉬고, 여섯을 세며 길게 내쉽니다.
            </p>
            <p className="break-keep text-[12.5px] leading-6 text-hanji-dim">
              화면을 보지 않아도 됩니다. 숨소리가 차오르면 들숨, 잦아들면
              날숨입니다.
            </p>
            <p className="break-keep text-[12px] leading-6 text-hanji-faint">
              열 번을 세는 동안이 한 식(息)입니다. 한 식마다 공덕{" "}
              {MERIT_VALUE.breath} — 오래 앉을수록 더 쌓입니다.
            </p>
          </div>
      </details>
    </div>
  );
}
