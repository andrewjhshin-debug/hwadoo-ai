"use client";

// ─────────────────────────────────────────────────────────────
// 손잡고 절로(巡禮) — 가까운 절에 직접 가 보는 자리.
// 순서: 머리글 → [인연 보러 가기](화면을 열자마자 보인다) →
// 이름난 도량(지도) → 다가오는 날. 모임 게시판은 /gathering 에 따로 산다.
// · 지도 팝업 [이 절에 함께 가기]·날짜 카드 [함께 가기]는 절 이름/날짜를
//   주소에 실어 모임 글쓰기로 보낸다.
// 날짜 계산은 클라이언트에서만 — 서버와 하루가 어긋나도 깜빡이지 않게.
//
// 다듬은 뜻(왜 이렇게 두었나):
// · 머리글은 두 겹만 — [한자 표제]+[한 줄]. 셋째 줄 "산문은 누구에게나…"는
//   지우지 않고 단추 아래 각주로 내렸다. 뜻은 그대로 두고 읽는 짐만 덜었다.
// · 다가오는 날은 여덟인데 한 번에 다 펴 두면 글이 너무 많다.
//   가장 가까운 셋만 카드로 펴고 나머지는 <details> 로 접는다 — 내용은 온전하다.
// · D-몇을 이 화면에서 가장 큰 글자로 뒀다. "언제 가지"가 이 자리의 물음이다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { watchOnlineCount } from "@/lib/presence";
import MyTemplePicker from "@/components/MyTemplePicker";
import TempleProof from "@/components/TempleProof";
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

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 이모지를 쓰지 않기로 했으므로 필요한 표시는 직접 그린다 ─────────

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h13" />
      <path d="m12.5 6.5 6.5 5.5-6.5 5.5" />
    </svg>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

// 템플스테이 칩에 붙는 기와지붕 — 지도 마커와 같은 말씨로 그렸다
function RoofMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.4 10.2C6.4 7 9.1 5.6 12 5.6s5.6 1.4 8.6 4.6c-2.9-1.6-5.7-2.4-8.6-2.4s-5.7.8-8.6 2.4Z" />
      <path d="M7.2 10.8V18M16.8 10.8V18M5.2 18.6h13.6" />
    </svg>
  );
}

