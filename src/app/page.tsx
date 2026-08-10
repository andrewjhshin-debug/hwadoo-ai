"use client";

// ─────────────────────────────────────────────────────────────
// 화두 — 첫 화면 (시안 기준)
// 일원상 · 화두 로고 · 슬로건 · 오늘의 화두 (가운데 화두 받기)
// 사유(단상)와 회향(답 쓰기)은 '사유의 방'에서.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import { Dharmachakra } from "@/components/icons";
import { pickHwadu, sessionQuestion, sessionTitle } from "@/lib/hwadu";
import {
  durationLabel,
  formatRemaining,
  isManual,
  isUnlocked,
  loadStore,
  saveStore,
  unlockAt,
  type Store,
} from "@/lib/store";
import { SITE_TAGLINE } from "@/lib/config";

const DURATIONS = [
  { days: 1, label: "하루" },
  { days: 3, label: "사흘" },
  { days: 7, label: "이레" },
  { days: 0, label: "스스로 정함" },
];

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  // 남은 시간 표시를 1분마다 갱신
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const update = (next: Store) => {
    setStore(next);
    saveStore(next);
  };

  const receive = (days: number) => {
    if (!store) return;
    const hwadu = pickHwadu(store.received);
    update({
      ...store,
      current: { hwaduId: hwadu.id, receivedAt: Date.now(), durationDays: days },
      received: store.received + 1,
    });
    setChoosing(false);
  };

  const nextHwadu = () => {
    if (!store?.current) return;
    update({
      ...store,
      history: [...store.history, store.current],
      current: null,
    });
    setChoosing(true);
  };

  const current = store?.current ?? null;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      {/* 일원상 + 로고 + 슬로건 */}
      <div className="rise">
        <Enso size={140} />
      </div>
      <h1 className="text-obang rise rise-d1 mt-6 font-serif text-[42px] font-semibold leading-none tracking-[0.5em] [text-indent:0.5em]">
        화두
      </h1>
      <p className="rise rise-d1 mt-3 text-[13px] font-light tracking-[0.14em] text-hanji-dim">
        {SITE_TAGLINE}
      </p>

      {/* 구분선 + 법륜 */}
      <div className="rise rise-d2 my-10 flex items-center gap-3.5 opacity-80">
        <div className="h-px w-[110px] bg-gradient-to-r from-transparent to-gold/45" />
        <Dharmachakra className="h-[18px] w-[18px]" stroke="#B99A54" />
        <div className="h-px w-[110px] bg-gradient-to-r from-gold/45 to-transparent" />
      </div>

      {store === null ? null : current ? (
        /* ── 들고 있는 화두 ── */
        <section className="rise flex max-w-2xl flex-col items-center">
          <p className="text-xs tracking-[0.34em] text-gold-soft">
            {current.customQuestion
              ? "그대가 던진 화두"
              : `오늘의 화두 · 제${store.received}칙`}
          </p>
          <p className="question-glow mt-6 whitespace-pre-line font-serif text-2xl font-light leading-[1.9] sm:text-3xl">
            {sessionQuestion(current)}
          </p>

          {current.journal ? (
            <>
              <p className="mt-10 text-[13.5px] font-light text-hanji-dim">
                회향을 마친 화두입니다 — 「{sessionTitle(current)}」
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/room"
                  className="border border-ink-3 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/50 hover:text-hanji"
                >
                  스승들의 답 다시 보기
                </Link>
                <button
                  onClick={nextHwadu}
                  className="btn-obang px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
                >
                  다음 화두를 받다
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-10 flex items-center gap-2.5 text-[13.5px] font-light tracking-wide text-hanji-dim">
                <span className="moon" />
                {isManual(current)
                  ? "마음이 무르익었을 때, 붓을 드십시오"
                  : isUnlocked(current)
                    ? "때가 되었습니다. 이제 답을 쓸 수 있습니다"
                    : `달이 차오르는 ${durationLabel(current.durationDays)} 뒤, 답을 쓸 수 있습니다 · ${formatRemaining(unlockAt(current) - Date.now())} 남음`}
              </div>
              <p className="mt-3.5 text-xs tracking-[0.08em] text-hanji-faint">
                서두르지 마십시오. 이 질문에는 검색 결과가 없습니다.
              </p>
              <Link
                href="/room"
                className="btn-obang mt-9 px-8 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
              >
                사유의 방으로 들다
              </Link>
            </>
          )}
        </section>
      ) : choosing ? (
        /* ── 참구 기간 선택 ── */
        <section className="rise flex flex-col items-center">
          <p className="font-serif text-lg font-light leading-9 text-hanji">
            며칠을 이 물음과 함께 하시겠습니까.
          </p>
          <p className="mt-2 text-[13px] font-light text-hanji-dim">
            그 시간이 지나기 전에는, 답을 쓸 수 없습니다.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {DURATIONS.map((o) => (
              <button
                key={o.days}
                onClick={() => receive(o.days)}
                className={`border px-7 py-3.5 text-[13px] tracking-[0.2em] transition-colors hover:border-gold/60 hover:text-gold ${
                  o.days === 3 ? "border-gold/40 text-hanji" : "border-ink-3 text-hanji-dim"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs text-hanji-faint">
            사흘을 권합니다 · '스스로 정함'은 언제든 붓을 들 수 있습니다
          </p>
        </section>
      ) : (
        /* ── 화두 받기 ── */
        <section className="rise flex flex-col items-center">
          <p className="text-xs tracking-[0.34em] text-gold-soft">
            물음 하나를 드리겠습니다
          </p>
          <button
            onClick={() => setChoosing(true)}
            className="btn-obang mt-8 px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            화두 받기
          </button>
          <p className="mt-5 max-w-sm text-xs leading-6 text-hanji-faint">
            받은 물음과 함께 며칠을 보내고, 때가 되면 그대의 답을 씁니다.
            <br />
            정답은 없습니다. 옛 스승들의 답은 그 뒤에 열립니다.
          </p>
        </section>
      )}

      {/* 오방색 점 */}
      <div className="mt-14 flex gap-2.5 opacity-60">
        <i className="h-[5px] w-[5px] rounded-full bg-obang-blue" />
        <i className="h-[5px] w-[5px] rounded-full bg-vermilion" />
        <i className="h-[5px] w-[5px] rounded-full bg-gold" />
        <i className="h-[5px] w-[5px] rounded-full bg-[#E8E2D2]" />
        <i className="h-[5px] w-[5px] rounded-full bg-[#494340]" />
      </div>
    </div>
  );
}
