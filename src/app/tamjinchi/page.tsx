"use client";

// ─────────────────────────────────────────────────────────────
// 불심 투자(佛心投資) — 돈 앞에서 흔들리는 마음을 삼독으로 본다.
//
// 네 자리를 알약 하나에 넣었다 —
//  · 108초  사기 전에 세는 시간. 다 세면 "그래도 사시겠어요?"
//  · 자가진단  아홉 물음. 점수판이 아니라 한 마디로 돌려준다.
//  · 화두   잃은 날 여는 물음 여섯 중 하나.
//  · 참회록  무엇을 했고 그때 어떤 독이 움직였는가.
//
// 종목·값·전망은 이 화면에 없다. 넣는 순간 유사투자자문이 된다.
// 참회록에 금액 칸을 두지 않은 것도 같은 까닭 — 칸이 없어야 안 적는다.
//
// 공덕은 주지 않는다. 108초가 공덕 버는 단추가 되면 멈추려고 세는 게
// 아니라 세려고 세게 된다. 셈은 tamjinchi 장부 안에서만 한다.
// 브라우저 서랍은 붙고 난 뒤에 읽는다(useEffect) — 하이드레이션.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  addEntry,
  CHOICES,
  dayLabel,
  DEED_LABEL,
  drawHwadu,
  loadTamjinchi,
  LOSS_HWADU,
  notePause,
  PAUSE_SECONDS,
  POISONS,
  POISON_BY_ID,
  QUESTIONS,
  removeEntry,
  TEXT_MAX,
  verdictOf,
  type Deed,
  type Poison,
  type TamjinchiBook,
} from "@/lib/tamjinchi";

const RING_R = 88;
const RING_BOX = 192;
const RING_C = 2 * Math.PI * RING_R;

// 숨 리듬 — 들숨 4초, 날숨 6초. 호흡 명상과 같은 결이되 이 화면의 것은
// 따로 이름을 둔다(섞이면 나중에 한쪽만 고칠 수 없다).
const TJ_CSS = `
.tj-orb {
  --tj-max: 1.5;
  width: 120px;
  height: 120px;
  border-radius: 9999px;
  border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
  background: radial-gradient(circle at 50% 42%,
    color-mix(in srgb, var(--color-gold) 14%, transparent), transparent 74%);
  box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 10%, transparent);
}
.tj-orb-anim { animation: tj-breath 10000ms cubic-bezier(0.45,0.05,0.55,0.95) infinite; }
@keyframes tj-breath {
  0%   { transform: scale(1);              box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 10%, transparent); }
  40%  { transform: scale(var(--tj-max));  box-shadow: 0 0 66px color-mix(in srgb, var(--color-gold) 28%, transparent); }
  100% { transform: scale(1);              box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 10%, transparent); }
}
@media (prefers-reduced-motion: reduce) { .tj-orb { --tj-max: 1.1; } }
`;

type Tab = "pause" | "check" | "hwadu" | "log";

const TABS: { id: Tab; label: string }[] = [
  { id: "pause", label: "108초" },
  { id: "check", label: "자가진단" },
  { id: "hwadu", label: "화두" },
  { id: "log", label: "참회록" },
];

