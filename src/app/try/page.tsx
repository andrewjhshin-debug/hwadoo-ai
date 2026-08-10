"use client";

// ─────────────────────────────────────────────────────────────
// 체험하기 — 실제 화면 그대로, 다만 시간이 클릭으로 흐른다.
// 홈과 똑같이 생긴 화면에서 한 걸음씩 눌러 전 과정을 돌고,
// 마지막에 지난 화두 하나가 남는다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banga } from "@/components/icons";
import { getHwadu, type Hwadu } from "@/lib/hwadu";
import Question from "@/components/Question";
import { loadStore, saveStore } from "@/lib/store";
import { todayGuide } from "@/lib/guidance";

// 체험용 — 짧고 누구에게나 열리는 화두들
const TRY_IDS = ["simsima", "who-am-i", "snow", "breath", "bell-sound"];
const MAX_ANSWER = 500;

type Step =
  | "received" // 화두를 받았다 (기다리는 중)
  | "pondering" // 사유의 방을 열어 단상을 적는다
  | "ripened" // 달이 찼다
  | "writing" // 답을 쓴다
  | "done"; // 스승들의 답

// 각 걸음에서 아래에 뜨는 안내
const GUIDE: Record<Step, { text: string; action: string }> = {
  received: {
    text: "화두를 받았습니다. 본래는 이대로 사흘이 흘러야 합니다 — 체험에서는 눌러서 건너뜁니다.",
    action: "하루가 흘렀다",
  },
  pondering: {
    text: "기다리는 동안 떠오르는 것은 사유의 방에 적어 둡니다. 답이 아니라 발자국입니다.",
    action: "사흘이 흘렀다",
  },
  ripened: {
    text: "달이 찼습니다. 이제 붓을 들 수 있습니다.",
    action: "붓을 들다",
  },
  writing: {
    text: "지금 보이는 만큼만 쓰십시오. 정답은 없습니다.",
    action: "회향하다",
  },
  done: { text: "", action: "" },
};

