"use client";

// ────────────────────────────────────────────────────────────────
// 체험하기 — 실제 화면과 똑같이, 다만 시간이 클릭으로 흐른다.
// · 화두는 언제나 '이뭣고' 하나로 고정 (가장 유명한 입문 화두)
// · 튜토리얼이므로 지난 화두에는 저장되지 않는다
// · 사유의 방 메모도 여기서 함께 써 보고, 회향 시 답과 같이 남는다(안내만)
// · 카운트다운 문구는 단계가 바뀌어도 고정 — 화면이 흔들리지 않게
// ────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import Question from "@/components/Question";
import { Banga, Dharmachakra, Lotus } from "@/components/icons";
import { getHwadu, type Hwadu } from "@/lib/hwadu";
import { durationLabel, loadStore, saveStore } from "@/lib/store";
import { SLOGAN } from "@/lib/config";

const MAX_ANSWER = 500;

// 체험 대표 화두 — 성인은 '이뭣고(是甚麼)', 학생·어린이는 '나는 누구인가'
const TRY_ADULT_ID = "simsima";
const TRY_STUDENT_ID = "who-am-i";

type Step = "choose" | "received" | "pondering" | "ripened" | "writing" | "done";

// 걸음마다 뜨는 체험 안내
const GUIDE: Record<Step, string> = {
  choose: "먼저 화두를 받아 보십시오.",
  received:
    "화두를 받았습니다. 본래는 이대로 며칠이 흘러야 합니다 — 체험에서는 눌러서 건너뜁니다.",
  pondering: "사유의 시간입니다. 떠오르는 것은 사유의 방에 적어 둡니다.",
  ripened: "달이 찼습니다. 이제 붓을 들어 그대의 답을 씁니다.",
  writing: "정답은 없습니다. 지금 보이는 만큼만 쓰십시오.",
  done: "한 바퀴를 돌았습니다.",
};

const STEPS = ["화두를 받다", "사유하다", "달이 차오르다", "회향하다"];

// 앞뒤로 오가는 걸음 이름
const NAV: Partial<Record<Step, { prev: string; next: string }>> = {
  received: { prev: "처음으로", next: "사유의 시간을 갖다" },
  pondering: { prev: "화두를 받다", next: "시간이 흘렀다" },
  ripened: { prev: "사유하다", next: "붓을 들다" },
  writing: { prev: "달이 차오르다", next: "" },
};