export default function TamjinchiPage() {
  const [tab, setTab] = useState<Tab>("pause");
  const [book, setBook] = useState<TamjinchiBook | null>(null);

  useEffect(() => setBook(loadTamjinchi()), []);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-6 md:pt-10">
      <style>{TJ_CSS}</style>

      <p className="rise text-[11px] tracking-[0.5em] text-gold-soft">
        佛心投資 · 불심 투자
      </p>
      <h1 className="rise rise-d1 mt-2 break-keep font-serif text-lg font-light text-hanji">
        사기 전에, 마음을 본다
      </h1>

      {/* 뼈대 — 삼독이 곧 손실의 세 가지 원인. 설명은 여기 한 번뿐이다 */}
      <div className="rise rise-d2 mt-4 grid w-full grid-cols-3 gap-2">
        {POISONS.map((p) => (
          <div
            key={p.id}
            className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-2 py-2.5 text-center"
          >
            <span
              aria-hidden
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-[15px] leading-none text-gold"
            >
              {p.hanja}
            </span>
            <p className="mt-2 text-[12.5px] text-hanji">{p.full}</p>
            <p className="mt-0.5 break-keep text-[11px] text-hanji-faint">
              {p.trap}
            </p>
          </div>
        ))}
      </div>

      {/* 알약 세그먼트 — 고른 쪽만 먹으로 채운다 */}
      <div className="rise rise-d2 mt-4 flex w-full rounded-full border border-ink-3 bg-ink-2/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`flex-1 rounded-full py-2.5 text-[12.5px] tracking-[0.1em] transition-colors ${
              tab === t.id
                ? "bg-hanji text-ink"
                : "text-hanji-faint hover:text-hanji-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 w-full">
        {tab === "pause" && (
          <Pause book={book} onNote={(held) => setBook(notePause(held))} />
        )}
        {tab === "check" && <Check />}
        {tab === "hwadu" && <LossHwadu />}
        {tab === "log" && (
          <Confession
            book={book}
            onWrite={(d, p, t) => setBook(addEntry(d, p, t))}
            onErase={(id) => setBook(removeEntry(id))}
          />
        )}
      </div>
    </div>
  );
}

// ── 매매 전 108초 ────────────────────────────────────────────

