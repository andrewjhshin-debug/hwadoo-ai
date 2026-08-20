"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로(巡禮) — 가까운 절에 직접 가 보는 자리.
// 순서: 지도(이름난 도량) → 모임(함께 가는 약속) → 다가오는 날.
// · 지도: 전국 도량을 지역 칩·템플스테이 칩(AND)으로 거르고,
//   절 소개·길찾기·[이 절에 함께 가기]는 마커 팝업으로 연다.
// · 모임: 여기는 다가오는 약속 셋만(미리보기) — 마당은 /gathering.
//   지도 팝업·다가오는 날의 [함께 가기]는 절 이름/날짜를 주소에 실어
//   모임 페이지로 보낸다 (목록이 길어져도 이 화면은 짧게 머문다).
// · 다가오는 날: 음력 일정을 해마다 자동 계산, 가까운 순 여덟.
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

  // 지도·달력에서 모임으로 — 절 이름/날짜를 주소에 실어 모임 페이지로 보낸다
  const openGathering = (fill: { temple?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (fill.temple) q.set("temple", fill.temple);
    if (fill.date) q.set("date", fill.date);
    q.set("open", "1");
    router.push(`/gathering?${q.toString()}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16 pt-8 md:pt-12">
      {/* ── 머리 — 에두르지 않고 청한다 ── */}
      <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        巡禮 · 손잡고 절로
      </p>
      <p className="question-glow rise rise-d1 mt-7 text-center font-serif text-xl font-light leading-[1.9] text-hanji">
        가까운 절에,
        <br />
        <span className="text-gold-grad">한번 직접 가 보세요.</span>
      </p>
      <p className="rise rise-d2 mt-6 break-keep text-center text-[13px] leading-7 text-hanji-dim">
        절은 불자만 가는 곳이 아닙니다 — 산문은 누구에게나 열려 있습니다.
        <br className="hidden sm:block" /> 지도에서 절을 고르고, 함께 갈 이를
        모으고, 좋은 날을 잡으세요.
      </p>

      {/* ── 구획 1 · 이름난 도량 (지도) ── */}
      <section className="rise rise-d2 mt-12">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          이름난 도량
        </p>

        {/* 지역 칩 + 템플스테이 토글 — AND 조합 */}
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
          <button
            onClick={() => setStayOnly((v) => !v)}
            aria-pressed={stayOnly}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] tracking-wider transition-colors ${
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

      {/* ── 구획 2 · 모임 — 목록은 여기 두지 않는다, 마당은 /gathering ── */}
      <section className="rise rise-d3 mt-12">
        <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
          모임 — 함께 가는 약속
        </p>
        <div className="mt-4 border-t border-ink-3 pt-5">
          <p className="break-keep text-[13px] leading-7 text-hanji-dim">
            혼자 나서기 어색하면, 함께 갈 이를 만나세요 — 약속은 모임
            마당에서 잡습니다.
          </p>
          <div className="mt-4">
            <Link
              href="/gathering"
              className="inline-block rounded-[10px] border border-gold/50 px-5 py-2.5 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10"
            >
              모임 보러 가기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 구획 3 · 다가오는 날 ── */}
      <section className="rise rise-d3 mt-12">
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
                {/* 이름(한자) · 한 줄 · 이 날 함께 가기 */}
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
                <button
                  onClick={() => openGathering({ date: toDateStr(ev.date) })}
                  className="shrink-0 self-center rounded-full border border-ink-3 px-3.5 py-1.5 text-[11px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
                >
                  이 날 함께 가기
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-hanji-faint">
          음력으로 정해진 날들 — 해마다 자동으로 헤아립니다. [이 날 함께
          가기]를 누르면 그 날짜로 모임이 열립니다.
        </p>
      </section>
    </div>
  );
}
