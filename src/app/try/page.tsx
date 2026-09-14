"use client";

// ────────────────────────────────────────────────────────────────
// 체험하기 — 실제 화면과 똑같이, 다만 시간이 클릭으로 흐른다.
// · 화두는 언제나 '이뭣고' 하나로 고정 (가장 유명한 입문 화두)
// · 회향을 마치면 이 한 편도 지난 화두에 남는다
// · 다만 id 앞에 try: 를 붙인다 — 실제 화두 뽑기의 '지나온 화두 제외'와
//   섞이지 않게. 체험 한 번으로 '이뭣고'를 영영 못 받으면 안 된다.
// · 사유의 방 메모도 여기서 함께 써 보고, 회향 시 답과 같이 남는다
// · 카운트다운 문구는 단계가 바뀌어도 고정 — 화면이 흔들리지 않게
//
// [리뉴얼 메모 — 왜 이렇게 고쳤나]
// · 첫인상이 여기서 갈린다. 물음이 화면에서 가장 큰 것이 되어야 해서,
//   머리글의 네 겹(한자 + 번호칩 넷 + 이름 넷 + 구분선)을 진행 고리 하나와
//   지금 걸음 이름 하나, 두 겹으로 줄였다. 걸음 이름 넷은 지운 게 아니라
//   진행 막대의 sr-only 로 옮겼다 — 스크린리더에는 그대로 읽힌다.
// · 간화선 지침과 선사 어록은 한 글자도 줄이지 않았다. <details> 로
//   접기만 했다 — 펼치면 예전 그대로다.
// · 기다림이 이 수행의 핵심 경험이라, 남은 날을 68px 숫자로 세웠다.
//   설명을 줄인 자리를 숫자와 여백이 대신 채운다.
// ────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import Question from "@/components/Question";
import { Banga, Dharmachakra, Lotus } from "@/components/icons";
import { getHwadu, type Hwadu } from "@/lib/hwadu";
import { durationLabel, loadStore, saveStore } from "@/lib/store";
import { useConfirm } from "@/components/Confirm";
import { SLOGAN } from "@/lib/config";
import { shareAnswer } from "@/lib/community";

const MAX_ANSWER = 500;

// 나눔 물음창의 작은 안내 — 공유하면 무엇이 일어나는지
const SHARE_NOTE =
  "공유한 답은 검수를 거쳐, 공유한 그때의 글로 보입니다. 지난 화두에서 고쳐 써도 공유된 답은 바뀌지 않습니다.";

// 체험 대표 화두 — 성인은 '이뭣고(是甚麼)', 학생·어린이는 '나는 누구인가'
const TRY_ADULT_ID = "simsima";
const TRY_STUDENT_ID = "st-lie";

type Step = "choose" | "received" | "pondering" | "ripened" | "writing" | "done";

// 걸음마다 뜨는 체험 안내 — 뜻은 그대로 두고 문장만 짧게 다시 썼다.
// 이 자리는 두 줄 고정이라 길면 화면이 흔들린다.
const GUIDE: Record<Step, string> = {
  choose: "먼저 화두를 받아 보세요.",
  received: "본래는 며칠이 흘러야 합니다 — 체험에서는 눌러서 건너뜁니다.",
  pondering: "떠오르는 것은 사유의 방에 적어 두세요. 답과 함께 남습니다.",
  // '달이 찼다'는 말은 위 카드가 큰 글씨로 이미 하고 있다 — 여기선 할 일만
  ripened: "이제 붓을 들어 답을 씁니다.",
  writing: "정답은 없습니다. 지금 보이는 만큼만 써 보세요.",
  done: "한 바퀴를 돌았습니다.",
};

const STEPS = ["화두를 받다", "사유하다", "달이 차오르다", "회향하다"];

// 진행 고리의 둘레 — strokeDasharray 로 걸음만큼만 칠한다
const RING = 2 * Math.PI * 17;

// 앞뒤로 오가는 걸음 이름
const NAV: Partial<Record<Step, { prev: string; next: string }>> = {
  received: { prev: "처음으로", next: "사유의 시간을 갖다" },
  pondering: { prev: "화두를 받다", next: "시간이 흘렀다" },
  ripened: { prev: "사유하다", next: "붓을 들다" },
  writing: { prev: "달이 차오르다", next: "" },
};

// 접기 머리 — 브라우저 기본 삼각형을 지우고 우리 화살표를 쓴다
const SUMMARY =
  "flex cursor-pointer list-none items-center gap-2 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:text-hanji [&::-webkit-details-marker]:hidden";

