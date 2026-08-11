"use client";

// ─────────────────────────────────────────────────────────────
// 화두 — 첫 화면
// 화두가 없을 때: 화 두 + 슬로건 + [새 화두 받기]
// 화두를 들고 있을 때: 질문이 화면의 주인공. 로고는 물러난다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import Donation from "@/components/Donation";
import NotesDrawer from "@/components/NotesDrawer";
import { Banga, Dharmachakra, Lotus } from "@/components/icons";
import {
  flatQuestion,
  bankCount,
  getHwadu,
  pickRandomHwadu,
  sessionQuestion,
} from "@/lib/hwadu";
import Question from "@/components/Question";
import { fetchPublicHwadu, type PublicHwadu } from "@/lib/thrown";
import {
  decrementHolding,
  fetchHoldingCount,
  incrementHolding,
} from "@/lib/holding";
import { todayGuide } from "@/lib/guidance";
import { dayCount } from "@/lib/store";
import {
  durationLabel,
  formatCountdown,
  isUnlocked,
  loadStore,
  saveStore,
  unlockAt,
  type Store,
} from "@/lib/store";
import { SLOGAN } from "@/lib/config";
import {
  shareAnswer,
  fetchSharedAnswers,
  type SharedAnswer,
} from "@/lib/community";

// 불교 전통의 리듬 — 하루, 삼일기도, 칠일 정진, 삼칠일(3×7일), 백팔일(108 번뇌)
const DAY_OPTIONS = [1, 3, 7, 21, 108];
const DAY_NOTE: Record<number, string> = {
  1: "하루 — 첫걸음",
  3: "사흘 — 삼일기도의 리듬",
  7: "이레 — 칠일 용맹정진",
  21: "삼칠일 — 세 이레, 회향의 단위",
  108: "백팔일 — 백팔번뇌를 마주하는 가장 깊은 참구",
};

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [publicPool, setPublicPool] = useState<PublicHwadu[]>([]);
  const [holdingCount, setHoldingCount] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswer[]>([]);

  // 화두 로고를 누르면 — 어떤 상태(화두만 보기 등)에서도 뜰 화면으로
  useEffect(() => {
    const toHome = () => {
      setFocusMode(false);
      setWriting(false);
    };
    window.addEventListener("hwadoo-nav-home", toHome);
    return () => window.removeEventListener("hwadoo-nav-home", toHome);
  }, []);

  useEffect(() => {
    setStore(loadStore());
    // 승인된 '던져진 화두'들을 랜덤 풀에 합류시킨다 (실패해도 기본 30칙으로 동작)
    fetchPublicHwadu().then(setPublicPool).catch(() => {});
  }, []);

  // 지금 이 물음을 몇 명이 들고 있는가
  useEffect(() => {
    const id = store?.current?.hwaduId;
    if (!id) {
      setHoldingCount(null);
      return;
    }
    fetchHoldingCount(id).then(setHoldingCount);
  }, [store?.current?.hwaduId]);

  // 다른 기기에서 온 변화(로그인 동기화)를 화면에 즉시 반영
  useEffect(() => {
    const onRemote = (e: Event) => {
      if ((e as CustomEvent).detail?.source === "remote") {
        setStore(loadStore());
      }
    };
    window.addEventListener("hwadoo-store-updated", onRemote);
    return () => window.removeEventListener("hwadoo-store-updated", onRemote);
  }, []);

  // 카운트다운 — 1초마다 갱신
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 회향을 마치면, 같은 화두에 다른 수행자들이 남긴 답을 불러온다
  useEffect(() => {
    const cur = store?.current;
    if (cur?.journal && cur.hwaduId) {
      fetchSharedAnswers(cur.hwaduId)
        .then(setSharedAnswers)
        .catch(() => setSharedAnswers([]));
    } else {
      setSharedAnswers([]);
    }
  }, [store?.current?.journal, store?.current?.hwaduId]);

  const update = (next: Store) => {
    setStore(next);
    saveStore(next);
  };

  // 화두를 받는다 — 랜덤. 기본 30칙 + 승인된 던져진 화두. 지나온 것은 피해서.
  const receive = (base: Store) => {
    const exclude = [
      ...base.history.map((s) => s.hwaduId),
      ...(base.current ? [base.current.hwaduId] : []),
    ];
    const audience = base.audience ?? "adult";
    // 서버 화두 — 지금 대상(성인/학생)에 맞는 것만 섞는다
    const freshPublic = publicPool.filter(
      (p) => (p.audience ?? "adult") === audience && !exclude.includes(`thrown:${p.id}`)
    );
    const total = bankCount(audience) + freshPublic.length;
    let newId: string;
    if (freshPublic.length > 0 && Math.random() < freshPublic.length / total) {
      const p = freshPublic[Math.floor(Math.random() * freshPublic.length)];
      newId = `thrown:${p.id}`;
      update({
        ...base,
        current: {
          hwaduId: newId,
          customQuestion: p.question,
          customSource: p.source,
          receivedAt: Date.now(),
          durationDays: base.defaultDays ?? 3,
        },
        received: base.received + 1,
      });
    } else {
      const hwadu = pickRandomHwadu(exclude, audience);
      newId = hwadu.id;
      update({
        ...base,
        current: {
          hwaduId: newId,
          receivedAt: Date.now(),
          durationDays: base.defaultDays ?? 3,
        },
        received: base.received + 1,
      });
    }
    incrementHolding(newId); // 함께 들고 있는 수 +1
    setWriting(false);
    setDraft("");
  };

  const nextHwadu = () => {
    if (!store?.current) return;
    decrementHolding(store.current.hwaduId); // 이 물음은 내려놓았다
    receive({ ...store, history: [...store.history, store.current], current: null });
  };

  const saveJournal = () => {
    if (!store?.current || !draft.trim()) return;
    const answer = draft.trim();
    const hwaduId = store.current.hwaduId;
    update({
      ...store,
      current: { ...store.current, journal: answer, journalAt: Date.now() },
    });
    setDraft("");
    setWriting(false);
    // 동의를 받아 다른 수행자에게도 보여준다 (익명)
    if (
      window.confirm(
        "그대의 답을, 같은 화두를 든 다른 수행자에게도 보여드려도 괜찮겠습니까?\n\n이름 없이 — 낱말 이름으로만 남습니다."
      )
    ) {
      shareAnswer(hwaduId, answer).catch(() => {});
    }
  };

  const layDown = () => {
    if (!store?.current) return;
    if (!window.confirm("이 화두를 내려놓으시겠습니까?\n기록 없이 사라집니다."))
      return;
    decrementHolding(store.current.hwaduId);
    update({ ...store, current: null });
    setWriting(false);
  };

  // 참구 기간 변경 — 지금 화두와 앞으로의 기본값 모두에 적용
  const setDays = (days: number) => {
    if (!store) return;
    update({
      ...store,
      defaultDays: days,
      current: store.current ? { ...store.current, durationDays: days } : null,
    });
    setShowSettings(false);
  };

  const current = store?.current ?? null;
  const hwadu = current ? getHwadu(current.hwaduId) : null;
  const unlocked = current ? isUnlocked(current) : false;

  // ── 화두가 없다 — 브랜드 얼굴 ──────────────────────────
  if (store !== null && !current) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-start px-6 pb-14 pt-8 text-center sm:justify-center sm:py-14">
        <div className="rise">
          <Enso size={140} />
        </div>
        <h1 className="text-obang rise rise-d1 mt-6 font-serif text-[42px] font-semibold leading-none tracking-[0.5em] [text-indent:0.5em]">
          화두
        </h1>
        <p className="rise rise-d1 mt-2.5 text-[10px] tracking-[0.6em] text-gold-soft">
          HWADU
        </p>
        <p className="rise rise-d1 mt-6 text-[13.5px] font-light tracking-[0.1em] text-hanji-dim">
          &ldquo;{SLOGAN}&rdquo;
        </p>
        <div className="rise rise-d2 my-10 flex items-center gap-3.5 opacity-80">
          <div className="h-px w-[110px] bg-gradient-to-r from-transparent to-gold/45" />
          <Dharmachakra className="h-[18px] w-[18px]" stroke="#B99A54" />
          <div className="h-px w-[110px] bg-gradient-to-r from-gold/45 to-transparent" />
        </div>
        <button
          onClick={() => store && receive(store)}
          className="btn-obang rise rise-d2 inline-flex items-center gap-2.5 px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          <Lotus className="h-[18px] w-[18px]" stroke="#B99A54" />
          <span>새 화두 받기</span>
        </button>

        {/* 누구의 화두인가 — 채워진 알약 스위치 (클릭으로만 바뀜) */}
        <div className="rise rise-d3 mt-7 inline-flex rounded-full border border-ink-3 bg-ink-2 p-1 text-xs">
          {(
            [
              { key: "adult", label: "성인의 화두" },
              { key: "student", label: "학생·어린이" },
            ] as const
          ).map((o) => {
            const active = (store?.audience ?? "adult") === o.key;
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={active}
                onClick={() => store && update({ ...store, audience: o.key })}
                className={`rounded-full px-5 py-2 tracking-[0.1em] transition-colors ${
                  active
                    ? "bg-gold font-medium text-ink"
                    : "bg-transparent text-hanji-faint"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
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

  if (!store || !current) return null;

  // ── 회향을 마쳤다 ──────────────────────────────────────
  if (current.journal) {
    return (
      <div className="flex flex-1 flex-col items-center px-6 py-14">
        <section className="rise flex w-full max-w-2xl flex-col items-center text-center">
          <p className="text-xs tracking-[0.4em] text-gold-soft">
            回向 · 그대의 답
          </p>
          <p className="mt-5 whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
            {current.journal}
          </p>

          {/* 다른 수행자들은 이렇게 답했습니다 — 동의를 받아 공유된 회향 */}
          {sharedAnswers.length > 0 && (
            <>
              <div className="mt-12 w-full border-t border-ink-3 pt-10">
                <p className="text-xs tracking-[0.4em] text-hanji-faint">
                  다른 수행자들은 이렇게 답했습니다
                </p>
              </div>
              <div className="mt-8 flex w-full max-w-xl flex-col gap-8 text-left">
                {sharedAnswers.map((a) => (
                  <figure key={a.id}>
                    <blockquote className="whitespace-pre-line break-keep font-serif text-[15px] font-light leading-9 text-hanji-dim">
                      {a.answer}
                    </blockquote>
                    <figcaption className="mt-3 text-right text-xs tracking-widest text-hanji-faint">
                      — {a.authorName}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}

          <div className="mt-12 w-full border-t border-ink-3 pt-10">
            <p className="text-xs tracking-[0.4em] text-hanji-faint">
              {current.hwaduId.startsWith("thrown:")
                ? "이 물음에 대하여"
                : "옛 스승들은 이렇게 일렀습니다"}
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
            {current.hwaduId.startsWith("thrown:")
              ? "이 화두는 어느 낯선 이가 던진 것 — 스승의 답은 없습니다. 그대의 답이 첫 답입니다."
              : "정답은 없습니다. 다만 천 년 전에도 같은 물음을 품은 이들이 있었습니다."}
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
      </div>
    );
  }

  // ── 붓을 들었다 — 답 쓰기 ─────────────────────────────
  if (writing && unlocked) {
    return (
      <div className="flex flex-1 flex-col">
        {/* 채팅형 회향 — 위: 화두(물음), 가운데: 대화, 아래 고정: 입력창 */}
        <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-40 pt-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            {/* 화두 — 스승의 물음처럼 왼쪽 말풍선 */}
            <div className="flex flex-col items-start">
              <span className="mb-1.5 text-[10px] tracking-[0.3em] text-hanji-faint">
                화두
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ink-3 bg-ink-2/60 px-4 py-3">
                <p className="whitespace-pre-line break-keep font-serif text-[15px] font-light leading-8 text-hanji">
                  {flatQuestion(sessionQuestion(current))}
                </p>
              </div>
            </div>
            {/* 안내 말풍선 */}
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-2/40 px-4 py-3">
                <p className="text-[12.5px] leading-6 text-hanji-dim">
                  며칠을 품고 계셨습니다. 무엇이 보였습니까.
                  <br />
                  아래에 그대의 답을 적어, 회향하십시오.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* 하단 고정 입력창 — AI 채팅처럼 */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-3 bg-ink/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur md:absolute">
          <div className="mx-auto flex w-full max-w-xl items-end gap-2">
            <button
              onClick={() => setWriting(false)}
              className="shrink-0 pb-2 text-[11px] tracking-wider text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              나가기
            </button>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.slice(0, 500));
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              rows={3}
              maxLength={500}
              placeholder="그대의 답을 적으십시오…"
              className="max-h-[60vh] min-h-[96px] flex-1 resize-none overflow-hidden rounded-2xl border border-ink-3 bg-ink-2/60 px-4 py-3 text-[15px] leading-7 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/40"
            />
            <button
              onClick={saveJournal}
              disabled={!draft.trim()}
              className="btn-obang shrink-0 rounded-full px-5 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
            >
              회향
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-xl text-center text-[10px] text-hanji-faint">
            기록은 이 브라우저에만 남습니다 · {draft.length}/500
          </p>
        </div>
      </div>
    );
  }

  // ── 화두를 들고 있다 — 질문이 주인공 ────────────────────
  // 화두만 보기 — 오직 화두 하나만, 되돌아가기 버튼과 함께
  if (focusMode) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {hwadu?.hanja && (
          <p className="text-xs tracking-[0.6em] text-hanji-faint">
            {hwadu.hanja}
          </p>
        )}
        <div className="question-glow mt-8 w-full max-w-2xl">
          <Question text={sessionQuestion(current)} className="text-hanji" />
        </div>
        <button
          onClick={() => setFocusMode(false)}
          className="mt-16 border border-ink-3 px-7 py-2.5 text-xs tracking-[0.25em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
        >
          되돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-start px-6 pb-14 pt-2 text-center sm:justify-center sm:py-14">
      <section className="rise flex w-full max-w-2xl flex-col items-center">
        {/* 질문 — 눈높이, 화면의 주인공 */}
        {hwadu?.hanja && (
          <p className="text-xs tracking-[0.6em] text-hanji-faint">
            {hwadu.hanja}
          </p>
        )}
        <div className="question-glow mt-7 w-full">
          <Question text={sessionQuestion(current)} className="text-hanji" />
        </div>
        {(hwadu?.context || current.customSource) && (
          <p className="mt-7 text-xs tracking-wider text-hanji-faint">
            {hwadu?.context ?? current.customSource}
          </p>
        )}

        {/* 화두만 보기 — 질문 바로 아래, 위쪽에 */}
        <button
          onClick={() => setFocusMode(true)}
          className="mt-6 border border-gold/40 px-6 py-2 text-[11px] tracking-[0.25em] text-gold-soft transition-colors hover:bg-gold/10 hover:text-gold"
        >
          화두만 보기
        </button>

        {/* 함께 드는 이들 */}
        {holdingCount !== null && (
          <p className="mt-5 text-[12px] tracking-wide text-gold-soft">
            {holdingCount >= 2
              ? `지금 이 물음을 ${holdingCount}명이 함께 들고 있습니다`
              : "이 물음을 든 사람은, 지금 그대뿐입니다"}
          </p>
        )}

        {/* 달 + 카운트다운 */}
        <div className="mt-12 flex flex-col items-center gap-3 text-hanji-dim">
          {/* 달 — 가운데 위 */}
          <span className="moon !h-[26px] !w-[26px]" />
          {unlocked ? (
            <span className="text-[17px] font-light tracking-wide">
              달이 차올랐습니다. 이제 답을 쓸 수 있습니다
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1.5">
              <span className="text-[16px] font-light leading-snug tracking-wide">
                달이 차오르는 {durationLabel(current.durationDays)} 뒤, 답을 쓸 수
                있습니다
              </span>
              <span className="text-[19px] font-light">
                <span className="tabular-nums text-hanji">
                  {formatCountdown(unlockAt(current) - Date.now())}
                </span>{" "}
                남음
              </span>
            </span>
          )}
        </div>

        <p className="mt-4 text-xs leading-6 tracking-[0.04em] text-hanji-faint">
          서두르지 마십시오. 질문에는 정답이 없습니다.
          <br />
          생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는 힘이
          중요합니다.
        </p>

        {/* 오늘의 참구법 — 날마다 다른 사유의 길 */}
        {!unlocked && (
          <div className="mt-8 w-full max-w-md border border-ink-3 bg-ink-2/50 px-6 py-5">
            <p className="text-[11px] tracking-[0.34em] text-gold-soft">
              오늘의 참구법 · {dayCount(current)}일째
            </p>
            <p className="mt-3 text-[13.5px] font-light leading-7 text-hanji-dim">
              {todayGuide(dayCount(current))}
            </p>
          </div>
        )}

        {/* 기간 바꾸기 */}
        {!unlocked && (
          <div className="mt-7">
            {showSettings ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`border px-4 py-2 text-xs tracking-[0.15em] transition-colors ${
                        current.durationDays === d
                          ? "border-gold/60 text-gold"
                          : "border-ink-3 text-hanji-dim hover:text-hanji"
                      }`}
                    >
                      {durationLabel(d)}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] tracking-wide text-hanji-faint">
                  {DAY_NOTE[current.durationDays] ?? ""}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs tracking-widest text-hanji-faint underline decoration-ink-3 underline-offset-4 transition-colors hover:text-hanji-dim"
              >
                기간 바꾸기
              </button>
            )}
          </div>
        )}

        {unlocked && (
          <button
            onClick={() => setWriting(true)}
            className="btn-obang mt-9 px-10 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            붓을 들다
          </button>
        )}

        {/* 사유의 방 — 누르면 오른쪽 서랍이 열리고, 다시 누르면 접힌다 */}
        <button
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
          className={`${unlocked ? "mt-5" : "mt-10"} flex items-center gap-2.5 border px-7 py-3 text-[13px] tracking-[0.2em] transition-colors ${
            notesOpen
              ? "border-gold/60 bg-gold/10 text-gold"
              : "border-gold/40 text-hanji hover:bg-gold/10"
          }`}
        >
          <Banga className="h-[17px] w-[17px] text-gold-soft" />
          {notesOpen ? "사유의 방 — 접기" : "사유의 방 — 떠오르는 것을 적다"}
        </button>

        {/* 기다리는 동안 — 갈 곳 */}
        {!unlocked && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link
              href="/masters"
              className="border border-ink-3 px-5 py-2.5 tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              선지식의 한마디
            </Link>
            <Link
              href="/my-hwadu"
              className="border border-ink-3 px-5 py-2.5 tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
            >
              나도 화두 던지기
            </Link>
          </div>
        )}

        {/* 내려놓기 — 또렷하게 */}
        <button
          onClick={layDown}
          className="mt-10 border border-ink-3 px-7 py-2.5 text-xs tracking-[0.25em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-hanji"
        >
          이 화두를 내려놓다
        </button>
      </section>

      {/* 사유의 방 서랍 */}
      <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  );
}
