"use client";

// 배움(學) — 불교 기초 열두 걸음. 내용은 src/lib/learn.ts.
// 길(목록) → 개념 카드 → 생활 예시 물음 하나 → 공덕. 앞 걸음을 끝내야 다음 걸음이 열린다.

import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import s from "./learn.module.css";
import { LESSONS, loadLearned, markLearned, type Lesson } from "@/lib/learn";
import { addMerit } from "@/lib/merit";

// **굵게** 표시만 읽는다
const bold = (t: string) => t.split("**").map((x, i) => (i % 2 ? <strong key={i}>{x}</strong> : x));

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
  // 검수(2026-11-24): 폰 뒤로가기가 배움을 통째로 떠났다 — 목록에서 걸음을 열 때 층 하나(DoryangMenu 결),
  //   뒤로가기·「‹ 열두 걸음」은 그 층을 걷는다. 다음 걸음은 같은 층 안에서 바꿔 낀다(쌓지 않는다).
  //   층마다 제 표(learnLayer)를 단다 — ☰ 판이 그 위에 층을 얹었다 닫혀도(같은 popstate) 걸음은 그대로 둔다.
  const layer = useRef(0);
  const enter = (l: Lesson) => {
    // eslint-disable-next-line react-hooks/purity -- 누를 때만 도는 손잡이다(그리는 중엔 안 부른다)
    layer.current = Date.now();
    try { window.history.pushState({ ...window.history.state, hwadooLayer: true, learnLayer: layer.current }, ""); } catch { /* 못 쌓아도 걸음은 열린다 */ }
    go(l);
  };
  const leave = () => window.history.back();
  useEffect(() => {
    const onPop = () => { if (window.history.state?.learnLayer !== layer.current) setOpen(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
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
                    <button className={s.st} data-d={d ? "1" : undefined} data-now={now ? "1" : undefined} disabled={lock} onClick={() => enter(l)}>
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
            <button className={s.back} onClick={leave}>‹ 열두 걸음</button>
            <article className={s.card}>
              <h1>{open.name}<small>{open.hanja}</small></h1>
              <p className={s.def}>{bold(open.def)}</p>
              <ol className={s.items}>
                {open.items.map(([h, t], i) => (
                  <li key={h}><b>{i + 1}</b><span><strong>{h}</strong> — {t}</span></li>
                ))}
              </ol>
              <p className={s.tip}>{bold(open.tip)}</p>
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
                <p className={s.why}>{bold(open.quiz.why)}</p>
                {gain > 0 && <p className={s.gain}>+{gain.toLocaleString()}<small>공덕</small></p>}
                {next && done.includes(open.id) ? (
                  <button className={s.btn} onClick={() => go(next)}>다음 걸음 · {next.name}</button>
                ) : (
                  <button className={s.btn} onClick={leave}>열두 걸음으로</button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </HipRoom>
  );
}
