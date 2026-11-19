"use client";

// 배움(學) — 불교 기초 열두 걸음. 내용은 src/lib/learn.ts.
// 길(목록) → 개념 카드 → 생활 예시 물음 하나 → 공덕. 앞 걸음을 끝내야 다음 걸음이 열린다.

import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import s from "./learn.module.css";
import { LESSONS, loadLearned, markLearned, type Lesson } from "@/lib/learn";
import { addMerit } from "@/lib/merit";

export default function LearnPage() {
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<Lesson | null>(null);
  const [step, setStep] = useState<"card" | "quiz">("card");
  const [pick, setPick] = useState<number | null>(null);
  const [gain, setGain] = useState(0);

  useEffect(() => setDone(loadLearned()), []);

  // 화면을 바꾸면 맨 위로 — 창이 아니라 HipRoom 안의 스크롤 통을 올린다
  const top = useRef<HTMLDivElement>(null);
  const view = open ? `${open.id}:${step}` : "road";
  useEffect(() => {
    for (let el = top.current?.parentElement; el; el = el.parentElement) {
      if (el.scrollTop > 0) el.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [view]);

  const go = (l: Lesson) => { setOpen(l); setStep("card"); setPick(null); setGain(0); };
  const answer = (i: number) => {
    if (pick !== null || !open) return;
    setPick(i);
    if (!done.includes(open.id)) {
      setDone(markLearned(open.id));
      setGain(addMerit("learn").gained);
    }
  };
  const next = open ? LESSONS[LESSONS.indexOf(open) + 1] : undefined;

  return (
    <HipRoom here="/learn" lanes={false} rail="/settings">
      <div className={s.page} ref={top}>
        {!open ? (
          <>
            <div className={s.head}>
              <span className={s.hz}>學</span>
              <p className={s.count}>{done.length}<small> / {LESSONS.length}</small></p>
            </div>
            <ol className={s.road}>
              {LESSONS.map((l, i) => {
                const d = done.includes(l.id);
                const now = !d && (i === 0 || done.includes(LESSONS[i - 1].id));
                const lock = !d && !now;
                return (
                  <li key={l.id}>
                    <button className={s.st} data-d={d ? "1" : undefined} data-now={now ? "1" : undefined} disabled={lock} onClick={() => go(l)}>
                      <span className={s.n}>{l.hz}</span>
                      <span className={s.tx}><b>{l.name}</b><small>{l.line}</small></span>
                      <em>{d ? "✓" : now ? "오늘" : i + 1}</em>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        ) : step === "card" ? (
          <>
            <button className={s.back} onClick={() => setOpen(null)}>‹ 열두 걸음</button>
            <article className={s.card}>
              <h1>{open.name}<small>{open.hanja}</small></h1>
              <p className={s.def}>{open.def}</p>
              <ol className={s.items}>
                {open.items.map(([h, t], i) => (
                  <li key={h}><b>{i + 1}</b><span><strong>{h}</strong> — {t}</span></li>
                ))}
              </ol>
              <p className={s.tip}>{open.tip}</p>
            </article>
            <button className={s.btn} onClick={() => setStep("quiz")}>확인 물음</button>
          </>
        ) : (
          <>
            <button className={s.back} onClick={() => setStep("card")}>‹ {open.name}</button>
            <p className={s.q}>{open.quiz.q}</p>
            <div className={s.opts}>
              {open.quiz.opts.map((o, i) => (
                <button key={o} className={s.opt} data-ok={pick !== null && i === open.quiz.a ? "1" : undefined} data-bad={pick === i && i !== open.quiz.a ? "1" : undefined} onClick={() => answer(i)}>{o}</button>
              ))}
            </div>
            {pick !== null && (
              <>
                <p className={s.why}>{open.quiz.why}</p>
                {gain > 0 && <p className={s.gain}>+{gain.toLocaleString()}<small>공덕</small></p>}
                {next && done.includes(open.id) ? (
                  <button className={s.btn} onClick={() => go(next)}>다음 걸음 · {next.name}</button>
                ) : (
                  <button className={s.btn} onClick={() => setOpen(null)}>열두 걸음으로</button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </HipRoom>
  );
}