// 접기 화살표 — 이모지 대신 직접 그린다
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function TryPage() {
  const confirm = useConfirm();
  const [step, setStep] = useState<Step>("choose");
  // 이번 회향이 서고에 실제로 남았는지 (체험은 첫 한 편만 남는다)
  const [kept, setKept] = useState(true);
  const [hwadu, setHwadu] = useState<Hwadu | null>(null);
  const [audience, setAudience] = useState<"adult" | "student">("adult");
  const [days, setDays] = useState(3);
  const [notesOpen, setNotesOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [answer, setAnswer] = useState("");
  // 나눔에 부쳤는지 — 회향 화면에 조용히 알린다
  const [shareDone, setShareDone] = useState(false);
  // 나눔에 부치지 못했을 때의 안내
  const [shareError, setShareError] = useState("");

  // 화두를 받는다 — 성인은 이뭣고, 학생·어린이는 '나는 누구인가'
  const receive = () => {
    const id = audience === "student" ? TRY_STUDENT_ID : TRY_ADULT_ID;
    setHwadu(getHwadu(id) ?? null);
    setShareDone(false);
    setShareError("");
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

  // 회향 — 체험은 '첫 기록' 한 편만 서고에 남긴다.
  // id 는 `try:이뭣고` 처럼 접두를 붙여, 실제 화두 뽑기가 이 화두를 지나온 것으로
  // 여기지 않게 한다. 물음 본문은 customQuestion 에 함께 담아 서고에서 그대로 읽힌다.
  // 두 번째부터는 몇 번을 더 돌아도 기록이 쌓이지 않는다.
  const finish = async () => {
    if (!hwadu || !answer.trim()) return;
    const s = loadStore();
    // 체험은 '이뭣고' 한 판만 남긴다 — 이미 있으면 절대 늘리지 않는다
    const alreadyTried = s.history.some(
      (h) => h.hwaduId.startsWith("try:") || h.hwaduId === hwadu.id
    );
    if (!alreadyTried) {
      saveStore({
        ...s,
        history: [
          ...s.history,
          {
            hwaduId: `try:${hwadu.id}`,
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
    setKept(!alreadyTried);
    setShareDone(false);
    setShareError("");
    setStep("done");
    // 회향을 마치자마자 — 홈과 같은 나눔의 물음. 체험이어도 답은 진짜 나눔으로 흐른다
    const ok = await confirm(
      "이 답을 다른 수행자에게 공유하시겠습니까?",
      `이름 없이 — 다른 수행자의 화두를 돕습니다. ${SHARE_NOTE}`,
      { confirm: "네", cancel: "아니오" }
    );
    if (ok) {
      // try: 접두를 벗겨 실제 화두 id로 보낸다 — 같은 화두를 회향한 이들에게 닿게.
      // 부치는 데까지 기다린다 — 성공했을 때만 성공 문구를 보인다
      try {
        await shareAnswer(hwadu.id.replace(/^try:/, ""), answer.trim());
        setShareDone(true);
      } catch {
        setShareError(
          "나눔에 부치지 못했습니다 — 잠시 후 다시 시도해 주세요."
        );
      }
    }
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
    "cursor-default rounded-full border border-ink-3 px-4 py-1.5 text-[11px] tracking-[0.12em] text-hanji-faint opacity-60";

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 pb-16 pt-5 text-center md:pb-10 md:pt-10">
      {/* ── 늘 위에 있는 진행 고리 — 네 걸음 중 몇째인지 한눈에 ── */}
      <header className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3.5">
          <div className="relative h-11 w-11 shrink-0">
            <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                className="text-ink-3"
              />
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                stroke="currentColor"
                className="text-gold"
                strokeDasharray={`${(stepNo / STEPS.length) * RING} ${RING}`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-serif text-[15px] font-light tabular-nums text-gold">
              {stepNo}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[10px] tracking-[0.42em] text-gold-soft">體驗</p>
            <p className="mt-0.5 text-[14px] tracking-[0.12em] text-hanji">
              {STEPS[stepNo - 1]}
            </p>
          </div>
        </div>

        {/* 걸음 막대 — 이름 넷은 지우지 않고 스크린리더에 그대로 남긴다 */}
        <ol
          className="mt-4 flex items-center gap-1.5"
          aria-label="체험의 네 걸음"
        >
          {STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i + 1 === stepNo ? "step" : undefined}
              className={`h-[5px] flex-1 rounded-full transition-colors ${
                i + 1 <= stepNo ? "bg-gold" : "bg-ink-3"
              }`}
            >
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
      </header>

      {/* ── 1. 화두 받기 전 — 홈과 같은 화면 ── */}
      {step === "choose" && (
        <section className="rise mt-12 flex flex-col items-center">
          <Enso size={136} />
          <h1 className="text-obang rise rise-d1 mt-7 font-serif text-[46px] font-semibold leading-none tracking-[0.5em] [text-indent:0.5em]">
            화두
          </h1>
          <p className="rise rise-d1 mt-3 text-[10px] tracking-[0.6em] text-gold-soft">
            HWADU
          </p>
          <p className="rise rise-d1 mt-7 max-w-xs break-keep text-[13.5px] font-light leading-7 tracking-[0.06em] text-hanji-dim">
            &ldquo;{SLOGAN}&rdquo;
          </p>

          <div className="rise rise-d2 my-9 flex items-center gap-3.5 opacity-80">
            <div className="h-px w-[90px] bg-gradient-to-r from-transparent to-gold/45" />
            <Dharmachakra className="h-[18px] w-[18px]" stroke="#B99A54" />
            <div className="h-px w-[90px] bg-gradient-to-r from-gold/45 to-transparent" />
          </div>

          {/* 누구의 화두인가 — 고르고 나서 받는다 (홈과 같은 알약 스위치) */}
          <div className="rise rise-d2 inline-flex rounded-full border border-ink-3 bg-ink-2 p-1 text-xs">
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

          <button
            onClick={receive}
            className="btn-obang rise rise-d3 mt-6 inline-flex items-center gap-2.5 px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            <Lotus className="h-[18px] w-[18px]" stroke="#D9B45B" />
            <span>새 화두 받기</span>
          </button>
        </section>
      )}

      {/* ── 회향을 마쳤다 ── */}
      {step === "done" && hwadu && (
        <section className="rise mt-10 flex w-full max-w-2xl flex-col items-center">
          {/* 화두 — 나의 답 위에. 한자는 금테 뱃지 하나로 */}
          {hwadu.hanja && (
            <span className="rounded-full border border-gold/35 px-4 py-1 text-[11px] tracking-[0.35em] text-gold-soft [text-indent:0.35em]">
              {hwadu.hanja}
            </span>
          )}
          <div className="question-glow mt-6 w-full">
            <Question text={hwadu.question} className="text-hanji" />
          </div>

          {/* 나의 답 — 카드 하나에 하나만 */}
          <div className="mt-10 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-7 text-left">
            <p className="text-[11px] tracking-[0.4em] text-gold-soft">
              回向 · 나의 답
            </p>
            <p className="mt-4 whitespace-pre-line break-keep font-serif text-[15px] font-light leading-9 text-hanji">
              {answer}
            </p>
            {shareDone && (
              <p className="mt-5 text-[12.5px] leading-6 text-gold-soft">
                나눔에 부쳤습니다. 도량에서 살펴본 뒤 다른 수행자에게 열립니다.
              </p>
            )}
            {shareError && (
              <p className="mt-5 text-[12.5px] leading-6 text-vermilion">
                {shareError}
              </p>
            )}
          </div>

          {/* 사유의 방에 적어 둔 단상 — 지우지 않고 접어 둔다 */}
          {memo.trim() && (
            <details className="group mt-3 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-4 text-left">
              <summary className={SUMMARY}>
                <span>사유의 방에 적어 둔 단상</span>
                <span className="ml-auto">
                  <Chevron />
                </span>
              </summary>
              <p className="mt-4 whitespace-pre-line break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
                {memo}
              </p>
            </details>
          )}

          {/* 옛 스승들의 말 — 한 글자도 줄이지 않고 접기만 했다 */}
          <details className="group mt-3 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-4 text-left">
            <summary className={SUMMARY}>
              <span>옛 스승들은 이렇게 일렀습니다</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-hanji-faint">
                  {hwadu.masters.length}
                </span>
                <Chevron />
              </span>
            </summary>
            <div className="mt-6 flex flex-col gap-8">
              {hwadu.masters.map((m, i) => (
                <figure key={m.name + i}>
                  <blockquote className="break-keep font-serif text-[15px] font-light leading-9 text-hanji">
                    {m.text}
                  </blockquote>
                  <figcaption className="mt-3 text-right text-xs tracking-widest text-hanji-dim">
                    — {m.name}
                    {m.era && (
                      <span className="text-hanji-faint"> · {m.era}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </details>

          <div className="mt-12 w-full border-t border-ink-3 pt-8">
            <p className="text-[13px] leading-7 text-hanji-dim">
              {kept ? (
                <>
                  이 체험은{" "}
                  <Link
                    href="/archive"
                    className="text-gold-soft underline decoration-gold/30 underline-offset-4"
                  >
                    지난 화두
                  </Link>
                  에 첫 기록으로 남았습니다.
                </>
              ) : (
                <>
                  첫 기록은 이미{" "}
                  <Link
                    href="/archive"
                    className="text-gold-soft underline decoration-gold/30 underline-offset-4"
                  >
                    지난 화두
                  </Link>
                  에 있습니다 — 이번 것은 따로 쌓지 않았습니다.
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] leading-6 text-hanji-faint">
              본래의 화두는 며칠을 품은 뒤에야 붓을 들 수 있습니다.
              {memo.trim()
                ? " 사유의 방 단상도 답과 함께 남았습니다."
                : " 사유의 방 단상도 회향과 함께 남습니다."}
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
        <section className="rise mt-9 flex w-full max-w-2xl flex-col items-center">
          {/* 한자 뱃지 — 금테 안에 화두의 한자 */}
          {hwadu.hanja && (
            <span className="rounded-full border border-gold/35 px-4 py-1 text-[11px] tracking-[0.35em] text-gold-soft [text-indent:0.35em]">
              {hwadu.hanja}
            </span>
          )}
          <div className="question-glow mt-6 w-full">
            <Question text={hwadu.question} max={52} className="text-hanji" />
          </div>
          {hwadu.context && (
            <p className="mt-4 max-w-md break-keep text-xs leading-6 tracking-wider text-hanji-faint">
              {hwadu.context}
            </p>
          )}

          {step === "writing" ? (
            /* 답을 쓰다 — AI 채팅 포맷 */
            <div className="mt-9 w-full max-w-xl">
              {/* 안내 말풍선 */}
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-2/60 px-4 py-3">
                  <p className="text-left text-[12.5px] leading-6 text-hanji-dim">
                    며칠을 품고 계셨습니다. 무엇이 보였습니까.
                    <br />아래에 답을 적어, 회향해 보세요.
                  </p>
                </div>
              </div>
              {/* 하단 입력줄 — 채팅처럼 */}
              <div className="mt-6 flex items-end gap-2">
                <button
                  onClick={prev}
                  aria-label={NAV.writing?.prev}
                  className="shrink-0 pb-2 text-[11px] tracking-wider text-hanji-faint transition-colors hover:text-hanji-dim"
                >
                  ←
                </button>
                <textarea
                  autoFocus
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value.slice(0, MAX_ANSWER));
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  rows={3}
                  maxLength={MAX_ANSWER}
                  placeholder="여기에 답을 적어 주세요…"
                  className="max-h-[60vh] min-h-[96px] flex-1 resize-none overflow-hidden rounded-2xl border border-ink-3 bg-ink-2/60 px-4 py-3 text-left text-[15px] leading-7 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/40"
                />
                <button
                  onClick={finish}
                  disabled={!answer.trim()}
                  className="btn-obang shrink-0 rounded-full px-5 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
                >
                  회향
                </button>
              </div>
              {/* 단상이 함께 남는다는 안내는 사유의 방 안에 온전히 있다 — 여기선 한 마디만 */}
              <p className="mt-2 text-right text-[10px] tabular-nums text-hanji-faint">
                {answer.length} / {MAX_ANSWER} · 단상도 함께 남습니다
              </p>
            </div>
          ) : (
            <>
              {/* 남은 날 — 기다림이 이 수행의 핵심이라 가장 크게 세운다 */}
              <div className="mt-8 w-full max-w-sm rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-7">
                {step === "ripened" ? (
                  <>
                    <span className="moon mx-auto block" />
                    <p className="mt-5 font-serif text-[24px] font-light leading-none text-hanji">
                      달이 차올랐습니다
                    </p>
                    <p className="mt-3 text-[12.5px] tracking-wide text-hanji-dim">
                      이제 답을 쓸 수 있습니다
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-2.5">
                      <span className="font-serif text-[68px] font-light leading-none tabular-nums text-hanji">
                        {days}
                      </span>
                      <span className="text-[13px] tracking-[0.2em] text-hanji-dim">
                        일 남음
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] font-light tracking-wide text-hanji-dim">
                      <span className="moon" />
                      <span>
                        달이 차오르는 {durationLabel(days)} 뒤, 답을 쓸 수
                        있습니다
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] tabular-nums tracking-[0.14em] text-hanji-faint">
                      {days}일 00시간 00분 00초
                    </p>
                  </>
                )}
              </div>

              {/* 함께 드는 이들 */}
              <p className="mt-4 text-[12px] tracking-wide text-gold-soft">
                이 물음을 든 사람은, 지금 그대뿐입니다
              </p>

              {/* 체험 안내 — 두 줄 고정 높이(화면이 흔들리지 않게) */}
              <p className="mt-3 flex min-h-[2.75rem] max-w-md items-start justify-center break-keep text-[12.5px] leading-6 text-gold-soft">
                <span className="mr-1.5 shrink-0 text-[11px] tracking-[0.2em]">
                  체험 ·
                </span>
                <span>{GUIDE[step]}</span>
              </p>

              {/* 걸음 옮기기 — 앞뒤로 오갈 수 있게 */}
              {NAV[step] && (
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={prev}
                    className="rounded-full border border-ink-3 px-5 py-2.5 text-[12.5px] tracking-[0.12em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                  >
                    ← {NAV[step]!.prev}
                  </button>
                  <button
                    onClick={next}
                    className="btn-obang px-7 py-2.5 text-[12.5px] tracking-[0.12em] text-hanji transition-opacity hover:opacity-90"
                  >
                    {NAV[step]!.next} →
                  </button>
                </div>
              )}

              {/* 오늘의 참구법 — 사유 단계에서만 */}
              {step === "pondering" && (
                <div className="mt-9 w-full max-w-md rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-5">
                  <p className="text-[11px] tracking-[0.34em] text-gold-soft">
                    오늘의 참구법 · {dayNo}일째
                  </p>
                  <p className="mt-3 break-keep text-[13.5px] font-light leading-7 text-hanji-dim">
                    떠오르는 생각을 좇지 말고, 오직 &lsquo;이뭣고&rsquo; 한
                    마디로 돌아오세요.
                  </p>
                </div>
              )}

              {/* 기간 바꾸기 — 사유 단계에서만 */}
              {step === "pondering" && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {[1, 3, 7, 21, 108].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      aria-pressed={days === d}
                      className={`rounded-full border px-4 py-1.5 text-[11.5px] tracking-[0.12em] transition-colors ${
                        days === d
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : "border-ink-3 text-hanji-dim hover:text-hanji"
                      }`}
                    >
                      {durationLabel(d)}
                    </button>
                  ))}
                </div>
              )}

              {/* 사유의 방 — 접었다 폈다 (체험 전용) */}
              {step !== "ripened" && (
                <button
                  onClick={() => setNotesOpen((v) => !v)}
                  className={`mt-9 flex items-center gap-2.5 rounded-full border px-7 py-3 text-[13px] tracking-[0.18em] transition-colors ${
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

              {/* 간화선 지침 — 한 글자도 줄이지 않고 접기만 했다 */}
              <details className="group mt-8 w-full max-w-md">
                <summary className={`${SUMMARY} justify-center`}>
                  <span>참구하는 법</span>
                  <Chevron />
                </summary>
                <p className="mt-4 break-keep text-xs leading-6 tracking-[0.04em] text-hanji-faint">
                  서두르지 마세요. 질문에는 정답이 없습니다.
                  <br />
                  생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는
                  힘이 중요합니다.
                </p>
              </details>

              {/* 아직 열리지 않은 자리 + 내려놓다 — 조용한 발치에 모은다 */}
              <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
                <span className={dead}>선지식의 한마디</span>
                <span className={dead}>나도 화두 던지기</span>
                <button
                  onClick={async () => {
                    const ok = await confirm(
                      "이 화두를 내려놓으시겠습니까?",
                      "체험이 처음으로 돌아갑니다.",
                      { confirm: "내려놓다", cancel: "머무르다" }
                    );
                    if (ok) {
                      setHwadu(null);
                      setNotesOpen(false);
                      setMemo("");
                      setAnswer("");
                      setDays(3);
                      setShareDone(false);
                      setShareError("");
                      setStep("choose");
                    }
                  }}
                  className="rounded-full border border-ink-3 px-4 py-1.5 text-[11px] tracking-[0.12em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
                >
                  이 화두를 내려놓다
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── 사유의 방 서랍 (체험 전용 — 회향할 때 답과 함께 남는다) ── */}
      {/* 배경 가림막 — 사유의 방(NotesDrawer)과 같은 톤. 데스크톱에서도 깔아
          바깥을 누르면 닫히게 한다 */}
      <div
        onClick={() => setNotesOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 sm:bg-black/30 ${
          notesOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
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
            떠오르는 것을 적어 두세요. 답이 아니라 발자국입니다.
            <br />여기 적은 단상은 회향할 때 답과 함께 남습니다.
          </p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder=""
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
