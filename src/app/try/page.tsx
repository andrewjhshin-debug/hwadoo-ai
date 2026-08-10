"use client";

// ─────────────────────────────────────────────────────────────
// 체험하기 — 기한 없이, 전 과정을 한 바퀴.
// 받기 → 사유(메모) → 회향(답, 500자) → 스승들의 답 → 기록에 남음
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHwadu, type Hwadu } from "@/lib/hwadu";
import { loadStore, saveStore } from "@/lib/store";

// 체험용으로 좋은, 누구에게나 열리는 화두들
const TRY_IDS = ["simsima", "who-am-i", "snow", "breath", "bell-sound"];
const MAX_ANSWER = 500;

type Step = "receive" | "ponder" | "answer" | "done";

export default function TryPage() {
  const [hwadu, setHwadu] = useState<Hwadu | null>(null);
  const [step, setStep] = useState<Step>("receive");
  const [memo, setMemo] = useState("");
  const [answer, setAnswer] = useState("");
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    const id = TRY_IDS[Math.floor(Math.random() * TRY_IDS.length)];
    setHwadu(getHwadu(id) ?? null);
  }, []);

  if (!hwadu) return null;

  // 회향 — 기록에 남긴다
  const finish = () => {
    if (!answer.trim()) return;
    const s = loadStore();
    saveStore({
      ...s,
      history: [
        ...s.history,
        {
          hwaduId: hwadu.id,
          receivedAt: startedAt,
          durationDays: 0,
          notes: memo.trim() || undefined,
          journal: answer.trim(),
          journalAt: Date.now(),
        },
      ],
      received: s.received + 1,
    });
    setStep("done");
  };

  const stepLabel = (n: number, label: string, active: boolean) => (
    <span
      className={`text-[11px] tracking-[0.2em] ${active ? "text-gold" : "text-hanji-faint"}`}
    >
      {n}. {label}
    </span>
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-12">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        체험하기
      </h1>
      <p className="rise mt-3 text-center text-[12px] text-hanji-faint">
        기한 없이, 화두의 전 과정을 한 바퀴 돌아봅니다
      </p>

      {/* 걸음 표시 */}
      <div className="rise mt-6 flex items-center justify-center gap-4">
        {stepLabel(1, "받다", step === "receive")}
        {stepLabel(2, "사유하다", step === "ponder")}
        {stepLabel(3, "회향하다", step === "answer")}
        {stepLabel(4, "듣다", step === "done")}
      </div>

      {/* 1. 받다 */}
      {step === "receive" && (
        <section className="rise rise-d1 mt-12 flex flex-col items-center text-center">
          {hwadu.hanja && (
            <p className="text-xs tracking-[0.6em] text-hanji-faint">
              {hwadu.hanja}
            </p>
          )}
          <p className="question-glow mt-6 whitespace-pre-line font-serif text-xl font-light leading-[1.7] text-hanji">
            {hwadu.question}
          </p>
          <p className="mt-8 text-xs leading-6 text-hanji-faint">
            본래는 이 물음과 며칠을 보내야 하지만,
            <br />
            체험에서는 지금 바로 다음 걸음으로 갈 수 있습니다.
          </p>
          <button
            onClick={() => setStep("ponder")}
            className="btn-obang mt-8 px-9 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
          >
            물음을 품었다 — 다음
          </button>
        </section>
      )}

      {/* 2. 사유하다 */}
      {step === "ponder" && (
        <section className="rise mt-10 flex flex-col">
          <p className="whitespace-pre-line text-center font-serif text-sm font-light leading-7 text-hanji-dim">
            {hwadu.question}
          </p>
          <div className="mt-8 border-t border-ink-3 pt-6">
            <p className="text-xs tracking-[0.3em] text-gold-soft">
              思惟 · 사유의 방
            </p>
            <p className="mt-2 text-xs leading-6 text-hanji-faint">
              떠오르는 것을 몇 줄 적어 보십시오. 답이 아니라 발자국입니다.
            </p>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={5}
              placeholder="문득 —"
              className="journal-area mt-4"
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setStep("answer")}
              className="btn-obang px-8 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
            >
              붓을 들다 — 다음
            </button>
          </div>
        </section>
      )}

      {/* 3. 회향하다 */}
      {step === "answer" && (
        <section className="rise mt-10 flex flex-col">
          <p className="whitespace-pre-line text-center font-serif text-sm font-light leading-7 text-hanji-dim">
            {hwadu.question}
          </p>
          <div className="mt-8 border-t border-ink-3 pt-6">
            <p className="text-xs tracking-[0.3em] text-gold-soft">
              回向 · 그대의 답
            </p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER))}
              rows={7}
              maxLength={MAX_ANSWER}
              placeholder="지금 보이는 만큼만, 짧아도 좋습니다."
              className="journal-area mt-4"
            />
            <p className="mt-2 text-right text-[11px] text-hanji-faint">
              {answer.length} / {MAX_ANSWER}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setStep("ponder")}
              className="text-xs tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              ← 조금 더 사유
            </button>
            <button
              onClick={finish}
              disabled={!answer.trim()}
              className="btn-obang px-8 py-2.5 text-[13px] tracking-[0.3em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
            >
              회향하다
            </button>
          </div>
        </section>
      )}

      {/* 4. 듣다 — 스승들의 답 + 기록 완료 */}
      {step === "done" && (
        <section className="rise mt-10 flex flex-col items-center">
          <p className="text-xs tracking-[0.4em] text-gold-soft">
            옛 스승들은 이렇게 일렀습니다
          </p>
          <div className="mt-7 flex w-full flex-col gap-7">
            {hwadu.masters.map((m, i) => (
              <figure key={m.name + i}>
                <blockquote className="whitespace-pre-line font-serif text-[15px] font-light leading-8 text-hanji">
                  {m.text}
                </blockquote>
                <figcaption className="mt-2 text-right text-xs tracking-widest text-hanji-dim">
                  — {m.name}
                  {m.era && <span className="text-hanji-faint"> · {m.era}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-10 w-full border-t border-ink-3 pt-7 text-center">
            <p className="text-[13px] leading-7 text-hanji-dim">
              한 바퀴를 돌았습니다. 이 회향은{" "}
              <Link href="/archive" className="text-gold-soft underline decoration-gold/30 underline-offset-4">
                지난 화두
              </Link>
              에 첫 기록으로 남았습니다.
            </p>
            <p className="mt-3 text-xs leading-6 text-hanji-faint">
              본래의 화두는 며칠을 품은 뒤에야 붓을 들 수 있습니다.
              <br />그 기다림이 이 도량의 전부입니다.
            </p>
            <Link
              href="/"
              className="btn-obang mt-8 inline-block px-10 py-3.5 font-serif text-[15px] tracking-[0.25em] text-hanji transition-opacity hover:opacity-90"
            >
              진짜 화두 받기
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
