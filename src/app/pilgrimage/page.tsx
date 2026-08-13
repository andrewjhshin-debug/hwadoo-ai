"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로(巡禮) — 발로 걷는 물음, 절로 가는 길.
// · 다가오는 날: 음력으로 정해진 불교 일정을 해마다 자동 계산해
//   가까운 순으로 여덟을 편다 (부처님오신날 등 큰 날은 금색).
// · 이름난 도량: 전국의 이름난 절 — 지역 칩으로 거르고,
//   길찾기는 카카오맵 이름 검색 링크(키 불필요)로 새 창에 연다.
// 날짜 계산은 클라이언트에서만 — 서버와 하루가 어긋나도 깜빡이지 않게.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import {
  kakaoMapUrl,
  REGIONS,
  TEMPLES,
  upcomingEvents,
  type PilgrimEvent,
  type Region,
} from "@/lib/pilgrimage";

export default function PilgrimagePage() {
  const [events, setEvents] = useState<PilgrimEvent[]>([]);
  const [region, setRegion] = useState<Region | "전체">("전체");

  // 오늘 기준 계산 — 클라이언트의 오늘로 센다
  useEffect(() => {
    setEvents(upcomingEvents(8));
  }, []);

  const temples = useMemo(
    () => (region === "전체" ? TEMPLES : TEMPLES.filter((t) => t.region === region)),
    [region]
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16 pt-8 md:pt-12">
      {/* ── 머리 ── */}
      <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        巡禮 · 손잡고 절로
      </p>
      <p className="question-glow rise rise-d1 mt-7 text-center font-serif text-xl font-light leading-[1.9] text-hanji">
        발로 걷는 물음 —
        <br />
        <span className="text-gold-grad">절로 가는 길입니다.</span>
      </p>
      <p className="rise rise-d2 mt-6 break-keep text-center text-[13px] leading-7 text-hanji-dim">
        방석 위의 물음을 이따금 길 위에 내려놓습니다.
        <br className="hidden sm:block" /> 산문을 지나 한 걸음 — 그것도
        참구입니다.
      </p>

      {/* ── 구획 1 · 다가오는 날 ── */}
      <section className="rise rise-d2 mt-12">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          다가오는 날
        </p>
        <ul className="mt-4 border-t border-ink-3">
          {events.length === 0 ? (
            <li className="py-5 text-[13px] leading-7 text-hanji-faint">
              달력을 살펴보는 중…
            </li>
          ) : (
            events.map((ev) => (
              <li
                key={`${ev.name}-${ev.date.getTime()}`}
                className="flex items-start gap-4 border-b border-ink-3/60 py-4"
              >
                {/* 날짜 · D-몇 */}
                <div className="w-14 shrink-0 text-left">
                  <p
                    className={`font-serif text-[17px] font-light leading-none ${
                      ev.major ? "text-gold" : "text-hanji"
                    }`}
                  >
                    {ev.date.getMonth() + 1}.{ev.date.getDate()}
                  </p>
                  <p
                    className={`mt-1.5 text-[10px] tracking-[0.15em] ${
                      ev.dDay === 0
                        ? "text-vermilion"
                        : ev.major
                          ? "text-gold-soft"
                          : "text-hanji-faint"
                    }`}
                  >
                    {ev.dDay === 0 ? "오늘" : `D-${ev.dDay}`}
                  </p>
                </div>
                {/* 이름(한자) · 한 줄 */}
                <div className="min-w-0 flex-1">
                  <p className="break-keep text-[14px] leading-6">
                    <span className={ev.major ? "text-gold" : "text-hanji"}>
                      {ev.name}
                    </span>
                    <span className="ml-2 text-[11px] tracking-wider text-hanji-faint">
                      {ev.hanja}
                    </span>
                  </p>
                  <p className="mt-0.5 break-keep text-[12px] leading-6 text-hanji-dim">
                    {ev.note}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-hanji-faint">
          음력으로 정해진 날들 — 해마다 자동으로 헤아립니다.
        </p>
      </section>

      {/* ── 구획 2 · 이름난 도량 ── */}
      <section className="rise rise-d3 mt-12">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          이름난 도량
        </p>

        {/* 지역 칩 */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-3 pt-5">
          {(["전체", ...REGIONS] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] tracking-wider transition-colors ${
                region === r
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* 도량 목록 */}
        <ul className="mt-5 flex flex-col gap-3">
          {temples.map((t) => (
            <li
              key={t.name + t.address}
              className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-keep text-[15px] leading-6 text-hanji">
                    {t.name}
                    <span className="ml-2 text-[11px] tracking-wider text-hanji-faint">
                      {t.mountain}
                      {t.hanja && ` · ${t.hanja}`}
                    </span>
                  </p>
                  <p className="mt-1 break-keep text-[12px] leading-6 text-hanji-dim">
                    {t.note}
                  </p>
                  <p className="mt-1.5 break-keep text-[11px] leading-5 text-hanji-faint">
                    {t.address}
                  </p>
                </div>
                <a
                  href={kakaoMapUrl(t.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full border border-ink-3 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  길 찾기
                </a>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-hanji-faint">
          [길 찾기]를 누르면 카카오맵이 새 창에 열립니다 · {temples.length}곳
        </p>
      </section>
    </div>
  );
}
