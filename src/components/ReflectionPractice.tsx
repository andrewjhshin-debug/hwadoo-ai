"use client";

import { useEffect, useRef, useState } from "react";
import { recordMeditation } from "@/lib/meditation";
import { reflectionNote, reflectionPhase, REFLECTION_DURATION_MS } from "@/lib/reflectionPractice";

export default function ReflectionPractice({ onReflect }: { onReflect: (text: string) => boolean }) {
  const [stage, setStage] = useState<"ready" | "running" | "done" | "closed">("ready");
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState("");
  const [gained, setGained] = useState(0);
  const [error, setError] = useState(false);
  const awarded = useRef(false);

  useEffect(() => {
    if (stage !== "running") return;
    let last = performance.now();
    let visible = !document.hidden;
    let active = 0;
    const tick = () => {
      const now = performance.now();
      if (visible) active = Math.min(REFLECTION_DURATION_MS, active + now - last);
      last = now;
      visible = !document.hidden;
      setElapsed(active);
      if (active >= REFLECTION_DURATION_MS && !awarded.current) {
        awarded.current = true;
        setGained(recordMeditation(Date.now(), 6));
        setStage("done");
      }
    };
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [stage]);

  if (stage === "closed") return null;
  const phase = reflectionPhase(elapsed);
  const button = "min-h-11 rounded-full border border-gold/35 px-5 py-2 text-[12px] text-gold transition-colors hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";

  return (
    <section aria-label="글에서 수행으로" className="rounded-2xl border border-gold/20 bg-gold/[0.04] px-4 py-4">
      {stage === "ready" && <>
        <p className="text-[13px] leading-6 text-hanji">적은 말을 잠시 놓고, 숨을 살펴볼까요?</p>
        <p className="mt-1 text-[11px] leading-5 text-hanji-faint">글의 내용을 분석하지 않는 공통 수행 안내입니다. 원할 때만 시작하세요.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button className={button} onClick={() => setStage("running")}>1분 호흡 시작</button>
          <button className="min-h-11 px-2 text-[12px] text-hanji-faint" onClick={() => setStage("closed")}>지금은 글만 남기기</button>
        </div>
      </>}
      {stage === "running" && <>
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif text-lg text-hanji">{phase.inhale ? "편안히 들이쉬고" : "천천히 내쉬어요"}</p>
          <span className="tabular-nums text-sm text-gold">{phase.secondsLeft}초</span>
        </div>
        <progress className="mt-3 h-1 w-full accent-[var(--color-gold)]" aria-label="1분 호흡 진행" value={elapsed} max={REFLECTION_DURATION_MS} />
        <p className="mt-2 text-[11px] leading-5 text-hanji-faint">리듬이 불편하면 평소처럼 숨 쉬세요. 화면을 벗어나면 잠시 멈춥니다.</p>
        <button className="mt-2 min-h-11 text-[12px] text-hanji-dim" onClick={() => setStage("closed")}>여기서 그만하기</button>
      </>}
      {stage === "done" && <>
        <p role="status" className="text-[13px] leading-6 text-hanji">1분을 함께 쉬었어요.{gained > 0 ? ` 공덕 +${gained}` : ""}</p>
        <label className="mt-3 block text-[12px] leading-6 text-hanji-dim" htmlFor="reflection-after-breath">처음 적을 때와 지금, 달라진 점이 있나요? (선택)</label>
        <textarea id="reflection-after-breath" value={note} onChange={e => { setNote(e.target.value); setError(false); }} maxLength={500} rows={2} placeholder="달라진 게 없어도 괜찮아요" className="mt-1 w-full resize-none rounded-xl border border-ink-3 bg-ink/40 px-3 py-2 text-base leading-7 text-hanji outline-none focus:border-gold/50" />
        {error && <p role="alert" className="text-[12px] text-vermilion">저장하지 못했어요. 적은 글은 그대로 있어요.</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button className={button} disabled={!note.trim()} onClick={() => {
            if (onReflect(reflectionNote(note))) setStage("closed");
            else setError(true);
          }}>단상에 남기기</button>
          <button className="min-h-11 px-2 text-[12px] text-hanji-faint" onClick={() => setStage("closed")}>기록 없이 마치기</button>
        </div>
      </>}
    </section>
  );
}
