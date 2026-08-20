"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로(巡禮) — 가까운 절에 직접 가 보는 자리.
// 순서: 머리글 → [모임 보러 가기](화면을 열자마자 보인다) →
// 이름난 도량(지도) → 다가오는 날. 모임 게시판은 /gathering 에 따로 산다.
// · 지도 팝업 [이 절에 함께 가기]·달력 [이 날 함께 가기]는 절 이름/날짜를
//   주소에 실어 모임 글쓰기로 보낸다.
// 날짜 계산은 클라이언트에서만 — 서버와 하루가 어긋나도 깜빡이지 않게.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  REGIONS,
  TEMPLES,
  upcomingEvents,
  type PilgrimEvent,
  type Region,
} from "@/lib/pilgrimage";

// 지도는 클라이언트에서만 — 첫 페인트를 막지 않게 뒤늦게 불러온다
const TempleMap = dynamic(() => import("@/components/TempleMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full rounded-[14px] border border-ink-3 bg-ink-2/50 md:h-[480px]" />
  ),
});

// Date → "YYYY-MM-DD" (모임 폼의 날짜 칸에 채우는 꼴)
function toDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function PilgrimagePage() {
  const router = useRouter();
  const [events, setEvents] = useState<PilgrimEvent[]>([]);
  const [region, setRegion] = useState<Region | "전체">("전체");
  const [stayOnly, setStayOnly] = useState(false);

  // 오늘 기준 계산 — 클라이언트의 오늘로 센다
  useEffect(() => {
    setEvents(upcomingEvents(8));
  }, []);

  // 지역 필터 AND 템플스테이 필터
  const temples = useMemo(
    () =>
      TEMPLES.filter(
        (t) =>
          (region === "전체" || t.region === region) &&
          (!stayOnly || t.templestay === true)
      ),
    [region, stayOnly]
  );

  // 지도·달력에서 모임으로 — 절 이름/날짜를 주소에 실어 글쓰기를 연다
  const openGathering = (fill: { temple?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (fill.temple) q.set("temple", fill.temple);
    if (fill.date) q.set("date", fill.date);
    q.set("open", "1");
    router.push(`/gathering?${q.toString()}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16 pt-8 md:pt-12">
      {/* ── 머리 ── */}
      <p className="rise text-center text-[13px] tracking-[0.5em] text-gold-soft">
        巡禮 · 손잡고 절로
      </p>
      <p className="question-glow rise rise-d1 mt-7 text-center font-serif text-xl font-light leading-[1.9] text-hanji">
        가까운 절에,
        <br />
        <span className="text-gold-grad">한번 직접 가 보세요.</span>
      </p>
      <p className="rise rise-d1 mt-5 break-keep text-center text-[15px] leading-8 text-hanji-dim">
        절은 불자만 가는 곳이 아닙니다 — 산문은 누구에게나 열려 있습니다.
      </p>

      {/* ── 인연 — 화면을 열자마자 바로 보이는 들목 ── */}
      <Link
        href="/gathering"
        className="btn-obang rise rise-d1 mt-7 w-full rounded-[14px] py-3.5 text-center text-[15px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
      >
        因緣 · 인연 보러 가기 →
      </Link>

      {/* ── 이름난 도량 (지도) ── */}
      <section className="rise rise-d2 mt-12">
        <p className="text-[13px] tracking-[0.3em] text-hanji-faint">
          이름난 도량
        </p>

        {/* 지역 칩 + 템플스테이 토글 — AND 조합 */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-3 pt-5">
          {(["전체", ...REGIONS] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`rounded-full border px-4 py-2 text-[14px] tracking-wider transition-colors ${
                region === r
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setStayOnly((v) => !v)}
            aria-pressed={stayOnly}
            className={`rounded-full border px-4 py-2 text-[14px] tracking-wider transition-colors ${
              stayOnly
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
            }`}
          >
            템플스테이
          </button>
        </div>

        {/* 지도 — 칩을 누르면 마커가 걸러진다 · 절 소개는 마커 팝업으로 */}
        <div className="mt-5">
          <TempleMap
            temples={temples}
            onGather={(name) => openGathering({ temple: name })}
          />
        </div>
      </section>

      {/* ── 다가오는 날 ── */}
      <section className="rise rise-d3 mt-12">
        <p className="text-[13px] tracking-[0.3em] text-hanji-faint">
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
                <div className="w-16 shrink-0 text-left">
                  <p
                    className={`font-serif text-[19px] font-light leading-none ${
                      ev.major ? "text-gold" : "text-hanji"
                    }`}
                  >
                    {ev.date.getMonth() + 1}.{ev.date.getDate()}
                  </p>
                  <p
                    className={`mt-1.5 text-[11.5px] tracking-[0.15em] ${
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
                {/* 이름(한자) · 한 줄 · 이 날 함께 가기 */}
                <div className="min-w-0 flex-1">
                  <p className="break-keep text-[16px] leading-7">
                    <span className={ev.major ? "text-gold" : "text-hanji"}>
                      {ev.name}
                    </span>
                    <span className="ml-2 text-[12px] tracking-wider text-hanji-faint">
                      {ev.hanja}
                    </span>
                  </p>
                  <p className="mt-0.5 break-keep text-[14px] leading-7 text-hanji-dim">
                    {ev.note}
                  </p>
                </div>
                <button
                  onClick={() => openGathering({ date: toDateStr(ev.date) })}
                  className="shrink-0 self-center rounded-full border border-ink-3 px-4 py-2 text-[12.5px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  이 날 함께 가기
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="mt-3 text-[12px] leading-5 text-hanji-faint">
          음력으로 정해진 날들 — 해마다 자동으로 헤아립니다. [이 날 함께
          가기]를 누르면 그 날짜로 인연 글쓰기가 열립니다.
        </p>
      </section>
    </div>
  );
}
