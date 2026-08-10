"use client";

// ─────────────────────────────────────────────────────────────
// 체험하기 — 실제 화면과 똑같이, 다만 시간이 클릭으로 흐른다.
// · 위에는 늘 "체험하기 · 1 2 3 4" 단계가 있어 튜토리얼임을 알린다
// · 화두 받기 전 화면부터 시작해 성인/학생을 고르고 받는다
// · 사유의 방·기간 바꾸기는 실제로 작동(단, 진짜 기록과는 무관)
// · 선지식·화두 던지기·내려놓다는 자리만 (헷갈리지 않게 눌러도 안 움직임)
// · 회향을 마치면 지난 화두에 한 편이 남는다
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import Question from "@/components/Question";
import { Banga, Dharmachakra } from "@/components/icons";
import { HWADU_BANK, type Hwadu } from "@/lib/hwadu";
import { durationLabel, loadStore, saveStore } from "@/lib/store";
import { todayGuide } from "@/lib/guidance";
import { SLOGAN } from "@/lib/config";

const MAX_ANSWER = 500;
const DAY_OPTIONS = [1, 3, 7, 21, 108];
const DAY_NOTE: Record<number, string> = {
  1: "하루 — 첫걸음",
  3: "사흘 — 삼일기도의 리듬",
  7: "이레 — 칠일 용맹정진",
  21: "삼칠일 — 세 이레, 회향의 단위",
  108: "백팔일 — 백팔번뇌를 마주하는 가장 깊은 참구",
};

type Step = "choose" | "received" | "pondering" | "ripened" | "writing" | "done";

// 걸음마다 뜨는 체험 안내 — 남은 시간 바로 아래에 놓인다
const GUIDE: Record<Step, string> = {
  choose: "먼저 누구의 화두를 받을지 고르고, 화두를 받아 보십시오.",
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
  received: { prev: "화두 다시 받기", next: "사유의 시간을 갖다" },
  pondering: { prev: "화두를 받다", next: "시간이 흘렀다" },
  ripened: { prev: "사유하다", next: "붓을 들다" },
  writing: { prev: "달이 차오르다", next: "" },
};