export default function TryPage() {
  const [hwadu, setHwadu] = useState<Hwadu | null>(null);
  const [step, setStep] = useState<Step>("received");
  const [notesOpen, setNotesOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [answer, setAnswer] = useState("");
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    setHwadu(getHwadu(TRY_IDS[Math.floor(Math.random() * TRY_IDS.length)]) ?? null);
  }, []);

  if (!hwadu) return null;

  // 걸음을 옮긴다
  const next = () => {
    if (step === "received") {
      setStep("pondering");
      setNotesOpen(true);
    } else if (step === "pondering") {
      setNotesOpen(false);
      setStep("ripened");
    } else if (step === "ripened") {
      setStep("writing");
    } else if (step === "writing") {
      finish();
    }
  };

  // 회향 — 지난 화두에 남긴다
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
          durationDays: 3,
          notes: memo.trim() || undefined,
          journal: answer.trim(),
          journalAt: Date.now(),
        },
      ],
      received: s.received + 1,
    });
    setStep("done");
  };

  const dayNo = step === "received" ? 1 : 3;

  // ── 회향을 마쳤다 — 스승들의 답 ──
  if (step === "done") {
    return (
      <div className="flex flex-1 flex-col items-center px-6 py-14">
        <section className="rise flex w-full max-w-2xl flex-col items-center text-center">
          <p className="text-xs tracking-[0.4em] text-gold-soft">
            回向 · 그대의 답
          </p>
          <p className="mt-5 whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
            {answer}
          </p>

          <div className="mt-12 w-full border-t border-ink-3 pt-10">
            <p className="text-xs tracking-[0.4em] text-hanji-faint">
              옛 스승들은 이렇게 일렀습니다
            </p>
          </div>
          <div className="mt-8 flex w-full max-w-xl flex-col gap-8 text-left">
            {hwadu.masters.map((m, i) => (
              <figure key={m.name + i}>
                <blockquote className="whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
                  {m.text}
                </blockquote>
                <figcaption className="mt-3 text-right text-xs tracking-widest text-hanji-dim">
                  — {m.name}
                  {m.era && <span className="text-hanji-faint"> · {m.era}</span>}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-12 w-full border-t border-ink-3 pt-8">
            <p className="text-[13px] leading-7 text-hanji-dim">
              한 바퀴를 돌았습니다. 이 회향은{" "}
              <Link
                href="/archive"
                className="text-gold-soft underline decoration-gold/30 underline-offset-4"
              >
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
      </div>
    );
  }

  // 튜토리얼 단계 (1~4)
  const stepNo =
    step === "received" ? 1 : step === "pondering" ? 2 : step === "ripened" || step === "writing" ? 3 : 4;
  const STEPS = ["화두를 받다", "사유하다", "답을 쓰다", "스승을 듣다"];

  // ── 홈과 똑같은 화면 ──
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-40 pt-14 text-center">
      {/* 튜토리얼 단계 표시 — 여기가 체험임을 알린다 */}
      <div className="mb-10 w-full max-w-2xl">
        <p className="text-center text-[11px] tracking-[0.4em] text-gold-soft">
          體驗 · 체험하기
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < stepNo;
            const now = n === stepNo;
            return (
              <div key={label} className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      now
                        ? "bg-gold/25 font-medium text-gold"
                        : done
                          ? "bg-gold/10 text-gold-soft"
                          : "border border-ink-3 text-hanji-faint"
                    }`}
                  >
                    {n}
                  </span>
                  <span
                    className={`text-[11px] tracking-wide ${
                      now ? "text-hanji" : "text-hanji-faint"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {n < STEPS.length && (
                  <span className="text-hanji-faint">·</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rise flex w-full max-w-2xl flex-col items-center">
        {hwadu.hanja && (
          <p className="text-xs tracking-[0.6em] text-hanji-faint">
            {hwadu.hanja}
          </p>
        )}
        <div className="question-glow mt-7 w-full">
          <Question text={hwadu.question} className="text-hanji" />
        </div>
        {hwadu.context && (
          <p className="mt-7 text-xs tracking-wider text-hanji-faint">
            {hwadu.context}
          </p>
        )}

        {step === "writing" ? (
          /* 답 쓰기 */
          <div className="mt-10 w-full max-w-xl">
            <div className="border-t border-ink-3 pt-7">
              <textarea
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER))}
                rows={8}
                maxLength={MAX_ANSWER}
                placeholder="며칠을 품고 계셨습니다. 무엇이 보였습니까."
                className="journal-area"
              />
              <p className="mt-2 text-right text-[11px] text-hanji-faint">
                {answer.length} / {MAX_ANSWER}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 달 + 남은 시간 */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-[13.5px] font-light tracking-wide text-hanji-dim">
              <span className="moon" />
              {step === "ripened" ? (
                <span>달이 차올랐습니다. 이제 답을 쓸 수 있습니다</span>
              ) : (
                <span>
                  달이 차오르는 사흘 뒤, 답을 쓸 수 있습니다 ·{" "}
                  <span className="tabular-nums text-hanji">
                    {step === "received" ? "2일 23시간 59분 12초" : "1일 04시간 21분 08초"}
                  </span>{" "}
                  남음
                </span>
              )}
            </div>

            <p className="mt-4 text-xs leading-6 tracking-[0.04em] text-hanji-faint">
              서두르지 마십시오. 질문에는 정답이 없습니다.
              <br />
              생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는 힘이
              중요합니다.
            </p>

            {/* 오늘의 참구법 */}
            {step !== "ripened" && (
              <div className="mt-8 w-full max-w-md border border-ink-3 bg-ink-2/50 px-6 py-5">
                <p className="text-[11px] tracking-[0.34em] text-gold-soft">
                  오늘의 참구법 · {dayNo}일째
                </p>
                <p className="mt-3 text-[13.5px] font-light leading-7 text-hanji-dim">
                  {todayGuide(dayNo)}
                </p>
              </div>
            )}

            {/* 사유의 방 */}
            <button
              onClick={() => setNotesOpen(true)}
              className="mt-10 flex items-center gap-2.5 border border-gold/40 px-7 py-3 text-[13px] tracking-[0.2em] text-hanji transition-colors hover:bg-gold/10"
            >
              <Banga className="h-[17px] w-[17px] text-gold-soft" />
              사유의 방 — 떠오르는 것을 적다
            </button>
          </>
        )}
      </section>

      {/* 체험 안내 — 아래에 붙어 한 걸음씩 이끈다 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/25 bg-ink-2/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-[12.5px] leading-6 text-hanji-dim sm:text-left">
            <span className="mr-2 text-[11px] tracking-[0.2em] text-gold-soft">
              체험
            </span>
            {GUIDE[step].text}
          </p>
          <button
            onClick={next}
            disabled={step === "writing" && !answer.trim()}
            className="btn-obang shrink-0 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
          >
            {GUIDE[step].action} →
          </button>
        </div>
      </div>

      {/* 사유의 방 서랍 — 체험용 (기록에 함께 남는다) */}
      {notesOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setNotesOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ink-3 bg-ink-2/95 backdrop-blur transition-transform duration-300 sm:w-[360px] ${
          notesOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-ink-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <Banga className="h-6 w-6 text-gold-soft" />
            <div className="text-left">
              <p className="text-[10px] tracking-[0.4em] text-hanji-faint">
                思惟之房
              </p>
              <h2 className="text-sm tracking-[0.2em] text-hanji">사유의 방</h2>
            </div>
          </div>
          <button
            onClick={() => setNotesOpen(false)}
            aria-label="닫기"
            className="p-2 text-hanji-dim transition-colors hover:text-hanji"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="flex flex-1 flex-col px-6 py-5 text-left">
          <p className="text-xs leading-6 text-hanji-faint">
            떠오르는 것을 적어 두십시오. 이 단상은 「{hwadu.title}」 화두에 묶여
            남습니다.
          </p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 문득 —"
            className="journal-area mt-4 flex-1"
          />
          <p className="mt-3 text-right text-[11px] text-hanji-faint">
            쓰는 대로 저장됩니다
          </p>
        </div>
      </aside>
    </div>
  );
}