export default function PilgrimagePage() {
  const router = useRouter();
  const [events, setEvents] = useState<PilgrimEvent[]>([]);
  // 지금 도량에 몇이 들어와 있나 — 같이 갈 사람을 찾는 방이라 여기가 제자리다
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => watchOnlineCount(setOnline), []);
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

  // 지도·날짜 카드에서 모임으로 — 절 이름/날짜를 주소에 실어 글쓰기를 연다
  const openGathering = (fill: { temple?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (fill.temple) q.set("temple", fill.temple);
    if (fill.date) q.set("date", fill.date);
    q.set("open", "1");
    router.push(`/gathering?${q.toString()}`);
  };

  // 가장 가까운 하나는 크게, 그다음 둘은 카드로, 나머지는 접어 둔다
  const [first, ...rest] = events;
  const near = rest.slice(0, 2);
  const later = rest.slice(2);

  // 접힌 쪽과 펼친 쪽이 같은 꼴이어야 해서 카드 하나를 함수로 뽑았다
  const dayCard = (ev: PilgrimEvent) => (
    <article
      key={`${ev.name}-${ev.date.getTime()}`}
      className="flex items-center gap-4 rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5"
    >
      {/* D-몇 — 카드에서 가장 먼저 읽히는 자리 */}
      <div className="w-[54px] shrink-0">
        {ev.dDay === 0 ? (
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
              {ev.dDay}
            </span>
          </p>
        )}
        <p className="mt-2 text-[11.5px] tracking-[0.1em] text-hanji-faint">
          {ev.date.getMonth() + 1}.{ev.date.getDate()}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="break-keep text-[15px] leading-6">
          <span className={ev.major ? "text-gold" : "text-hanji"}>
            {ev.name}
          </span>
          <span className="ml-1.5 text-[11.5px] tracking-wider text-hanji-faint">
            {ev.hanja}
          </span>
        </p>
        <p className="mt-1 break-keep text-[13px] leading-6 text-hanji-dim">
          {ev.note}
        </p>
      </div>

      {/* 글자는 줄이되 뜻은 aria-label 로 온전히 남긴다 */}
      <button
        onClick={() => openGathering({ date: toDateStr(ev.date) })}
        aria-label={`${ev.date.getMonth() + 1}월 ${ev.date.getDate()}일 ${ev.name} — 이 날 함께 가기`}
        className="shrink-0 self-center rounded-full border border-ink-3 px-3.5 py-2 text-[12px] tracking-[0.1em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
      >
        함께 가기
      </button>
    </article>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-16 pt-8 md:pt-12">
      {/* ── 머리 ──
             연꽃·공덕 알약을 여기 걸어 뒀는데, 이 방에서 쓰는 셈이 아니다.
             연꽃은 법당과 쪽지에서 쓰고, 여기서 하는 일은 절에 가는 것이다.
             대신 **지금 도량에 몇이 들어와 있는지**를 건다 — 떠 있는 단추
             어깨에 붙은 수보다 여기가 제자리다. 혼자가 아니라는 말이
             「같이 갈 사람」을 찾는 방의 첫 줄에 있어야 한다. */}
      <div className="rise flex items-center gap-2">
        <span aria-hidden className="w-0 shrink-0 sm:w-[86px]" />
        <p className="min-w-0 flex-1 truncate text-center text-[13px] tracking-[0.28em] text-gold-soft sm:tracking-[0.5em]">
          巡禮 · 손잡고 절로
        </p>
        <span className="w-0 shrink-0 text-right text-[11px] text-hanji-faint sm:w-[86px]">
          {online !== null && online > 0 ? (
            <>
              <span className="tabular-nums text-gold-soft">{online}</span>명
            </>
          ) : null}
        </span>
      </div>
      {online !== null && online > 0 && (
        <p className="rise mt-1 text-center text-[11px] text-hanji-faint">
          지금 도량에 <span className="tabular-nums text-gold-soft">{online}</span>명이
          들어와 있습니다
        </p>
      )}
      <p className="question-glow rise rise-d1 mt-7 text-center font-serif text-[26px] font-light leading-[1.7] text-hanji">
        가까운 절에,
        <br />
        <span className="text-gold-grad">한번 직접 가 보세요.</span>
      </p>

      {/* ── 인연 — 화면을 열자마자 바로 보이는 들목 ── */}
      <Link
        href="/gathering"
        className="btn-obang rise rise-d1 mt-8 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-center text-[15px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
      >
        因緣 · 인연 보러 가기
        <Arrow className="h-4 w-4" />
      </Link>
      <p className="rise rise-d1 mt-3.5 break-keep text-center text-[12.5px] leading-6 text-hanji-faint">
        산문은 누구에게나 열려 있습니다.
      </p>

      {/* ── 우리 절 — 같은 절 다니는 사람끼리 알아본다 ── */}
      <MyTemplePicker className="rise rise-d1 mt-6" />

      {/* ── 다녀왔다는 표 — 절 안에 서 있을 때만 눌린다(위치 500m).
           사진이나 체크가 아니라 위치로 놓은 까닭은, 그것만이
           "갔다"를 거짓말 없이 말해 주기 때문이다. ── */}
      <TempleProof className="rise rise-d1 mt-4" />

      {/* ── 이름난 도량 (지도) ── */}
      <section className="rise rise-d2 mt-12">
        <div className="flex items-end justify-between gap-4 border-b border-ink-3 pb-4">
          <p className="text-[13px] tracking-[0.3em] text-hanji-faint">
            이름난 도량
          </p>
        </div>

        {/* 지역 칩 + 템플스테이 토글 — AND 조합 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["전체", ...REGIONS] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              aria-pressed={region === r}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] tracking-wide transition-colors ${
                region === r
                  ? "border-transparent bg-hanji text-ink"
                  : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
              }`}
            >
              {r}
            </button>
          ))}
          {/* 결이 다른 갈래라 가는 금줄로 한 칸 떼어 둔다 */}
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-ink-3" />
          <button
            onClick={() => setStayOnly((v) => !v)}
            aria-pressed={stayOnly}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] tracking-wide transition-colors ${
              stayOnly
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:border-gold/40 hover:text-hanji"
            }`}
          >
            <RoofMark className="h-4 w-4" />
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
        <p className="border-b border-ink-3 pb-4 text-[13px] tracking-[0.3em] text-hanji-faint">
          다가오는 날
        </p>

        {events.length === 0 ? (
          <p className="mt-4 rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-6 text-center text-[13px] text-hanji-faint">
            달력을 살펴보는 중…
          </p>
        ) : (
          <>
            {/* 가장 가까운 하루 — D-몇을 크게 */}
            <article className="mt-4 rounded-[14px] border border-ink-3 bg-ink-2/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[12px] tracking-[0.18em] text-hanji-faint">
                    {first.date.getMonth() + 1}월 {first.date.getDate()}일{" "}
                    {WEEKDAY[first.date.getDay()]}
                  </p>
                  <p
                    className={`mt-2.5 break-keep font-serif text-[22px] font-light leading-snug ${
                      first.major ? "text-gold" : "text-hanji"
                    }`}
                  >
                    {first.name}
                  </p>
                  <p className="mt-1.5 text-[12px] tracking-[0.2em] text-hanji-faint">
                    {first.hanja}
                  </p>
                </div>
                <div className="shrink-0 text-right leading-none">
                  {first.dDay === 0 ? (
                    <span className="font-serif text-[42px] font-light text-vermilion">
                      오늘
                    </span>
                  ) : (
                    <span className="flex items-baseline justify-end gap-1">
                      <span className="text-[13px] tracking-[0.15em] text-hanji-faint">
                        D-
                      </span>
                      <span
                        className={`font-serif text-[58px] font-light sm:text-[68px] ${
                          first.major ? "text-gold" : "text-hanji"
                        }`}
                      >
                        {first.dDay}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-3 break-keep text-[14px] leading-7 text-hanji-dim">
                {first.note}
              </p>
              <button
                onClick={() => openGathering({ date: toDateStr(first.date) })}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-ink-3 py-3 text-[13.5px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
              >
                이 날 함께 가기
                <Arrow className="h-4 w-4" />
              </button>
            </article>

            {/* 그다음 둘 */}
            {near.length > 0 && (
              <div className="mt-3 space-y-3">{near.map(dayCard)}</div>
            )}

            {/* 나머지는 접어 둔다 — 지우지 않았다 */}
            {later.length > 0 && (
              <details className="group mt-3">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-ink-3 py-2.5 text-[12.5px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji [&::-webkit-details-marker]:hidden">
                  다음 {later.length}개 더 보기
                  <Chevron className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 space-y-3">{later.map(dayCard)}</div>
              </details>
            )}
          </>
        )}

        <p className="mt-4 text-[11.5px] leading-5 text-hanji-faint">
          음력 날짜는 해마다 저절로 헤아립니다.
        </p>
      </section>
    </div>
  );
}
