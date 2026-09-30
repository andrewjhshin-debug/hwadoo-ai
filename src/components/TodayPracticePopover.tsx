"use client";

// 머리 한켠의 작은 수행 장부. 메인에 새 판을 얹지 않고, 궁금할 때만 펼친다.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  allDone,
  DAILY_EVENT,
  doneOf,
  loadDaily,
  missionsOf,
  type DailyBook,
} from "@/lib/daily";

export default function TodayPracticePopover() {
  const [open, setOpen] = useState(false);
  const [book, setBook] = useState<DailyBook | null>(null);

  const refresh = useCallback(() => setBook(loadDaily()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(DAILY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DAILY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  // 포행은 센서에서 조금씩 적히므로 카드가 열린 동안에도 새 걸음을 읽는다.
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(refresh, 2_000);
    return () => window.clearInterval(timer);
  }, [open, refresh]);

  const missions = missionsOf(book?.day);
  const completed = book ? missions.filter((mission) => doneOf(mission, book) >= mission.need).length : 0;
  const finished = book ? allDone(book) : false;
  const next = missions.find((mission) => !book || doneOf(mission, book) < mission.need);

  return (
    <div className="hip-today-wrap">
      <button
        type="button"
        aria-label="오늘의 수행"
        aria-expanded={open}
        aria-controls="hip-today-practice"
        className="hip-top-ico hip-today-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden>🪷</span>
        {!finished && <i className="hip-today-badge" aria-hidden />}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <button
            type="button"
            className="hip-today-scrim"
            aria-label="오늘의 수행 닫기"
            onClick={() => setOpen(false)}
          />
          <section id="hip-today-practice" className="hip-today-popover" role="dialog" aria-modal="true" aria-label="오늘의 수행">
            <div className="hip-today-head">
              <div>
                <p>오늘의 수행</p>
                <span>{finished ? "오늘 몫을 다 채웠어요" : "가볍게, 세 가지만"}</span>
              </div>
              <div className="hip-today-count" aria-label={`${completed}개 완료`}>{completed} / {missions.length}</div>
              <button type="button" aria-label="오늘의 수행 닫기" onClick={() => setOpen(false)}>×</button>
            </div>

            <ul>
              {missions.map((mission) => {
                const value = book ? doneOf(mission, book) : 0;
                const complete = value >= mission.need;
                return (
                  <li key={mission.id}>
                    <Link href={mission.href} onClick={() => setOpen(false)}>
                      <span className="hip-today-check" data-done={complete ? "1" : undefined} aria-hidden>
                        {complete && "✓"}
                      </span>
                      <span className="hip-today-label">{mission.label}</span>
                      <span className="hip-today-progress">
                        {complete ? "마침" : mission.need > 1 ? `${value} / ${mission.need}` : "하러 가기"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {finished ? (
              <p className="hip-today-finished">내일의 세 가지도 여기서 확인해요.</p>
            ) : next ? (
              <Link className="hip-today-go" href={next.href} onClick={() => setOpen(false)}>
                수행 이어가기 <span aria-hidden>→</span>
              </Link>
            ) : null}
          </section>
        </>,
        document.body,
      )}
    </div>
  );
}
