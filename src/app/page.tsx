"use client";

// ─────────────────────────────────────────────────────────────
// 화두 — 첫 화면
// 화 두 → 슬로건 → [새 화두 받기] → 화두가 뜬다 (기본 사흘)
// → 달이 차오르면 붓을 들어 답을 쓴다 → 옛 스승들의 답 → 다음 화두
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Enso from "@/components/Enso";
import Donation from "@/components/Donation";
import { Dharmachakra } from "@/components/icons";
import { getHwadu, pickHwadu, sessionQuestion } from "@/lib/hwadu";
import {
  durationLabel,
  formatRemaining,
  isUnlocked,
  loadStore,
  saveStore,
  unlockAt,
  type Store,
} from "@/lib/store";
import { SLOGAN } from "@/lib/config";

const DEFAULT_DAYS = 3; // 기본 참구 기간 — 사흘

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
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

  // 새 화두 받기 — 누르면 바로 화두가 뜬다
  const receive = () => {
    if (!store) return;
    const hwadu = pickHwadu(store.received);
    update({
      ...store,
      current: {
        hwaduId: hwadu.id,
        receivedAt: Date.now(),
        durationDays: DEFAULT_DAYS,
      },
      received: store.received + 1,
    });
  };

  // 다음 화두 — 지금 것을 서고에 넣고 곧바로 새 화두를 받는다
  const nextHwadu = () => {
    if (!store?.current) return;
    const hwadu = pickHwadu(store.received);
    update({
      ...store,
      history: [...store.history, store.current],
      current: {
        hwaduId: hwadu.id,
        receivedAt: Date.now(),
        durationDays: DEFAULT_DAYS,
      },
      received: store.received + 1,
    });
    setWriting(false);
    setDraft("");
  };

  const saveJournal = () => {
    if (!store?.current || !draft.trim()) return;
    update({
      ...store,
      current: {
        ...store.current,
        journal: draft.trim(),
        journalAt: Date.now(),
      },
    });
    setDraft("");
    setWriting(false);
  };

  const layDown = () => {
    if (!store?.current) return;
    if (!window.confirm("이 화두를 내려놓으시겠습니까?\n기록 없이 사라집니다."))
      return;
    update({ ...store, current: null });
    setWriting(false);
  };

  const current = store?.current ?? null;
  const hwadu = current ? getHwadu(current.hwaduId) : null;
  const unlocked = current ? isUnlocked(current) : false;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      {/* 일원상 + 화 두 + 슬로건 */}
      <div className="rise">
        <Enso size={140} />
      </div>
      <h1 className="text-obang rise rise-d1 mt-6 font-serif text-[42px] font-semibold leading-none tracking-[0.5em] [text-indent:0.5em]">
        화두
      </h1>
      <p className="rise rise-d1 mt-5 text-[13.5px] font-light tracking-[0.1em] text-hanji-dim">
        &ldquo;{SLOGAN}&rdquo;
      </p>

      {/* 구분선 + 법륜 */}
      <div className="rise rise-d2 my-10 flex items-center gap-3.5 opacity-80">
        <div className="h-px w-[110px] bg-gradient-to-r from-transparent to-gold/45" />
        <Dharmachakra className="h-[18px] w-[18px]" stroke="#B99A54" />
        <div className="h-px w-[110px] bg-gradient-to-r from-gold/45 to-transparent" />
      </div>

      {store === null ? null : !current ? (
        /* ── 화두 받기 ── */
        <section className="rise flex flex-col items-center">
          <button
            onClick={receive}
            className="btn-obang px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            새 화두 받기
          </button>
        </section>
      ) : current.journal ? (
        /* ── 회향을 마쳤다 — 그대의 답 + 옛 스승들의 답 ── */
        <section className="rise flex w-full max-w-2xl flex-col items-center">
          <p className="text-xs tracking-[0.4em] text-gold-soft">
            回向 · 그대의 답
          </p>
          <p className="mt-5 whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
            {current.journal}
          </p>

          <div className="mt-12 w-full border-t border-ink-3 pt-10">
            <p className="text-xs tracking-[0.4em] text-hanji-faint">
              옛 스승들은 이렇게 일렀습니다
            </p>
          </div>
          <div className="mt-8 flex w-full max-w-xl flex-col gap-8 text-left">
            {hwadu?.masters.map((m, i) => (
              <figure key={m.name + i}>
                <blockquote className="whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
                  {m.text}
                </blockquote>
                <figcaption className="mt-3 text-right text-xs tracking-widest text-hanji-dim">
                  — {m.name}
                  {m.era && <span className="text-hanji-faint"> · {m.era}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-8 text-xs leading-6 text-hanji-faint">
            정답은 없습니다. 다만 천 년 전에도 같은 물음을 품은 이들이
            있었습니다.
          </p>

          <div className="mt-12 w-full">
            <Donation />
          </div>

          <button
            onClick={nextHwadu}
            className="btn-obang mt-12 px-9 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
          >
            다음 화두를 받다
          </button>
        </section>
      ) : writing && unlocked ? (
        /* ── 붓을 들었다 — 답 쓰기 ── */
        <section className="rise flex w-full max-w-xl flex-col">
          <p className="whitespace-pre-line text-center font-serif text-sm font-light leading-8 text-hanji-dim">
            {sessionQuestion(current)}
          </p>
          <div className="mt-9 border-t border-ink-3 pt-7">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={9}
              placeholder="며칠을 품고 계셨습니다. 무엇이 보였습니까."
              className="journal-area text-left"
            />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setWriting(false)}
              className="text-xs tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              ← 조금 더 품고 있겠다
            </button>
            <button
              onClick={saveJournal}
              disabled={!draft.trim()}
              className="btn-obang px-8 py-2.5 text-[13px] tracking-[0.3em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
            >
              회향하다
            </button>
          </div>
          <p className="mt-4 text-left text-[11px] text-hanji-faint">
            기록은 이 브라우저에만 남습니다. 우리는 그대의 답을 읽지 않습니다.
          </p>
        </section>
      ) : (
        /* ── 화두를 들고 있다 ── */
        <section className="rise flex max-w-2xl flex-col items-center">
          <p className="text-xs tracking-[0.34em] text-gold-soft">
            오늘의 화두 · 제{store.received}칙
          </p>
          <p className="question-glow mt-6 whitespace-pre-line font-serif text-2xl font-light leading-[1.9] sm:text-3xl">
            {sessionQuestion(current)}
          </p>

          <div className="mt-10 flex items-center gap-2.5 text-[13.5px] font-light tracking-wide text-hanji-dim">
            <span className="moon" />
            {unlocked
              ? "달이 차올랐습니다. 이제 답을 쓸 수 있습니다"
              : `달이 차오르는 ${durationLabel(current.durationDays)} 뒤, 답을 쓸 수 있습니다 · ${formatRemaining(unlockAt(current) - Date.now())} 남음`}
          </div>

          <p className="mt-4 text-xs leading-6 tracking-[0.04em] text-hanji-faint">
            서두르지 마십시오. 질문에는 정답이 없습니다.
            <br />
            생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는 힘이
            중요합니다.
          </p>

          {unlocked && (
            <button
              onClick={() => setWriting(true)}
              className="btn-obang mt-9 px-10 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
            >
              붓을 들다
            </button>
          )}

          <button
            onClick={layDown}
            className="mt-14 text-xs tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            이 화두를 내려놓다
          </button>
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
