"use client";

// ─────────────────────────────────────────────────────────────
// 오늘 하루 — 내 도량 맨 위에 놓이는 판.
//
// 두두가 크게 앉아 있고, 옆에 지금 자리와 다음 자리까지의 걸음.
// 아래로 이어 온 날(精進)과 오늘의 세 가지.
//
// 매일 들어올 이유를 만들되, 놓쳤다고 야단치지 않는다 —
// 끊긴 날을 세지 않고 이어 온 날만 센다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Dudu from "@/components/Dudu";
import {
  addMerit,
  loadMerit,
  MERIT_EVENT,
  nextRank,
  rankOf,
  stageOf,
  stageProgress,
} from "@/lib/merit";
import {
  allDone,
  claimDaily,
  DAILY_EVENT,
  DAILY_REWARD,
  doneOf,
  loadDaily,
  missionsOf,
  nextKnot,
  streakOf,
  streakSay,
  type DailyBook,
} from "@/lib/daily";

// 이어 온 날의 불꽃 — 하루라도 이었으면 켠다
function Flame({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden>
      <defs>
        <linearGradient id="dp_flame" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="12" y2="22">
          <stop offset="0" stopColor="#f2789f" />
          <stop offset="0.55" stopColor="#e8973a" />
          <stop offset="1" stopColor="#dda01c" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5c.6 3.1-1.2 4.3-2.6 5.7-1.6 1.6-2.9 3.2-2.9 5.8A5.5 5.5 0 0 0 12 19.5a5.5 5.5 0 0 0 5.5-5.5c0-2.4-1.1-3.7-2.2-5-.5.9-1.2 1.4-2 1.5.6-2.9-.3-6-1.3-8z"
        fill={lit ? "url(#dp_flame)" : "var(--color-ink-3)"}
      />
      {lit && (
        <path
          d="M12 11.5c.4 1.5-.6 2-1.2 2.7-.5.6-.8 1.2-.8 1.9a2 2 0 0 0 4 0c0-1-.6-1.7-1.2-2.4-.3.4-.6.6-1 .6.3-1.1-.1-2.1-.6-2.8z"
          fill="rgba(255,255,255,0.65)"
        />
      )}
    </svg>
  );
}

