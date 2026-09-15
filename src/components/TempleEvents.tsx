"use client";

// ────────────────────────────────────────────────────────────────
// 다가오는 절 행사 — 음력으로 돌아가는 일정을 한 화면에.
//
// 왜 useEffect에서 채우는가: 목록이 '오늘'에서 시작하는데, 서버가 그린
// 오늘과 브라우저의 오늘은 시차 때문에 하루 어긋날 수 있다. 서버에서
// 미리 그리면 하이드레이션이 깨지므로 첫 그림은 빈 자리만 잡아 두고,
// 브라우저가 제 날짜로 다시 채운다(자리 높이를 맞춰 화면이 안 튀게).
//
// 날짜가 해마다 바뀌는 재는 아래 칸에 따로 둔다 — 날을 지어내느니
// 절 문 앞까지만 데려다주는 편이 낫다.
// ────────────────────────────────────────────────────────────────

import {
  LOOSE_EVENTS,
  TEMPLE_SITES,
  daysUntil,
  upcomingEvents,
  type TempleEvent,
} from "@/lib/templeEvents";
import { useEffect, useState } from "react";

type Row = { ev: TempleEvent; dday: number };

export default function TempleEvents({
  limit = 6,
  days = 120,
}: {
  limit?: number;
  days?: number;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const now = new Date();
    // 효과 안에서 바로 setState 하는 걸 린트가 말리지만, 여기서는 그게 목적이다.
    // 브라우저의 '오늘'은 서버가 알 수 없으니 그림을 두 번 그릴 수밖에 없다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(
      upcomingEvents(now, days)
        .slice(0, limit)
        .map((ev) => ({ ev, dday: daysUntil(ev.when, now) }))
    );
  }, [limit, days]);

  return (
    <section className="w-full">
      {/* ── 머리 ── */}
      <h2 className="font-serif text-[19px] font-light text-hanji">
        다가오는 절 행사
        <span className="ml-2 align-middle text-[11px] tracking-[0.25em] text-gold-soft">
          寺刹行事
        </span>
      </h2>

      {/* ── 날이 정해진 행사 ── */}
      <div className="mt-4 flex flex-col gap-2">
        {rows === null
          ? // 자리만 — 브라우저가 제 날짜로 채울 때까지
            Array.from({ length: limit }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="h-[90px] rounded-[14px] border border-ink-3 bg-ink-2/30"
              />
            ))
          : rows.map(({ ev, dday }) => (
              <article
                key={ev.id}
                className="flex items-center gap-4 rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5"
              >
                {/* 며칠 남았는지 — 카드에서 가장 먼저 읽히는 자리.
                    양력과 음력을 한 줄에 붙이면 이 폭에서 넘치므로 쌓는다 */}
                <div className="w-[58px] shrink-0">
                  {dday === 0 ? (
                    <p className="font-serif text-[24px] font-light leading-none text-vermilion">
                      오늘
                    </p>
                  ) : (
                    <p className="flex items-baseline gap-0.5 leading-none">
                      <span className="text-[11px] tracking-[0.1em] text-hanji-faint">
                        D-
                      </span>
                      <span
                        className={`font-serif text-[30px] font-light ${
                          ev.major ? "text-gold" : "text-hanji"
                        }`}
                      >
                        {dday}
                      </span>
                    </p>
                  )}
                  <p className="mt-1.5 text-[11.5px] leading-[1.35] tracking-[0.08em] text-hanji-dim">
                    {ev.when.getMonth() + 1}.{ev.when.getDate()}
                  </p>
                  {ev.lunar && (
                    <p className="text-[10.5px] leading-[1.35] tracking-[0.04em] text-hanji-faint">
                      {ev.lunar}
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-keep text-[15px] leading-6">
                    <span className={ev.major ? "text-gold" : "text-hanji"}>
                      {ev.name}
                    </span>
                    {ev.hanja && (
                      <span className="ml-1.5 text-[11.5px] tracking-wider text-hanji-faint">
                        {ev.hanja}
                      </span>
                    )}
                    {ev.temple && (
                      <span className="ml-2 text-[12px] text-gold-soft">
                        {ev.temple}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 break-keep text-[13px] leading-6 text-hanji-dim">
                    {ev.say}
                  </p>
                </div>

                {ev.link && (
                  <a
                    href={ev.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${ev.temple ?? ev.name} 홈페이지 — 새 창`}
                    className="shrink-0 self-center rounded-full border border-ink-3 px-3 py-2 text-[12px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                  >
                    절로 →
                  </a>
                )}
              </article>
            ))}
      </div>

      {/* ── 날이 해마다 바뀌는 재 ── */}
      <p className="mt-8 text-[11.5px] tracking-[0.2em] text-hanji-faint">
        해마다 날이 바뀌는 재 · 齋
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {LOOSE_EVENTS.map((e) => (
          <li key={e.id} className="break-keep text-[13.5px] leading-6">
            <span className="text-gold-soft">{e.temple}</span>
            <span className="mx-1.5 text-hanji-faint">·</span>
            <span className="text-hanji">{e.name}</span>
            {e.hanja && (
              <span className="ml-1.5 text-[11px] tracking-wider text-hanji-faint">
                {e.hanja}
              </span>
            )}
            <span className="ml-2 inline-block rounded-full border border-ink-3 px-2 py-0.5 align-middle text-[10.5px] text-hanji-faint">
              해마다 다름
            </span>
            <span className="block text-[12.5px] leading-6 text-hanji-dim">
              {e.say} <span className="text-hanji-faint">{e.guide}</span>
              {e.link && (
                <a
                  href={e.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ml-1.5 text-gold-soft underline-offset-4 hover:underline"
                >
                  홈페이지 →
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* ── 일정을 절에서 여는 곳 ── */}
      <p className="mt-8 text-[11.5px] tracking-[0.2em] text-hanji-faint">
        그해 일정은 절에
      </p>
      <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-2">
        {TEMPLE_SITES.map((t) => (
          <a
            key={t.name}
            href={t.link}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[12.5px] text-hanji-dim transition-colors hover:text-gold"
          >
            {t.name}
          </a>
        ))}
      </p>
    </section>
  );
}
