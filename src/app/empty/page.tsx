"use client";

// ─────────────────────────────────────────────────────────────
// 비움(空) — 무지출 · 무소유 · 무집착 · 무살생.
//
// 소개만 하던 방을 기록하는 방으로 키웠다.
// 손이 두 가지다 — 도장(예/아니오)과 한 줄(무엇을 놓았는가).
// 그래서 화면도 두 가지다: 도장은 알약 단추와 점, 한 줄은 밑줄 친 칸.
//
// 점수판이 아니라 일기다. 공덕을 주지 않는다(merit.ts 를 부르지 않는다) —
// 덜어내는 자리에서 다시 모으게 하면 앞뒤가 안 맞는다.
// 장부는 emptiness.ts 가 쥐고, 여기서는 그리기만 한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { buzz, clickBead, strikeMoktak } from "@/lib/sound";
import {
  EMPTINESSES,
  EMPTY_BY_ID,
  EMPTY_EVENT,
  NOTE_MAX,
  dayKeyOf,
  daysTouchedInMonth,
  emptyDayKey,
  entriesOf,
  eraseEmpty,
  hasStamp,
  loadEmpty,
  monthlyEmptiness,
  noteEmpty,
  recentDays,
  streakOf,
  toggleStamp,
  type Emptiness,
  type EmptyEntry,
  type EmptyKind,
} from "@/lib/emptiness";

const DELAYS = ["rise-d1", "rise-d2", "rise-d3", "rise-d4"];
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function EmptyPage() {
  // 서랍은 붙고 난 뒤에 연다 — 서버 그림과 어긋나면 하이드레이션이 깨진다
  const [log, setLog] = useState<EmptyEntry[] | null>(null);
  const [today, setToday] = useState("");
  const [view, setView] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(emptyDayKey());
    setView({ y: now.getFullYear(), m: now.getMonth() + 1 });
    const read = () => setLog(loadEmpty());
    read();
    // 다른 탭·다른 카드에서 적어도 이 화면이 따라오게
    window.addEventListener(EMPTY_EVENT, read);
    return () => window.removeEventListener(EMPTY_EVENT, read);
  }, []);

  const stamp = (kind: EmptyKind, day: string) => {
    const on = toggleStamp(kind, day);
    if (on) {
      strikeMoktak(0.5);
      buzz(10);
    }
    setLog(loadEmpty());
  };

  const write = (kind: EmptyKind, text: string) => {
    if (!noteEmpty(kind, text)) return false;
    clickBead(0.5);
    buzz(8);
    setLog(loadEmpty());
    return true;
  };

  const erase = (kind: EmptyKind, day: string, note: string) => {
    eraseEmpty(kind, day, note);
    setLog(loadEmpty());
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-16 pt-10 md:pt-14">
      <p className="rise font-serif text-[68px] font-light leading-none text-gold-grad">
        空
      </p>
      <p className="rise mt-5 text-[11px] tracking-[0.5em] text-gold-soft">
        비움 — 네 갈래
      </p>
      <p className="question-glow rise rise-d1 mt-7 text-center font-serif text-xl font-light leading-[1.9] text-hanji">
        쥐고 있던 것 하나를 내려놓습니다.
        <br />
        <span className="text-gold-grad">덜어냄도 수행입니다.</span>
      </p>

      {log === null || !view ? (
        <div className="h-[60vh]" aria-hidden />
      ) : (
        <>
          <div className="mt-10 flex w-full flex-col gap-3">
            {EMPTINESSES.map((e, i) => (
              <Card
                key={e.id}
                e={e}
                log={log}
                today={today}
                delay={DELAYS[i]}
                view={view}
                onView={setView}
                onStamp={stamp}
                onWrite={write}
                onErase={erase}
              />
            ))}
          </div>

          {/* 지우는 법은 한 번만 알린다 — 도장을 찍어 본 사람에게만 */}
          {log.some((x) => !x.note) && (
            <p className="mt-5 text-[11px] leading-5 text-hanji-faint">
              잘못 눌렀으면 한 번 더 눌러 지워요.
            </p>
          )}

          <Past log={log} today={today} onErase={erase} />
        </>
      )}
    </div>
  );
}

// ── 한 갈래 ─────────────────────────────────────────────────