export default function TryPage() {
  const [step, setStep] = useState<Step>("choose");
  const [audience, setAudience] = useState<"adult" | "student">("adult");
  const [hwadu, setHwadu] = useState<Hwadu | null>(null);
  const [days, setDays] = useState(3);
  const [notesOpen, setNotesOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memo, setMemo] = useState("");
  const [answer, setAnswer] = useState("");
  const [startedAt] = useState(() => Date.now());

  // 화면 크기에 따라 몸이 흔들리지 않도록, 받을 때 한 번만 고른다
  const receive = () => {
    const pool = HWADU_BANK.filter((h) =>
      audience === "student"
        ? h.audience === "student" || h.forStudent
        : h.audience !== "student"
    );
    setHwadu(pool[Math.floor(Math.random() * pool.length)]);
    setStep("received");
  };

  const next = () => {
    if (step === "received") setStep("pondering");
    else if (step === "pondering") {
      setNotesOpen(false);
      setStep("ripened");
    } else if (step === "ripened") setStep("writing");
  };

  // 앞 걸음으로 — 되돌아가며 다시 볼 수 있게
  const prev = () => {
    if (step === "received") setStep("choose");
    else if (step === "pondering") setStep("received");
    else if (step === "ripened") setStep("pondering");
    else if (step === "writing") setStep("ripened");
  };

  // 회향 — 지난 화두에 남긴다
  const finish = () => {
    if (!hwadu || !answer.trim()) return;
    const s = loadStore();
    saveStore({
      ...s,
      history: [
        ...s.history,
        {
          hwaduId: hwadu.id,
          receivedAt: startedAt,
          durationDays: days,
          notes: memo.trim() || undefined,
          journal: answer.trim(),
          journalAt: Date.now(),
        },
      ],
      received: s.received + 1,
    });
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
    <div className="relative flex flex-1 flex-col items-center px-6 pb-20 pt-10 text-center">
      {/* ── 늘 위에 있는 체험 표시 ── */}
      <div className="w-full max-w-2xl">
        <p className="text-center text-[11px] tracking-[0.4em] text-gold-soft">
          體驗 · 체험하기
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
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
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      </div>

      {/* ── 1. 화두 받기 전 — 뜰과 같은 화면 ── */}
      {step === "choose" && (
        <section className="rise mt-10 flex flex-col items-center">
          <Enso size={130} />
          <h1 className="text-obang mt-6 font-serif text-[40px] font-semibold leading-none tracking-[0.5em] [text-indent:0.5em]">
            화두
          </h1>
          <p className="mt-2.5 text-[10px] tracking-[0.6em] text-gold-soft">
            HWADU
          </p>
          <p className="mt-6 text-[13.5px] font-light tracking-[0.1em] text-hanji-dim">
            &ldquo;{SLOGAN}&rdquo;
          </p>
          <div className="my-9 flex items-center gap-3.5 opacity-80">
            <div className="h-px w-[100px] bg-gradient-to-r from-transparent to-gold/45" />
            <Dharmachakra className="h-[18px] w-[18px]" stroke="#B99A54" />
            <div className="h-px w-[100px] bg-gradient-to-r from-gold/45 to-transparent" />
          </div>
          <button
            onClick={receive}
            className="btn-obang px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            새 화두 받기
          </button>
          <div className="mt-7 inline-flex rounded-full border border-ink-3 bg-ink-2 p-1 text-xs">
            {(
              [
                { key: "adult", label: "성인의 화두" },
                { key: "student", label: "학생·어린이" },
              ] as const
            ).map((o) => (
              <button
                key={o.key}
                onClick={() => setAudience(o.key)}
                className={`rounded-full px-5 py-2 tracking-[0.1em] transition-colors ${
                  audience === o.key
                    ? "bg-gold font-medium text-ink"
                    : "bg-transparent text-hanji-faint"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 회향을 마쳤다 ── */}
      {step === "done" && hwadu && (
        <section className="rise mt-10 flex w-full max-w-2xl flex-col items-center">
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
              이 회향은{" "}
              <Link
                href="/archive"
                className="text-gold-soft underline decoration-gold/30 underline-offset-4"
              >
                지난 화두
              </Link>
              에 기록으로 남았습니다.
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

      {/* ── 2·3·4. 화두를 들고 있는 화면 — 실제와 똑같이 ── */}
      {hwadu && step !== "choose" && step !== "done" && (
        <section className="rise mt-10 flex w-full max-w-2xl flex-col items-center">
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
                <p className="mt-3 text-left text-[11px] text-hanji-faint">
                  기록은 이 브라우저에만 남습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 함께 드는 이들 */}
              <p className="mt-5 text-[12px] tracking-wide text-gold-soft">
                이 물음을 든 사람은, 지금 그대뿐입니다
              </p>

              {/* 달 + 카운트다운 */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-[13.5px] font-light tracking-wide text-hanji-dim">
                <span className="moon" />
                {step === "ripened" ? (
                  <span>달이 차올랐습니다. 이제 답을 쓸 수 있습니다</span>
                ) : (
                  <span>
                    달이 차오르는 {durationLabel(days)} 뒤, 답을 쓸 수 있습니다
                    ·{" "}
                    <span className="tabular-nums text-hanji">
                      {step === "received"
                        ? "2일 23시간 59분 12초"
                        : "1일 04시간 21분 08초"}
                    </span>{" "}
                    남음
                  </span>
                )}
              </div>

              {/* 체험 안내 — 남은 시간 바로 아래 */}
              <p className="mt-4 max-w-md break-keep text-[12.5px] leading-6 text-gold-soft">
                <span className="mr-1.5 text-[11px] tracking-[0.2em]">
                  체험 ·
                </span>
                {GUIDE[step]}
              </p>

              <p className="mt-4 text-xs leading-6 tracking-[0.04em] text-hanji-faint">
                서두르지 마십시오. 질문에는 정답이 없습니다.
                <br />
                생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는
                힘이 중요합니다.
              </p>

              {/* 걸음 옮기기 — 앞뒤로 오갈 수 있게 */}
              {NAV[step] && (
                <div className="mt-6 flex items-center justify-center gap-3">
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

              {/* 오늘의 참구법 */}
              {step !== "ripened" && (
                <div className="mt-8 w-full max-w-md border border-ink-3 bg-ink-2/50 px-6 py-5">
                  <p className="text-[11px] tracking-[0.34em] text-gold-soft">
                    오늘의 참구법 · {dayNo}일째
                  </p>
                  <p className="mt-3 break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
                    {todayGuide(dayNo)}
                  </p>
                </div>
              )}

              {/* 기간 바꾸기 — 실제 화두와 같은 포맷 */}
              {step !== "ripened" && (
                <div className="mt-7">
                  {showSettings ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        {DAY_OPTIONS.map((d) => (
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
                      <p className="text-[11px] tracking-wide text-hanji-faint">
                        {DAY_NOTE[days] ?? ""}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-xs tracking-widest text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors hover:text-hanji-dim"
                    >
                      기간 바꾸기
                    </button>
                  )}
                </div>
              )}

              {/* 붓을 들다 — 달이 찬 뒤에만 */}
              {step === "ripened" && (
                <button
                  onClick={() => setStep("writing")}
                  className="btn-obang mt-9 px-10 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
                >
                  붓을 들다
                </button>
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

              {/* 자리만 있는 버튼들 */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <span className={dead}>선지식의 한마디</span>
                <span className={dead}>나도 화두 던지기</span>
              </div>
              <span className={`${dead} mt-10 px-7`}>이 화두를 내려놓다</span>
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
          </p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 문득 —"
            className="journal-area mt-4 flex-1"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-hanji-faint">
              쓰는 대로 저절로 저장됩니다
            </span>
            <span className="cursor-default border border-ink-3 px-4 py-1.5 text-[11px] tracking-[0.2em] text-hanji-faint opacity-60">
              임시 저장
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