function Pause({
  book,
  onNote,
}: {
  book: TamjinchiBook | null;
  onNote: (held: boolean) => void;
}) {
  const [phase, setPhase] = useState<"ready" | "count" | "ask" | "after">(
    "ready"
  );
  const [left, setLeft] = useState(PAUSE_SECONDS);
  const [chose, setChose] = useState<"buy" | "hold" | null>(null);
  const startRef = useRef(0);

  // 남은 시간은 시작 시각에서 계산한다 — 창을 가렸다 돌아와도 어긋나지 않게
  useEffect(() => {
    if (phase !== "count") return;
    let raf = 0;
    const tick = () => {
      const gone = (performance.now() - startRef.current) / 1000;
      const l = Math.max(0, PAUSE_SECONDS - gone);
      setLeft(l);
      if (l <= 0) {
        setPhase("ask");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const begin = () => {
    startRef.current = performance.now();
    setLeft(PAUSE_SECONDS);
    setChose(null);
    setPhase("count");
  };

  const answer = (held: boolean) => {
    onNote(held);
    setChose(held ? "hold" : "buy");
    setPhase("after");
  };

  // 고리는 시간이 갈수록 차오른다
  const offset = phase === "count" ? RING_C * (left / PAUSE_SECONDS) : 0;

  // 한가운데 숫자 하나가 판마다 뜻을 바꾼다 —
  // 세기 전: 여태 끝까지 센 횟수 · 세는 중: 남은 초 · 다 셈: 108 · 고른 뒤: 멈춘 횟수
  const hero =
    phase === "count"
      ? { cap: "남은 셈", n: Math.ceil(left), unit: "초" }
      : phase === "ready"
        ? { cap: "끝까지 센 108초", n: book?.pauses ?? 0, unit: "번" }
        : phase === "ask"
          ? { cap: "다 셌어요", n: PAUSE_SECONDS, unit: "초" }
          : { cap: "그중 멈춘 것", n: book?.held ?? 0, unit: "번" };

  return (
    <div className="flex flex-col items-center text-center">
      {/* 고리 자체가 단추다 — 「세기 시작」을 따로 찾아 누르게 하면
          화면이 길어지고, 무엇보다 눈이 이미 가 있는 자리가 여기다. */}
      <div
        role={phase === "ready" ? "button" : undefined}
        tabIndex={phase === "ready" ? 0 : undefined}
        onClick={phase === "ready" ? begin : undefined}
        onKeyDown={
          phase === "ready"
            ? (e) => (e.key === "Enter" || e.key === " ") && begin()
            : undefined
        }
        aria-label={phase === "ready" ? "백여덟 세기 시작" : undefined}
        className={`relative flex items-center justify-center ${
          phase === "ready" ? "cursor-pointer transition-transform active:scale-95" : ""
        }`}
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
          {phase !== "ready" && (
            <circle
              cx={RING_BOX / 2}
              cy={RING_BOX / 2}
              r={RING_R}
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={offset}
            />
          )}
        </svg>

        <div
          aria-hidden
          className={`tj-orb ${phase === "count" ? "tj-orb-anim" : ""}`}
        />

        <div className="absolute flex flex-col items-center">
          <p
            aria-live="polite"
            className="text-[11px] tracking-[0.3em] text-hanji-faint"
          >
            {hero.cap}
          </p>
          <p className="mt-1 font-serif text-[68px] font-light leading-none tabular-nums text-hanji">
            {hero.n}
            <span className="ml-1 text-[13px] tracking-[0.2em] text-hanji-faint">
              {hero.unit}
            </span>
          </p>
        </div>
      </div>

      {phase === "ready" && (
        <p className="mt-4 break-keep text-[12.5px] leading-6 text-hanji-dim">
          <span className="text-hanji">고리를 누르면 백여덟을 셉니다.</span>
          <br />
          원이 커지면 들이쉬고, 작아지면 내쉬세요.
        </p>
      )}

      {phase === "count" && (
        <button
          type="button"
          onClick={() => setPhase("ready")}
          className="mt-4 rounded-full border border-ink-3 px-9 py-2.5 text-[13px] tracking-[0.3em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
        >
          그만두기
        </button>
      )}

      {phase === "ask" && (
        <>
          <p className="mt-5 break-keep font-serif text-xl font-light text-hanji question-glow">
            그래도 사시겠어요?
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => answer(false)}
              className="rounded-full border border-ink-3 px-7 py-3 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              그래도 산다
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              className="btn-obang px-7 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
            >
              오늘은 멈춘다
            </button>
          </div>
        </>
      )}

      {phase === "after" && (
        <>
          <p className="mt-5 break-keep text-[13px] leading-6 text-hanji-dim">
            {chose === "hold"
              ? "멈춘 것도 한 매매입니다."
              : "정하셨으면 참회록에 한 줄 남겨 두세요."}
          </p>
          <button
            type="button"
            onClick={begin}
            className="mt-5 rounded-full border border-ink-3 px-9 py-3 text-[13px] tracking-[0.3em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            다시 세기
          </button>
        </>
      )}
    </div>
  );
}

// ── 삼독 자가진단 ────────────────────────────────────────────

function Check() {
  const [answers, setAnswers] = useState<number[]>([]);
  const i = answers.length;
  const done = i >= QUESTIONS.length;
  const q = QUESTIONS[i];

  if (done) {
    const v = verdictOf(answers);
    const meta = v.poison ? POISON_BY_ID[v.poison] : null;
    return (
      <div className="rise flex flex-col items-center rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-10 text-center">
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-[26px] leading-none text-gold"
        >
          {meta ? meta.hanja : "空"}
        </span>
        <p className="mt-6 break-keep font-serif text-[17px] font-light leading-[1.9] text-hanji">
          {v.line}
        </p>
        <button
          type="button"
          onClick={() => setAnswers([])}
          className="mt-7 rounded-full border border-ink-3 px-8 py-2.5 text-[12.5px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
        >
          다시 보기
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-8">
      {/* 진행 막대 — 몇 개 남았는지 숫자로 세지 않게 */}
      <div className="h-px w-full bg-ink-3">
        <div
          className="h-px bg-gold transition-[width] duration-300"
          style={{ width: `${(i / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <p className="mt-8 break-keep text-center font-serif text-[17px] font-light leading-[1.9] text-hanji">
        {q.ask}
      </p>

      <div className="mt-8 grid grid-cols-4 gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.score}
            type="button"
            onClick={() => setAnswers((a) => [...a, c.score])}
            className="rounded-full border border-ink-3 py-2.5 text-[12.5px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            {c.label}
          </button>
        ))}
      </div>

      {i > 0 && (
        <button
          type="button"
          onClick={() => setAnswers((a) => a.slice(0, -1))}
          className="mx-auto mt-6 block text-[12px] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          한 걸음 뒤로
        </button>
      )}
    </div>
  );
}

// ── 손실 났을 때 여는 화두 ───────────────────────────────────

function LossHwadu() {
  const [idx, setIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-10 text-center">
      {idx === null ? (
        <>
          <p className="break-keep text-[13px] leading-6 text-hanji-dim">
            잃은 날에는 값을 보지 말고 물음을 보세요.
          </p>
          <button
            type="button"
            onClick={() => setIdx(drawHwadu(null))}
            className="btn-obang mt-6 px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            화두 열기
          </button>
        </>
      ) : (
        <>
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-[18px] leading-none text-gold"
          >
            問
          </span>
          <p className="question-glow mt-7 break-keep font-serif text-xl font-light leading-[1.9] text-hanji">
            {LOSS_HWADU[idx]}
          </p>
          <button
            type="button"
            onClick={() => setIdx((p) => drawHwadu(p))}
            className="mt-8 rounded-full border border-ink-3 px-8 py-2.5 text-[12.5px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            다른 화두
          </button>
        </>
      )}
    </div>
  );
}

// ── 매매일지 = 참회록 ────────────────────────────────────────

const DEEDS: Deed[] = ["buy", "sell", "hold"];

function Confession({
  book,
  onWrite,
  onErase,
}: {
  book: TamjinchiBook | null;
  onWrite: (deed: Deed, poison: Poison | null, text: string) => void;
  onErase: (id: string) => void;
}) {
  const [deed, setDeed] = useState<Deed>("buy");
  const [poison, setPoison] = useState<Poison | null>(null);
  const [text, setText] = useState("");

  const entries = book?.entries ?? [];

  const write = () => {
    if (!text.trim()) return;
    onWrite(deed, poison, text);
    setText("");
    setPoison(null);
  };

  return (
    <div>
      <div className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-4">
        <div className="flex gap-2">
          {DEEDS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDeed(d)}
              aria-pressed={deed === d}
              className={`flex-1 rounded-full py-2.5 text-[12.5px] tracking-[0.1em] transition-colors ${
                deed === d
                  ? "bg-hanji text-ink"
                  : "border border-ink-3 text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              {DEED_LABEL[d]}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11.5px] tracking-[0.2em] text-hanji-faint">
          그때 움직인 것
        </p>
        <div className="mt-2 flex gap-2">
          {POISONS.map((p) => (
            <button
              key={p.id}
              type="button"
              // 한 번 더 누르면 풀린다 — 모르겠으면 안 고르는 게 맞다
              onClick={() => setPoison((v) => (v === p.id ? null : p.id))}
              aria-pressed={poison === p.id}
              className={`flex-1 rounded-full py-2.5 text-[12.5px] transition-colors ${
                poison === p.id
                  ? "bg-gold/15 text-gold"
                  : "border border-ink-3 text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              <span className="font-serif">{p.hanja}</span>{" "}
              <span className="tracking-[0.1em]">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-ink-3 pt-3.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
            rows={2}
            placeholder="무엇이 나를 움직였나요"
            className="journal-area text-[15px]"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          {/* 글자 수는 얼마 안 남았을 때만 — 늘 띄워 두면 쓰기 전부터 재게 된다 */}
          <span className="text-[11px] tabular-nums text-hanji-faint">
            {text.length > TEXT_MAX - 30 ? `${TEXT_MAX - text.length}자 남음` : ""}
          </span>
          <button
            type="button"
            onClick={write}
            disabled={!text.trim()}
            className="btn-obang px-7 py-2.5 text-[12.5px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            적기
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-10 text-center text-[13px] text-hanji-faint">
          아직 적은 것이 없어요.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[11.5px] tabular-nums text-hanji-faint">
                  {dayLabel(e.at)}
                </span>
                <span className="text-[12px] text-hanji-dim">
                  {DEED_LABEL[e.deed]}
                </span>
                {e.poison && (
                  <span
                    aria-label={POISON_BY_ID[e.poison].full}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-[12px] leading-none text-gold"
                  >
                    {POISON_BY_ID[e.poison].hanja}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onErase(e.id)}
                  aria-label="지우기"
                  className="ml-auto text-hanji-faint transition-colors hover:text-vermilion"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 break-keep text-[13.5px] leading-7 text-hanji-dim">
                {e.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