function Card({
  e,
  log,
  today,
  delay,
  view,
  onView,
  onStamp,
  onWrite,
  onErase,
}: {
  e: Emptiness;
  log: EmptyEntry[];
  today: string;
  delay: string;
  view: { y: number; m: number };
  onView: (v: { y: number; m: number }) => void;
  onStamp: (kind: EmptyKind, day: string) => void;
  onWrite: (kind: EmptyKind, text: string) => boolean;
  onErase: (kind: EmptyKind, day: string, note: string) => void;
}) {
  const on = hasStamp(e.id, today, log);
  const mine = entriesOf(e.id, today, log);
  // 무지출은 이어 온 날, 한 줄 갈래는 이달에 놓은 가짓수, 무살생은 달력이 센다
  const num =
    e.id === "jichul"
      ? streakOf(e.id, log)
      : e.id === "salsaeng"
        ? 0
        : monthlyEmptiness(view.y, view.m, e.id, log).reduce(
            (s, d) => s + d.count,
            0
          );

  return (
    <section
      className={`rise ${delay} rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5 text-left`}
    >
      <div className="flex items-center gap-4">
        <Badge mark={e.mark} on={e.mode === "stamp" ? on : mine.length > 0} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-serif text-base font-light tracking-[0.2em] text-hanji">
              {e.name}
            </span>
            <span className="text-[10px] tracking-[0.3em] text-hanji-faint">
              {e.hanja}
            </span>
          </p>
          <p className="mt-1.5 break-keep text-[13px] font-light leading-6 text-hanji-dim">
            {e.ask}
          </p>
        </div>
        {num > 0 && (
          <p className="shrink-0 text-right">
            <span className="font-serif text-[26px] font-light leading-none text-gold">
              {num}
            </span>
            <span className="mt-1 block text-[10px] tracking-[0.15em] text-hanji-faint">
              {e.unit}
            </span>
          </p>
        )}
      </div>

      {e.mode === "stamp" ? (
        <>
          <button
            onClick={() => onStamp(e.id, today)}
            aria-pressed={on}
            className={
              on
                ? "mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-gold/50 bg-gold/10 py-2.5 text-[12.5px] tracking-[0.2em] text-gold"
                : "btn-obang mt-4 w-full py-2.5 text-[12.5px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-80"
            }
          >
            {on && <Check />}
            {on ? e.done : e.act}
          </button>

          {e.id === "jichul" ? (
            <Strip log={log} today={today} />
          ) : (
            <Calendar
              log={log}
              today={today}
              view={view}
              onView={onView}
              onStamp={onStamp}
            />
          )}
        </>
      ) : (
        <Writer
          e={e}
          mine={mine}
          today={today}
          onWrite={onWrite}
          onErase={onErase}
        />
      )}
    </section>
  );
}

// ── 한 줄 쓰기 — 무소유 · 무집착 ────────────────────────────

