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
import { Banga, Dharmachakra } from "@/components/icons";
import { getHwadu, pickRandomHwadu, sessionQuestion } from "@/lib/hwadu";
import { fetchPublicHwadu, type PublicHwadu } from "@/lib/thrown";
import { sharePost } from "@/lib/community";
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

// 불교 전통의 리듬 — 하루, 삼일기도, 칠일 정진, 삼칠일(3×7일)
const DAY_OPTIONS = [1, 3, 7, 21];

export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [publicPool, setPublicPool] = useState<PublicHwadu[]>([]);
  const [shareState, setShareState] = useState<"idle" | "busy" | "done">("idle");
  const [holdingCount, setHoldingCount] = useState<number | null>(null);
  const [, setTick] = useState(0);

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
    // 서버 화두(던져진 것·관리자 추가)는 어른 모드에만 섞인다
    const freshPublic =
      audience === "adult"
        ? publicPool.filter((p) => !exclude.includes(`thrown:${p.id}`))
        : [];
    const total = 30 + freshPublic.length;
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
    setShareState("idle");
  };

  // 회향을 선방에 건다 — 익명
  const shareToHall = async () => {
    if (!store?.current?.journal || shareState !== "idle") return;
    setShareState("busy");
    try {
      await sharePost(sessionQuestion(store.current), store.current.journal);
      setShareState("done");
    } catch {
      setShareState("idle");
    }
  };

  const saveJournal = () => {
    if (!store?.current || !draft.trim()) return;
    update({
      ...store,
      current: { ...store.current, journal: draft.trim(), journalAt: Date.now() },
    });
    setDraft("");
    setWriting(false);
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
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
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
          className="btn-obang rise rise-d2 px-12 py-4 font-serif text-base tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          새 화두 받기
        </button>

        {/* 누구의 화두인가 — 성인 / 학생·어린이 (클릭으로만 바뀜) */}
        <div className="rise rise-d3 mt-7 flex items-center gap-3 text-xs">
          {(
            [
              { key: "adult", label: "성인의 화두" },
              { key: "student", label: "학생·어린이의 화두" },
            ] as const
          ).map((o) => {
            const active = (store?.audience ?? "adult") === o.key;
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={active}
                onClick={() => store && update({ ...store, audience: o.key })}
                className={`border px-4 py-2 tracking-[0.12em] transition-colors ${
                  active
                    ? "border-gold/70 bg-gold/15 font-medium text-gold"
                    : "border-ink-3 text-hanji-faint hover:border-ink-3 hover:text-hanji-faint"
                }`}
              >
                {active && "✓ "}
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

          {/* 선방에 걸기 — 익명 공유 */}
          <div className="mt-10 flex flex-col items-center gap-2">
            {shareState === "done" ? (
              <p className="text-[13px] text-gold-soft">
                선방에 걸렸습니다 — 어느 낯선 이가 그대의 답 앞에 합장할지도
                모릅니다.{" "}
                <Link href="/community" className="underline decoration-gold/30 underline-offset-4">
                  보러 가기
                </Link>
              </p>
            ) : (
              <>
                <button
                  onClick={shareToHall}
                  disabled={shareState === "busy"}
                  className="flex items-center gap-2.5 border border-ink-3 px-7 py-2.5 text-[13px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji disabled:opacity-40"
                >
                  🏮 {shareState === "busy" ? "거는 중…" : "이 답을 선방에 걸다 (익명)"}
                </button>
                <p className="text-[11px] text-hanji-faint">
                  걸지 않으면 아무도 읽지 못합니다 — 기록은 그대의 것
                </p>
              </>
            )}
          </div>

          <div className="mt-10 w-full">
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
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-14">
        <section className="rise flex w-full max-w-xl flex-col">
          <p className="whitespace-pre-line text-center font-serif text-sm font-light leading-8 text-hanji-dim">
            {sessionQuestion(current)}
          </p>
          <div className="mt-9 border-t border-ink-3 pt-7">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 500))}
              rows={9}
              maxLength={500}
              placeholder="며칠을 품고 계셨습니다. 무엇이 보였습니까."
              className="journal-area"
            />
            <p className="mt-2 text-right text-[11px] text-hanji-faint">
              {draft.length} / 500
            </p>
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
          <p className="mt-4 text-[11px] text-hanji-faint">
            기록은 이 브라우저에만 남습니다. 우리는 그대의 답을 읽지 않습니다.
          </p>
        </section>
      </div>
    );
  }

  // ── 화두를 들고 있다 — 질문이 주인공 ────────────────────
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <section className="rise flex w-full max-w-2xl flex-col items-center">
        {/* 질문 — 눈높이, 화면의 주인공 */}
        {hwadu?.hanja && (
          <p className="text-xs tracking-[0.6em] text-hanji-faint">
            {hwadu.hanja}
          </p>
        )}
        <h1 className="question-glow mt-7 whitespace-pre-line font-serif text-[23px] font-light leading-[1.7] sm:text-[29px] sm:leading-[1.7]">
          {sessionQuestion(current)}
        </h1>
        {(hwadu?.context || current.customSource) && (
          <p className="mt-7 text-xs tracking-wider text-hanji-faint">
            {hwadu?.context ?? current.customSource}
          </p>
        )}

        {/* 함께 드는 이들 */}
        {holdingCount !== null && (
          <p className="mt-5 text-[12px] tracking-wide text-gold-soft">
            {holdingCount >= 2
              ? `지금 이 물음을 ${holdingCount}명이 함께 들고 있습니다`
              : "이 물음을 든 사람은, 지금 그대뿐입니다"}
          </p>
        )}

        {/* 달 + 카운트다운 */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-[13.5px] font-light tracking-wide text-hanji-dim">
          <span className="moon" />
          {unlocked ? (
            <span>달이 차올랐습니다. 이제 답을 쓸 수 있습니다</span>
          ) : (
            <span>
              달이 차오르는 {durationLabel(current.durationDays)} 뒤, 답을 쓸 수
              있습니다 ·{" "}
              <span className="tabular-nums text-hanji">
                {formatCountdown(unlockAt(current) - Date.now())}
              </span>{" "}
              남음
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
              <div className="flex items-center gap-3">
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

        {/* 사유의 방 — 화두를 둔 채 오른쪽에 메모가 열린다 */}
        <button
          onClick={() => setNotesOpen(true)}
          className={`${unlocked ? "mt-5" : "mt-10"} flex items-center gap-2.5 border border-gold/40 px-7 py-3 text-[13px] tracking-[0.2em] text-hanji transition-colors hover:bg-gold/10`}
        >
          <Banga className="h-[17px] w-[17px] text-gold-soft" />
          사유의 방 — 떠오르는 것을 적다
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
