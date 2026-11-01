"use client";

// ─────────────────────────────────────────────────────────────
// 비움(空) — 무지출 · 무살생.
//
// 형: 「달력처럼 한눈에, 글은 빼고」 — 잔디 심기 판 하나로 줄였다.
// 갈래는 위 알약으로 고르고, 칸을 누르면 그날이 찬다. 큰 단추는 오늘 몫.
// 「모두」는 보기만 한다 — 둘 다 채운 날은 진하게, 하나면 옅게.
//
// 점수판이 아니라 일기다. 공덕을 주지 않는다(merit.ts 를 부르지 않는다) —
// 덜어내는 자리에서 다시 모으게 하면 앞뒤가 안 맞는다.
// 장부는 emptiness.ts 가 쥐고, 여기서는 그리기만 한다.
// ─────────────────────────────────────────────────────────────

import "./empty.css";
import { useEffect, useState } from "react";
import { buzz, strikeMoktak } from "@/lib/sound";
import {
  EMPTINESSES,
  EMPTY_BY_ID,
  EMPTY_EVENT,
  dayKeyOf,
  emptyDayKey,
  hasStamp,
  loadEmpty,
  monthlyEmptiness,
  streakOf,
  toggleStamp,
  type EmptyEntry,
  type EmptyKind,
} from "@/lib/emptiness";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
type Tab = EmptyKind | "all";

export default function EmptyPage() {
  // 서랍은 붙고 난 뒤에 연다 — 서버 그림과 어긋나면 하이드레이션이 깨진다
  const [log, setLog] = useState<EmptyEntry[] | null>(null);
  const [today, setToday] = useState("");
  const [view, setView] = useState<{ y: number; m: number } | null>(null);
  const [tab, setTab] = useState<Tab>(EMPTINESSES[0].id);

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (log === null || !view) {
    return <div className="emp" aria-hidden />;
  }

  const kind = tab === "all" ? undefined : tab;
  const full = kind ? 1 : EMPTINESSES.length; // 이만큼 차야 진한 칸
  const marks = monthlyEmptiness(view.y, view.m, kind, log);
  const lead = new Date(view.y, view.m - 1, 1).getDay(); // 1일 앞의 빈 칸
  const thisMonth =
    today.slice(0, 7) === `${view.y}-${String(view.m).padStart(2, "0")}`;
  const filled = marks.filter((d) => d.count >= full).length;
  const streak = kind ? streakOf(kind, log) : 0;
  const on = kind ? hasStamp(kind, today, log) : false;

  const move = (step: number) => {
    const t = new Date(view.y, view.m - 1 + step, 1);
    setView({ y: t.getFullYear(), m: t.getMonth() + 1 });
  };

  return (
    <div className="emp">
      <p className="emp-mark rise">空</p>

      <div className="emp-tabs rise rise-d1" role="tablist">
        {[...EMPTINESSES.map((e) => e.id), "all" as const].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className="emp-tab"
            onClick={() => setTab(t)}
          >
            {t === "all" ? "모두" : EMPTY_BY_ID[t].name}
          </button>
        ))}
      </div>

      <section className="emp-card rise rise-d2">
        <header className="emp-head">
          <Arrow dir="prev" onClick={() => move(-1)} />
          <h2 className="emp-title">
            {view.y}. {view.m}
          </h2>
          <Arrow dir="next" onClick={() => move(1)} disabled={thisMonth} />
        </header>

        <div className="emp-grid emp-week" aria-hidden>
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="emp-grid">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} aria-hidden />
          ))}
          {marks.map(({ day, count: c }) => {
            const key = dayKeyOf(view.y, view.m, day);
            const level = c >= full ? "full" : c > 0 ? "part" : "none";
            return (
              <button
                key={key}
                onClick={kind ? () => stamp(kind, key) : undefined}
                disabled={key > today || !kind}
                aria-label={`${view.m}월 ${day}일${c > 0 ? " 비움" : ""}`}
                className="emp-cell"
                data-level={level}
                data-today={key === today || undefined}
                data-future={key > today || undefined}
              >
                {day}
              </button>
            );
          })}
        </div>

        <p className="emp-count">
          <strong>{filled}</strong>일
          {streak > 1 && <span> · {streak}일째</span>}
        </p>
      </section>

      {kind && thisMonth && (
        <button
          className="emp-today rise rise-d3"
          aria-pressed={on}
          onClick={() => stamp(kind, today)}
        >
          {on ? EMPTY_BY_ID[kind].done : EMPTY_BY_ID[kind].act}
        </button>
      )}
    </div>
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
      className="emp-arrow"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={dir === "prev" ? "M14.5 6 8.5 12l6 6" : "M9.5 6l6 6-6 6"} />
      </svg>
    </button>
  );
}