function Writer({
  e,
  mine,
  today,
  onWrite,
  onErase,
}: {
  e: Emptiness;
  mine: EmptyEntry[];
  today: string;
  onWrite: (kind: EmptyKind, text: string) => boolean;
  onErase: (kind: EmptyKind, day: string, note: string) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (onWrite(e.id, draft)) setDraft("");
        }}
        className="mt-4 flex items-center gap-3 border-b border-ink-3 pb-2 transition-colors focus-within:border-gold/40"
      >
        <input
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          maxLength={NOTE_MAX}
          aria-label={e.ask}
          placeholder={e.id === "soyu" ? "낡은 외투 한 벌" : "지난 일 하나"}
          className="min-w-0 flex-1 bg-transparent font-serif text-[14px] font-light text-hanji outline-none placeholder:text-hanji-faint"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded-full border border-gold/50 px-4 py-1.5 text-[11.5px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 disabled:border-ink-3 disabled:text-hanji-faint"
        >
          {e.act}
        </button>
      </form>

      {mine.length > 0 && (
        <ul className="mt-3.5 flex flex-col gap-2">
          {mine.map((x, i) => (
            <li key={`${x.note}-${i}`} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gold/70"
              />
              <span className="min-w-0 flex-1 break-keep text-[13px] font-light leading-6 text-hanji-dim">
                {x.note}
              </span>
              <button
                onClick={() => onErase(e.id, today, x.note)}
                aria-label="지우기"
                className="shrink-0 p-1 text-hanji-faint transition-colors hover:text-vermilion"
              >
                <Cross />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ── 최근 열나흘 — 무지출의 점 ───────────────────────────────

function Strip({ log, today }: { log: EmptyEntry[]; today: string }) {
  const set = new Set(
    log.filter((x) => x.kind === "jichul").map((x) => x.day)
  );
  const [y, m, d] = today.split("-").map(Number);
  const days = Array.from({ length: 14 }, (_, i) => {
    const t = new Date(y, m - 1, d - 13 + i);
    return emptyDayKey(t.getTime());
  });

  return (
    <div className="mt-4 flex items-center gap-1.5" aria-hidden>
      {days.map((k) => (
        <span
          key={k}
          className={`h-[6px] flex-1 rounded-full ${
            set.has(k) ? "bg-gold" : "bg-gold/12"
          }`}
        />
      ))}
    </div>
  );
}

// ── 달력 — 무살생 ───────────────────────────────────────────

function Calendar({
  log,
  today,
  view,
  onView,
  onStamp,
}: {
  log: EmptyEntry[];
  today: string;
  view: { y: number; m: number };
  onView: (v: { y: number; m: number }) => void;
  onStamp: (kind: EmptyKind, day: string) => void;
}) {
  const marks = monthlyEmptiness(view.y, view.m, "salsaeng", log);
  const count = marks.filter((d) => d.count > 0).length;
  const lead = new Date(view.y, view.m - 1, 1).getDay(); // 1일 앞의 빈 칸
  const thisMonth = today.slice(0, 7) === `${view.y}-${String(view.m).padStart(2, "0")}`;

  const move = (step: number) => {
    const t = new Date(view.y, view.m - 1 + step, 1);
    onView({ y: t.getFullYear(), m: t.getMonth() + 1 });
  };

  return (
    <div className="mt-5 border-t border-ink-3 pt-4">
      <div className="flex items-center justify-between">
        <Arrow dir="prev" onClick={() => move(-1)} />
        <p className="font-serif text-[13px] tracking-[0.25em] text-hanji-dim">
          {view.y}년 {view.m}월
        </p>
        <Arrow dir="next" onClick={() => move(1)} disabled={thisMonth} />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] text-hanji-faint">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} aria-hidden />
        ))}
        {marks.map(({ day, count: c }) => {
          const key = dayKeyOf(view.y, view.m, day);
          const future = key > today;
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => onStamp("salsaeng", key)}
              disabled={future}
              aria-label={`${view.m}월 ${day}일${c > 0 ? " 절밥" : ""}`}
              className={`grid aspect-square place-items-center rounded-full text-[11px] leading-none transition-colors ${
                c > 0
                  ? "bg-gold font-medium text-ink"
                  : future
                    ? "text-hanji-faint/40"
                    : "text-hanji-faint hover:bg-gold/10"
              } ${isToday && c === 0 ? "ring-1 ring-gold/45" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="font-serif text-[34px] font-light leading-none text-gold-grad">
          {count}
        </span>
        <span className="text-[11px] tracking-[0.25em] text-hanji-faint">
          일 — 이번 달 절밥
        </span>
      </p>
    </div>
  );
}

// ── 지난 것 ─────────────────────────────────────────────────

function Past({
  log,
  today,
  onErase,
}: {
  log: EmptyEntry[];
  today: string;
  onErase: (kind: EmptyKind, day: string, note: string) => void;
}) {
  const days = recentDays(10, log).filter((d) => d.day !== today);
  const total = daysTouchedInMonth(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)),
    undefined,
    log
  );

  if (log.length === 0) {
    return (
      <p className="rise rise-d4 mt-12 text-[12.5px] leading-6 text-hanji-faint">
        오늘 하나만 비워 보세요.
      </p>
    );
  }

  return (
    <section className="mt-14 w-full">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] tracking-[0.35em] text-hanji-faint">지난 것</p>
        <p className="text-[11px] tracking-[0.15em] text-hanji-faint">
          이달 비운 날 {total}
        </p>
      </div>

      {days.length === 0 ? (
        <p className="mt-4 text-[12.5px] leading-6 text-hanji-faint">
          오늘이 첫 날이에요.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-5">
          {days.map(({ day, entries }) => {
            const stamps = entries.filter((x) => !x.note);
            const notes = entries.filter((x) => x.note);
            return (
              <li key={day} className="flex gap-4 border-t border-ink-3 pt-4">
                <p className="w-[54px] shrink-0 font-serif text-[12px] leading-6 text-hanji-faint">
                  {fmtDay(day)}
                </p>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {stamps.length > 0 && (
                    <p className="flex flex-wrap gap-1.5">
                      {stamps.map((x, i) => (
                        <span
                          key={`${x.kind}-${i}`}
                          className="rounded-full border border-gold/30 px-2.5 py-[3px] text-[11px] tracking-[0.1em] text-gold-soft"
                        >
                          {EMPTY_BY_ID[x.kind].name}
                        </span>
                      ))}
                    </p>
                  )}
                  {notes.map((x, i) => (
                    <p
                      key={`${x.note}-${i}`}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        aria-hidden
                        className="mt-[3px] shrink-0 font-serif text-[11px] leading-5 text-gold-soft"
                      >
                        {EMPTY_BY_ID[x.kind].mark}
                      </span>
                      <span className="min-w-0 flex-1 break-keep text-[13px] font-light leading-6 text-hanji-dim">
                        {x.note}
                      </span>
                      <button
                        onClick={() => onErase(x.kind, day, x.note)}
                        aria-label="지우기"
                        className="shrink-0 p-1 text-hanji-faint transition-colors hover:text-vermilion"
                      >
                        <Cross />
                      </button>
                    </p>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── 자잘한 것 ───────────────────────────────────────────────

function fmtDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

function Badge({ mark, on }: { mark: string; on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-[17px] leading-none transition-colors ${
        on ? "bg-gold text-ink" : "border border-gold/30 text-gold"
      }`}
    >
      {mark}
    </span>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M5 12.5 10 17.5 19 6.5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="h-3 w-3"
      aria-hidden
    >
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

function Arrow({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "지난 달" : "다음 달"}
      className="p-1.5 text-hanji-faint transition-colors hover:text-gold disabled:opacity-30 disabled:hover:text-hanji-faint"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path d={dir === "prev" ? "M14.5 6 8.5 12l6 6" : "M9.5 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