export default function TryPage() {
  const [step, setStep] = useState<Step>("choose");
  const [hwadu, setHwadu] = useState<Hwadu | null>(null);
  const [audience, setAudience] = useState<"adult" | "student">("adult");
  const [days, setDays] = useState(3);
  const [notesOpen, setNotesOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [answer, setAnswer] = useState("");

  // 화두를 받는다 — 성인은 이뭣고, 학생·어린이는 '나는 누구인가'
  const receive = () => {
    const id = audience === "student" ? TRY_STUDENT_ID : TRY_ADULT_ID;
    setHwadu(getHwadu(id) ?? null);
    setStep("received");
  };

  const next = () => {
    if (step === "received") setStep("pondering");
    else if (step === "pondering") {
      setNotesOpen(false);
      setStep("ripened");
    } else if (step === "ripened") setStep("writing");
  };

  // 앞 걸음으로
  const prev = () => {
    if (step === "received") setStep("choose");
    else if (step === "pondering") setStep("received");
    else if (step === "ripened") setStep("pondering");
    else if (step === "writing") setStep("ripened");
  };

  // 회향 — 체험은 기록에 남기지 않는다 (튜토리얼)
  const finish = () => {
    if (!hwadu || !answer.trim()) return;
    // 첫 체험의 답은 지난 화두에 남긴다 — 단, 이뭣고 체험 기록이 이미 있으면 중복 저장하지 않는다
    const s = loadStore();
    const already = s.history.some((h) => h.hwaduId === hwadu.id);
    if (!already) {
      saveStore({
        ...s,
        history: [
          ...s.history,
          {
            hwaduId: hwadu.id,
            receivedAt: Date.now(),
            durationDays: days,
            notes: memo.trim() || undefined,
            journal: answer.trim(),
            journalAt: Date.now(),
          },
        ],
        received: s.received + 1,
      });
    }
    setStep("done");
  };

  const stepNo =
    step === "choose" || step === "received"
      ? 1
      : step === "pondering"
        ? 2
        : step === "ripened"
          ? 3
          : 4;

  const dayNo = step === "pondering" ? 2 : 1;

  // 자리만 있는 버튼 (헷갈리지 않게 안내만)
  const dead =
    "cursor-default border border-ink-3 px-5 py-2.5 text-xs tracking-[0.15em] text-hanji-faint opacity-60";

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 pb-16 pt-4 text-center">
      {/* ── 늘 위에 있는 체험 표시 ── */}
      <div className="w-full max-w-2xl">
        <p className="text-center text-[11px] tracking-[0.4em] text-gold-soft">
          體驗 · 체험하기
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < stepNo;
            const now = n === stepNo;
            return (
              <div key={label} className="flex items-center gap-2">
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
                {n < STEPS.length && (
                  <span className="text-hanji-faint">·</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      </div>

      {/* ── 1. 화두 받기 전 — 홈과 같은 화면 ── */}
      {step === "choose" && (
        <section className="rise mt-6 flex flex-col items-center">
          <Enso size={140} />
          <h1 className="text-obang rise rise-d1 mt-6 font-serif text-[42px] font-semibold leading-none tracking-[0.5em] [text-indent:0.5em]">
            화두
          </h1>
          <p className="rise rise-d1 mt-2.5 text-[10px] tracking-[0.6em] text-gold-soft">
            HWADU
          </p>
          <p className="rise rise-d1 mt-6 text-[13.5px] font-light tracking-[0.1em] text-hanji-dim">
            &ldquo;{SLOGAN}&rdquo;
          </p>
          <div className="rise rise-d2 my-10 flex items-center gap-3.5 opacity-80">
            <div className="h-px w-[110px] bg-gradient-to-r from-transparent to-gold/45" />
            <Dharmachakra className="h-[18px] w-[18px]" stroke="#B99A54" />
            <div className="h-px w-[110px] bg-gradient-to-r from-gold/45 to-transparent" />
          </div>
          <button
            onClick={receive}
            className="btn-obang rise rise-d2 inline-flex items-center gap-2.5 px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            <Lotus className="h-[18px] w-[18px]" stroke="#D9B45B" />
            <span>새 화두 받기</span>
          </button>

          {/* 누구의 화두인가 — 성인 / 학생·어린이 (홈과 같은 알약 스위치) */}
          <div className="rise rise-d3 mt-7 inline-flex rounded-full border border-ink-3 bg-ink-2 p-1 text-xs">
            {(
              [
                { key: "adult", label: "성인의 화두" },
                { key: "student", label: "학생·어린이" },
              ] as const
            ).map((o) => {
              const active = audience === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAudience(o.key)}
                  className={`rounded-full px-5 py-2 tracking-[0.1em] transition-colors ${
                    active
                      ? "bg-gold font-medium text-ink"
                      : "bg-transparent text-hanji-faint"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 회향을 마쳤다 ── */}
      {step === "done" && hwadu && (
        <section className="rise mt-10 flex w-full max-w-2xl flex-col items-center">
          {/* 화두 — 그대의 답 위에 */}
          {hwadu.hanja && (
            <p className="text-xs tracking-[0.6em] text-hanji-faint">
              {hwadu.hanja}
            </p>
          )}
          <div className="question-glow mt-5 w-full">
            <Question text={hwadu.question} className="text-hanji" />
          </div>

          <div className="mt-10 w-full border-t border-ink-3 pt-8" />
          <p className="text-xs tracking-[0.4em] text-gold-soft">
            回向 · 그대의 답
          </p>
          <p className="mt-5 whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
            {answer}
          </p>

          {/* 사유의 방에 적어 둔 단상도 함께 */}
          {memo.trim() && (
            <div className="mt-8 w-full max-w-xl border-t border-ink-3 pt-6 text-left">
              <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
                사유의 방에 적어 둔 단상
              </p>
              <p className="mt-3 whitespace-pre-line break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
                {memo}
              </p>
            </div>
          )}

          <div className="mt-12 w-full border-t border-ink-3 pt-10">
            <p className="text-xs tracking-[0.4em] text-hanji-faint">
              옛 스승들은 이렇게 일렀습니다
            </p>
          </div>
          <div className="mt-8 flex w-full max-w-xl flex-col gap-8 text-left">
            {hwadu.masters.map((m, i) => (
              <figure key={m.name + i}>
                <blockquote className="break-keep font-serif text-[15px] font-light leading-9 text-hanji">
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
              체험은 여기까지입니다. 이 답은 기록에 남지 않습니다.
              <br />본래의 화두는 며칠을 품은 뒤에야 붓을 들 수 있습니다.
            </p>
            <p className="mt-3 text-xs leading-6 text-hanji-faint">
              그때 사유의 방에 적어 둔 단상도 회향과 함께 지난 화두에 남습니다.
            </p>
            <Link
              href="/"
              className="btn-obang mt-8 inline-block px-10 py-3.5 font-serif text-[15px] tracking-[0.25em] text-hanji transition-opacity hover:opacity-90"
            >
              새 화두 받기
            </Link>
          </div>
        </section>
      )}

      {/* ── 2·3·4. 화두를 들고 있는 화면 — 실제와 똑같이 ── */}
      {hwadu && step !== "choose" && step !== "done" && (
        <section className="rise mt-3 flex w-full max-w-2xl flex-col items-center">
          {hwadu.hanja && (
            <p className="text-xs tracking-[0.6em] text-hanji-faint">
              {hwadu.hanja}
            </p>
          )}
          <div className="question-glow mt-4 w-full">
            <Question text={hwadu.question} max={42} className="text-hanji" />
          </div>
          {hwadu.context && (
            <p className="mt-4 text-xs tracking-wider text-hanji-faint">
              {hwadu.context}
            </p>
          )}

          {step === "writing" ? (
            /* 답을 쓰다 */
            <div className="mt-10 w-full max-w-xl">
              <div className="border-t border-ink-3 pt-7">
                <textarea
                  autoFocus
                  value={answer}
                  onChange={(e) =>
                    setAnswer(e.target.value.slice(0, MAX_ANSWER))
                  }
                  rows={8}
                  maxLength={MAX_ANSWER}
                  placeholder="며칠을 품고 계셨습니다. 무엇이 보였습니까."
                  className="journal-area"
                />
                <p className="mt-2 text-right text-[11px] text-hanji-faint">
                  {answer.length} / {MAX_ANSWER}
                </p>
                {/* 회향하다 — 글자수 아래 */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={prev}
                    className="border border-ink-3 px-5 py-2.5 text-[12.5px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                  >
                    ← {NAV.writing!.prev}
                  </button>
                  <button
                    onClick={finish}
                    disabled={!answer.trim()}
                    className="btn-obang px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
                  >
                    회향하다
                  </button>
                </div>
                <p className="mt-3 text-left text-[11px] leading-5 text-hanji-faint">
                  실제 화두에서는 회향할 때, 사유의 방에 적어 둔 단상도
                  <br />그대의 답과 함께 지난 화두에 저장됩니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 함께 드는 이들 */}
              <p className="mt-4 text-[12px] tracking-wide text-gold-soft">
                이 물음을 든 사람은, 지금 그대뿐입니다
              </p>

              {/* 달 + 카운트다운 — 문구 고정(흔들리지 않게) */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-[13.5px] font-light tracking-wide text-hanji-dim">
                <span className="moon" />
                {step === "ripened" ? (
                  <span>달이 차올랐습니다. 이제 답을 쓸 수 있습니다</span>
                ) : (
                  <span>
                    달이 차오르는 {durationLabel(days)} 뒤, 답을 쓸 수 있습니다
                    ·{" "}
                    <span className="tabular-nums text-hanji">
                      {days}일 00시간 00분 00초
                    </span>{" "}
                    남음
                  </span>
                )}
              </div>

              {/* 체험 안내 — 남은 시간 바로 아래. 두 줄 고정 높이 */}
              <p className="mt-3 flex min-h-[2.75rem] max-w-md items-start justify-center break-keep text-[12.5px] leading-6 text-gold-soft">
                <span className="mr-1.5 shrink-0 text-[11px] tracking-[0.2em]">
                  체험 ·
                </span>
                <span>{GUIDE[step]}</span>
              </p>

              <p className="mt-2 text-xs leading-6 tracking-[0.04em] text-hanji-faint">
                서두르지 마십시오. 질문에는 정답이 없습니다.
                <br />
                생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는
                힘이 중요합니다.
              </p>

              {/* 걸음 옮기기 — 앞뒤로 오갈 수 있게 */}
              {NAV[step] && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    onClick={prev}
                    className="border border-ink-3 px-5 py-2.5 text-[12.5px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                  >
                    ← {NAV[step]!.prev}
                  </button>
                  <button
                    onClick={next}
                    className="btn-obang px-7 py-2.5 text-[12.5px] tracking-[0.15em] text-hanji transition-opacity hover:opacity-90"
                  >
                    {NAV[step]!.next} →
                  </button>
                </div>
              )}

              {/* 오늘의 참구법 — 사유 단계에서만 */}
              {step === "pondering" && (
                <div className="mt-8 w-full max-w-md border border-ink-3 bg-ink-2/50 px-6 py-5">
                  <p className="text-[11px] tracking-[0.34em] text-gold-soft">
                    오늘의 참구법 · {dayNo}일째
                  </p>
                  <p className="mt-3 break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
                    떠오르는 생각을 좇지 말고, 오직 &lsquo;이뭣고&rsquo; 한
                    마디로 돌아오십시오.
                  </p>
                </div>
              )}

              {/* 기간 바꾸기 — 사유 단계에서만 */}
              {step === "pondering" && (
                <div className="mt-7">
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    {[1, 3, 7, 21, 108].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`border px-4 py-2 text-xs tracking-[0.15em] transition-colors ${
                          days === d
                            ? "border-gold/60 text-gold"
                            : "border-ink-3 text-hanji-dim hover:text-hanji"
                        }`}
                      >
                        {durationLabel(d)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 사유의 방 — 접었다 폈다 (체험 전용) */}
              {step !== "ripened" && (
                <button
                  onClick={() => setNotesOpen((v) => !v)}
                  className={`mt-10 flex items-center gap-2.5 border px-7 py-3 text-[13px] tracking-[0.2em] transition-colors ${
                    notesOpen
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-gold/40 text-hanji hover:bg-gold/10"
                  }`}
                >
                  <Banga className="h-[17px] w-[17px] text-gold-soft" />
                  {notesOpen
                    ? "사유의 방 — 접기"
                    : "사유의 방 — 떠오르는 것을 적다"}
                </button>
              )}

              {/* 자리만 있는 버튼들 + 내려놓다(활성) */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <span className={dead}>선지식의 한마디</span>
                <span className={dead}>나도 화두 던지기</span>
              </div>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "이 화두를 내려놓으시겠습니까?\n체험이 처음으로 돌아갑니다."
                    )
                  ) {
                    setHwadu(null);
                    setNotesOpen(false);
                    setMemo("");
                    setAnswer("");
                    setDays(3);
                    setStep("choose");
                  }
                }}
                className="mt-10 border border-ink-3 px-7 py-2.5 text-xs tracking-[0.15em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
              >
                이 화두를 내려놓다
              </button>
            </>
          )}
        </section>
      )}

      {/* ── 사유의 방 서랍 (체험 전용 — 진짜 기록과 무관) ── */}
      {notesOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setNotesOpen(false)}
        />
      )}
      <aside
        aria-hidden={!notesOpen}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ink-3 bg-ink-2/95 backdrop-blur transition-transform duration-300 sm:w-[380px] ${
          notesOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between border-b border-ink-3 px-6 py-5">
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

        {hwadu && (
          <div className="border-b border-ink-3 px-6 py-4 text-left">
            <p className="text-[10px] tracking-[0.3em] text-hanji-faint">
              지금의 화두
            </p>
            <p className="mt-2 break-keep font-serif text-sm font-light leading-7 text-hanji">
              {hwadu.question.replace(/\n+/g, " ")}
            </p>
          </div>
        )}

        <div className="flex flex-1 flex-col px-6 py-5 text-left">
          <p className="text-xs leading-6 text-hanji-faint">
            떠오르는 것을 적어 두십시오. 답이 아니라 발자국입니다.
            <br />여기 적은 단상은 회향할 때 답과 함께 남습니다.
          </p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 문득 —"
            className="journal-area mt-4 h-[34vh] min-h-[180px]"
          />
          <p className="mt-3 text-right text-[11px] text-hanji-faint">
            적는 대로 저장됩니다
          </p>
        </div>
      </aside>
    </div>
  );
}