export default function DailyPractice() {
  // 장부는 브라우저 서랍에 있다 — 서버에서는 읽을 수 없으므로
  // 붙고 난 뒤에 한 번 읽는다(서버·브라우저의 첫 그림이 어긋나지 않게).
  const [book, setBook] = useState<DailyBook | null>(null);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [got, setGot] = useState(0); // 방금 받은 상

  const refresh = useCallback(() => {
    setTotal(loadMerit().total);
    setStreak(streakOf());
    setBook(loadDaily());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(MERIT_EVENT, refresh);
    window.addEventListener(DAILY_EVENT, refresh);
    return () => {
      window.removeEventListener(MERIT_EVENT, refresh);
      window.removeEventListener(DAILY_EVENT, refresh);
    };
  }, [refresh]);

  // 아직 서랍을 못 읽었다 — 자리만 잡아 둔다(화면이 튀지 않게)
  if (!book) return <div className="h-[320px]" aria-hidden />;

  const rank = rankOf(total);
  const next = nextRank(total);
  const stage = stageOf(total);
  const pct = Math.round(stageProgress(total) * 100);

  const missions = missionsOf(book.day);
  const done = missions.filter((m) => doneOf(m, book) >= m.need).length;
  const finished = allDone(book);
  const knot = nextKnot(streak);

  const claim = () => {
    const n = claimDaily();
    if (!n) return;
    addMerit("daily");
    setGot(n);
    refresh();
  };

  return (
    <section className="rise">
      {/* ── 두두 — 지금 어디까지 왔나 ── */}
      <div className="rounded-[16px] border border-ink-3 bg-ink-2/50 px-5 py-5">
        <div className="flex items-center gap-4">
          <Dudu
            stage={stage}
            mood={finished ? "joy" : "default"}
            uid="doryang"
            className="h-[92px] w-[92px] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-[20px] leading-none text-hanji">두두</span>
              <span className="text-[12.5px] text-gold">
                {rank.hanja} · {rank.name}
              </span>
            </p>
            <p className="mt-1.5 break-keep text-[11.5px] leading-5 text-hanji-faint">
              {rank.say}
            </p>
            <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] text-hanji-faint">
              {next
                ? `${next.rank.name}까지 공덕 ${next.left.toLocaleString("ko-KR")}`
                : "끝자리 — 물음표가 광배가 되었어요"}
            </p>
          </div>
        </div>

        {/* ── 이어 온 날 ── */}
        <div className="mt-4 flex items-center gap-2 border-t border-ink-3 pt-3.5">
          <Flame lit={streak > 0} />
          <p className="min-w-0 flex-1 break-keep text-[12px] leading-5 text-hanji-dim">
            <span className="font-serif text-[16px] text-hanji">{streak}</span>
            <span className="text-hanji-faint">일째 </span>
            {streakSay(streak)}
            {knot && (
              <span className="text-hanji-faint"> · {knot.at}일까지 {knot.left}일</span>
            )}
          </p>
        </div>
      </div>

      {/* ── 오늘의 세 가지 ── */}
      <div className="mt-3 rounded-[16px] border border-ink-3 bg-ink-2/50 px-5 py-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] tracking-[0.3em] text-hanji-faint">오늘의 세 가지</p>
          <p className="text-[11px] text-hanji-faint">
            <span className={done === missions.length ? "text-gold" : "text-hanji-dim"}>
              {done}
            </span>
            {" / "}
            {missions.length}
          </p>
        </div>

        <ul className="mt-3.5 flex flex-col gap-2.5 border-t border-ink-3 pt-4">
          {missions.map((m) => {
            const n = doneOf(m, book);
            const ok = n >= m.need;
            return (
              <li key={m.id}>
                <Link
                  href={m.href}
                  className="group flex items-center gap-3"
                  aria-label={`${m.label} — ${ok ? "마침" : `${n}/${m.need}`}`}
                >
                  <span
                    aria-hidden
                    className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border transition-colors ${
                      ok ? "border-gold bg-gold" : "border-hanji-faint"
                    }`}
                  >
                    {ok && (
                      <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]">
                        <path
                          d="M2.5 6.3 5 8.8l4.5-5"
                          fill="none"
                          stroke="var(--color-ink)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[13px] leading-5 transition-colors ${
                        ok ? "text-hanji-faint" : "text-hanji group-hover:text-gold"
                      }`}
                    >
                      {m.label}
                    </span>
                    {!ok && m.need > 1 && (
                      <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-ink-3">
                        <span
                          className="block h-full rounded-full bg-gold/60 transition-[width] duration-300"
                          style={{ width: `${(n / m.need) * 100}%` }}
                        />
                      </span>
                    )}
                  </span>
                  {!ok && (
                    <span className="shrink-0 text-[11px] tabular-nums text-hanji-faint">
                      {m.need > 1 ? `${n}/${m.need}` : "하러 가기"}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* 다 마쳤으면 — 반 바퀴를 상으로 */}
        {finished && (
          <div className="mt-4 rounded-[12px] border border-gold/40 bg-gold/10 px-4 py-3.5 text-center">
            {book.claimed ? (
              <p className="break-keep text-[12px] leading-6 text-hanji-dim">
                {got > 0
                  ? `공덕 ${got}이 쌓였어요. 오늘 몫은 여기까지 — 내일 또 만나요.`
                  : "오늘의 세 가지를 마쳤어요. 내일 또 만나요."}
              </p>
            ) : (
              <>
                <p className="break-keep text-[12.5px] leading-6 text-hanji">
                  오늘의 세 가지를 마쳤습니다.
                </p>
                <button
                  onClick={claim}
                  className="mt-2.5 rounded-full border border-gold/60 px-5 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/15"
                >
                  공덕 {DAILY_REWARD} 받기
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
