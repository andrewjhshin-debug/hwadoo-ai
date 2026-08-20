"use client";

// ─────────────────────────────────────────────────────────────
// 화두 — 첫 화면
// 화두가 없을 때: 화 두 + 슬로건 + [새 화두 받기]
// 화두를 들고 있을 때: 질문이 화면의 주인공. 로고는 물러난다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import NotesDrawer from "@/components/NotesDrawer";
import { useConfirm } from "@/components/Confirm";
import { Banga, Dharmachakra, Lotus, Teacup } from "@/components/icons";
import {
  flatQuestion,
  bankCount,
  getHwadu,
  pickRandomHwadu,
  sessionQuestion,
} from "@/lib/hwadu";
import Question from "@/components/Question";
import { fetchPublicHwadu, markSeen, type PublicHwadu } from "@/lib/thrown";
import {
  decrementHolding,
  fetchHoldingCount,
  incrementHolding,
} from "@/lib/holding";
import { todayGuide } from "@/lib/guidance";
import {
  dayCount,
  durationLabel,
  formatCountdown,
  isUnlocked,
  loadStore,
  saveStore,
  sessionKey,
  unlockAt,
  type Session,
  type Store,
} from "@/lib/store";
import { DONATION_URL, SLOGAN } from "@/lib/config";
import {
  shareAnswer,
  fetchSharedAnswers,
  type SharedAnswer,
} from "@/lib/community";
import { applyBankOverride, fetchAdminContent } from "@/lib/adminContent";
import { initPresence, watchOnlineCount } from "@/lib/presence";

// 나눔 물음창의 작은 안내 — 공유하면 무엇이 일어나는지
const SHARE_NOTE =
  "공유한 답은 검수를 거쳐, 공유한 그때의 글로 보입니다. 지난 화두에서 고쳐 써도 공유된 답은 바뀌지 않습니다.";

// 불교 전통의 리듬 — 하루, 삼일기도, 칠일 정진, 삼칠일(3×7일), 백팔일(108 번뇌)
const DAY_OPTIONS = [1, 3, 7, 21, 108];
const DAY_NOTE: Record<number, string> = {
  1: "하루 — 첫걸음",
  3: "사흘 — 삼일기도의 리듬",
  7: "이레 — 칠일 용맹정진",
  21: "삼칠일 — 세 이레, 회향의 단위",
  108: "백팔일 — 백팔번뇌를 마주하는 가장 깊은 참구",
};

// 쓰다 만 답을 잠시 맡아 두는 자리 — 화두마다 따로.
// 답을 적다가 화면을 떠나도 글이 사라지지 않게 한다.
const draftKey = (hwaduId: string) => `hwadoo-draft-${hwaduId}`;

function loadDraft(hwaduId: string): string {
  try {
    return window.localStorage.getItem(draftKey(hwaduId)) ?? "";
  } catch {
    return "";
  }
}

function keepDraft(hwaduId: string, value: string) {
  try {
    if (value.trim()) window.localStorage.setItem(draftKey(hwaduId), value);
    else window.localStorage.removeItem(draftKey(hwaduId));
  } catch {
    // 저장할 자리가 없어도 쓰던 글은 화면에 그대로 남는다
  }
}

function dropDraft(hwaduId: string) {
  try {
    window.localStorage.removeItem(draftKey(hwaduId));
  } catch {
    // 지우지 못해도 다음 화두에는 영향이 없다
  }
}

export default function Home() {
  const confirm = useConfirm();
  const [store, setStore] = useState<Store | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [publicPool, setPublicPool] = useState<PublicHwadu[]>([]);
  const [holdingCount, setHoldingCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswer[]>([]);
  // 나눔에 부쳤는지 — 회향 화면에 조용히 알린다
  const [shareDone, setShareDone] = useState(false);
  // 나눔에 부치지 못했을 때의 안내 — 성공 문구와 나뉜다
  const [shareError, setShareError] = useState("");
  // 회향을 브라우저에 적지 못했을 때의 안내 (저장 공간이 찼을 때 등)
  const [saveError, setSaveError] = useState("");
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  // 저장은 언제나 '지금 저장되어 있는 것' 위에 병합한다.
  // 화면이 들고 있는 옛 상태로 통째로 덮어쓰면, 그 사이 사유의 방이 적은
  // 단상 같은 글이 소리 없이 사라진다.
  // 저장 성공 여부를 돌려준다 — 실패하면 화면이 알릴 수 있게.
  const update = useCallback((merge: (base: Store) => Store) => {
    const next = merge(loadStore());
    setStore(next);
    return saveStore(next);
  }, []);

  // 회향을 마친 화두를 서고로 보낸다 — 화면은 '새 화두 받기'로 돌아간다
  const archiveCurrent = useCallback(() => {
    const done = loadStore().current;
    if (!done) return;
    update((base) => {
      const cur = base.current;
      if (!cur) return base;
      // 같은 판이 이미 서고에 있으면 다시 밀어 넣지 않는다 (중복 이중 방어)
      const exists = base.history.some((h) => sessionKey(h) === sessionKey(cur));
      return {
        ...base,
        history: exists ? base.history : [...base.history, cur],
        current: null,
      };
    });
    decrementHolding(done.hwaduId);
    dropDraft(done.hwaduId);
    setShareDone(false);
    setShareError("");
    setSaveError("");
    setSharedAnswers([]);
    setWriting(false);
    setDraft("");
  }, [update]);

  // 답을 쓰는 동안에는 사유의 방 떠 있는 단추를 감춘다 (입력창과 겹치지 않게)
  useEffect(() => {
    if (writing) document.body.dataset.writing = "true";
    else delete document.body.dataset.writing;
    return () => {
      delete document.body.dataset.writing;
    };
  }, [writing]);

  // 뜰로 돌아오면 — 회향을 마친 화두는 서고로 보내고 '새 화두 받기'로.
  // (화두만 보기는 그대로 둔다 — 되돌아가기를 눌러야 풀린다)
  useEffect(() => {
    const toHome = () => {
      setWriting(false);
      if (loadStore().current?.journal) archiveCurrent();
    };
    window.addEventListener("hwadoo-nav-home", toHome);
    return () => window.removeEventListener("hwadoo-nav-home", toHome);
  }, [archiveCurrent]);

  useEffect(() => {
    const loaded = loadStore();
    // 다른 화면을 거쳐 돌아왔다면, 마친 화두는 서고로 보낸다
    if (loaded.current?.journal) archiveCurrent();
    else setStore(loaded);
    // 화두만 보기 — 되돌아가기 전까지 이어진다
    setFocusMode(window.localStorage.getItem("hwadoo-focus") === "1");
    // 승인된 '던져진 화두'들을 랜덤 풀에 합류시킨다 (실패해도 기본 30칙으로 동작)
    fetchPublicHwadu().then(setPublicPool).catch(() => {});
    // 뒷방의 손질(숨김·고침)도 미리 데워 둔다 — 받기가 기다리지 않게
    fetchAdminContent().catch(() => {});
  }, [archiveCurrent]);

  // 화두만 보기 상태를 기억한다
  useEffect(() => {
    if (focusMode) window.localStorage.setItem("hwadoo-focus", "1");
    else window.localStorage.removeItem("hwadoo-focus");
  }, [focusMode]);

  // 지금 이 물음을 몇 명이 들고 있는가
  useEffect(() => {
    const id = store?.current?.hwaduId;
    if (!id) {
      setHoldingCount(null);
      return;
    }
    fetchHoldingCount(id).then(setHoldingCount);
  }, [store?.current?.hwaduId]);

  // 실시간 접속자 추적 — 탭이 열리면 등록, 닫히면 서버가 자동 삭제
  useEffect(() => {
    const stopPresence = initPresence();
    const stopWatch = watchOnlineCount(setOnlineCount);
    return () => {
      stopPresence();
      stopWatch();
    };
  }, []);

  // 저장소가 바뀌면 화면도 곧바로 따라간다.
  // 다른 기기(동기화)·다른 창(storage)·같은 창의 다른 화면(사유의 방) 모두.
  useEffect(() => {
    const refresh = () => setStore(loadStore());
    window.addEventListener("hwadoo-store-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hwadoo-store-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
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

  // 화두를 받는다 — 랜덤. 기본 30칙 + 승인된 던져진 화두. 지나온 것은 피해서.
  // 뽑기 전에 뒷방의 손질을 살핀다 — 숨긴 화두는 빼고, 고친 화두는 고친 글로.
  // (손질을 읽지 못하면 원본 그대로 조용히 진행한다)
  const receive = async () => {
    const base = loadStore();
    const admin = await fetchAdminContent().catch(() => null);
    const bank = admin?.bank ?? { hidden: [], removed: [], overrides: {} };
    // 뒷방에서 감춘 것(되살릴 수 있음)과 영영 지운 것 — 둘 다 뽑지 않는다
    const gone = [...new Set([...bank.hidden, ...bank.removed])];
    const exclude = [
      ...base.history.map((s) => s.hwaduId),
      ...(base.current ? [base.current.hwaduId] : []),
      ...gone,
    ];
    const audience = base.audience ?? "adult";
    // 서버 화두 — 지금 대상(성인/학생)에 맞는 것만 섞는다
    const freshPublic = publicPool.filter(
      (p) => (p.audience ?? "adult") === audience && !exclude.includes(`thrown:${p.id}`)
    );
    // 감춘·지운 수만큼 은행 몫을 줄여 확률을 맞춘다
    const hiddenInBank = gone.filter((id) => {
      const h = getHwadu(id);
      if (!h) return false;
      return audience === "student"
        ? h.audience === "student" || h.forStudent
        : h.audience !== "student";
    }).length;
    const total =
      Math.max(1, bankCount(audience) - hiddenInBank) + freshPublic.length;
    const days = base.defaultDays ?? 3;
    let session: Session;
    if (freshPublic.length > 0 && Math.random() < freshPublic.length / total) {
      const p = freshPublic[Math.floor(Math.random() * freshPublic.length)];
      session = {
        hwaduId: `thrown:${p.id}`,
        customQuestion: p.question,
        customSource: p.source,
        receivedAt: Date.now(),
        durationDays: days,
      };
      // 이 물음이 한 수행자에게 닿았다 — 세는 일은 부차, 실패해도 받기는 계속된다
      void markSeen(p.id);
    } else {
      const picked = pickRandomHwadu(exclude, audience);
      session = {
        hwaduId: picked.id,
        receivedAt: Date.now(),
        durationDays: days,
      };
      // 뒷방에서 고친 화두 — 고친 물음·배경을 세션에 함께 담는다
      if (bank.overrides[picked.id]) {
        const shaped = applyBankOverride(picked, bank);
        session.customQuestion = shaped.question;
        if (shaped.context) session.customSource = shaped.context;
      }
    }
    update((latest) => ({
      ...latest,
      current: session,
      received: latest.received + 1,
    }));
    incrementHolding(session.hwaduId); // 함께 들고 있는 수 +1
    setWriting(false);
    setDraft("");
  };

  const saveJournal = async () => {
    const answer = draft.trim();
    const cur = loadStore().current;
    if (!cur || !answer) return;
    const hwaduId = cur.hwaduId;
    const saved = update((latest) =>
      latest.current
        ? {
            ...latest,
            current: {
              ...latest.current,
              journal: answer,
              journalAt: Date.now(),
            },
          }
        : latest
    );
    // 브라우저에 적지 못했다 — 화면에는 남아 있으니, 사정을 알린다
    setSaveError(saved ? "" : "저장하지 못했습니다 — 저장 공간을 확인해 주십시오.");
    dropDraft(hwaduId);
    setDraft("");
    setWriting(false);
    setShareDone(false);
    setShareError("");
    // 회향을 마치자마자 — 나눔의 뜻을 묻는다
    const ok = await confirm(
      "이 답을 다른 수행자에게 공유하겠습니까?",
      `이름 없이 — 다른 수행자의 화두를 돕습니다. ${SHARE_NOTE}`,
      { confirm: "네", cancel: "아니오" }
    );
    if (ok) {
      // 부치는 데까지 기다린다 — 성공했을 때만 성공 문구를 보인다
      try {
        await shareAnswer(hwaduId, answer);
        setShareDone(true);
      } catch {
        setShareError(
          "나눔에 부치지 못했습니다 — 잠시 후 다시 시도해 주십시오."
        );
      }
    }
  };

  const layDown = async () => {
    const cur = loadStore().current;
    if (!cur) return;
    const ok = await confirm(
      "이 화두를 내려놓으시겠습니까?",
      "기록 없이 사라집니다.",
      { confirm: "내려놓다", cancel: "머무르다" }
    );
    if (!ok) return;
    decrementHolding(cur.hwaduId);
    dropDraft(cur.hwaduId);
    update((base) => ({ ...base, current: null }));
    setWriting(false);
  };

  // 참구 기간 변경 — 지금 화두와 앞으로의 기본값 모두에 적용
  // 기간 바꾸기 — 받은 날은 그대로, 기간만 바뀐다 (이미 품은 시간은 차감된 채 남는다).
  // 새 기간이 이미 지난 시간보다 짧으면 그 자리에서 붓이 풀린다 — 한 번 묻고 간다.
  const setDays = async (days: number) => {
    const cur = loadStore().current;
    if (cur && days > 0) {
      const elapsed = Date.now() - cur.receivedAt;
      if (elapsed >= days * 24 * 60 * 60 * 1000) {
        const heldDays = Math.max(1, Math.floor(elapsed / (24 * 60 * 60 * 1000)));
        const ok = await confirm(
          "지금 바로 붓을 들게 됩니다",
          `이미 ${heldDays}일을 품었습니다. ${durationLabel(days)}로 바꾸면 기다림 없이 곧장 답을 쓸 수 있습니다.`,
          { confirm: "바꾸겠습니다", cancel: "그대로 두기" }
        );
        if (!ok) return;
      }
    }
    update((base) => ({
      ...base,
      defaultDays: days,
      current: base.current ? { ...base.current, durationDays: days } : null,
    }));
    setShowSettings(false);
  };

  const current = store?.current ?? null;
  const hwadu = current ? getHwadu(current.hwaduId) : null;
  const unlocked = current ? isUnlocked(current) : false;

  // 카운트다운 — 달이 차오르기를 기다리는 그 화면에서만 1초마다 센다.
  // (다른 화면에서까지 돌면 아무도 보지 않는 시계가 배터리만 축낸다)
  const needsCountdown =
    !!current && !current.journal && !writing && !focusMode && !unlocked;
  useEffect(() => {
    if (!needsCountdown || !current) return;
    const tick = () => setRemaining(unlockAt(current) - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [needsCountdown, current]);

  // 되살린 초안이 한 줄로 눌리지 않게, 붓을 들 때 글칸 높이를 글에 맞춘다
  useEffect(() => {
    const el = draftRef.current;
    if (!writing || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [writing]);

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
          onClick={receive}
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
                onClick={() => update((base) => ({ ...base, audience: o.key }))}
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
            回向 · 나의 답
          </p>
          <p className="mt-5 whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
            {current.journal}
          </p>

          {/* 참구하며 남긴 단상 — 답과 함께 남는다 */}
          {current.notes && (
            <details className="mt-6 w-full max-w-xl text-left">
              <summary className="cursor-pointer text-[11px] tracking-[0.3em] text-hanji-faint transition-colors hover:text-hanji-dim">
                사유의 방에 남긴 단상 함께 보기
              </summary>
              <p className="mt-3 whitespace-pre-line border-l border-gold/25 pl-4 text-[13px] leading-7 text-hanji-faint">
                {current.notes}
              </p>
            </details>
          )}

          {saveError && (
            <p className="mt-8 text-[12.5px] leading-6 text-vermilion">
              {saveError}
            </p>
          )}

          {shareDone && (
            <p className="mt-8 text-[12.5px] leading-6 text-gold-soft">
              나눔에 부쳤습니다. 도량에서 살펴본 뒤 다른 수행자에게 열립니다.
            </p>
          )}
          {shareError && (
            <p className="mt-8 text-[12.5px] leading-6 text-vermilion">
              {shareError}
            </p>
          )}

          {/* 다른 수행자들은 이렇게 답했습니다 — 검수를 통과한 회향 */}
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
              ? "이 화두는 어느 낯선 이가 던진 것 — 스승의 답은 없습니다. 이 답이 첫 답입니다."
              : "정답은 없습니다. 다만 천 년 전에도 같은 물음을 품은 이들이 있었습니다."}
          </p>

          {/* 잠시 — 다음으로 나아가기 전에 */}
          <div className="mt-10 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-5 text-left">
            <p className="text-[11px] tracking-[0.3em] text-hanji-faint">
              숨을 고르다
            </p>
            <p className="mt-3 break-keep text-[13px] leading-7 text-hanji-dim">
              답을 쓰는 것으로 화두가 끝나지는 않습니다. 지금 이 자리에서 잠시 눈을 감고 —
              내가 쓴 답을 다시 한 번 몸으로 느껴봅니다. 스승의 말과 나의 말이 어떻게 다르고,
              어떻게 닮았는지 그저 바라봅니다.
            </p>
            <Link
              href="/breath"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] tracking-wider text-gold-soft transition-colors hover:text-gold"
            >
              호흡 명상으로 잠시 앉기 →
            </Link>
          </div>

          {/* 차 한 잔 — 회향의 여운이 남은 자리에서만 조용히 청한다.
              모바일은 카카오페이 바로, PC는 찻자리(QR)로. 링크가 없으면 접는다. */}
          {DONATION_URL && (
            <div className="mt-6 w-full max-w-xl rounded-[14px] border border-gold/25 bg-gold/5 px-6 py-5 text-left">
              <p className="text-[11px] tracking-[0.3em] text-gold-soft">
                喫茶去 · 차 한 잔
              </p>
              <p className="mt-3 break-keep text-[13px] leading-7 text-hanji-dim">
                {current.durationDays >= 21
                  ? "긴 물음을 끝까지 품으셨습니다. 이 도량이 그 곁에 있었다면 — 차 한 잔 값으로 등불을 보태 주실 수 있습니다."
                  : "이 물음이 마음에 남았다면 — 차 한 잔 값으로 도량의 등불을 보태 주실 수 있습니다."}{" "}
                찻값은 이 도량을 잇는 데 쓰입니다.
              </p>
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-gold/50 px-5 py-2.5 text-[12px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 sm:hidden"
              >
                <Teacup className="h-4 w-4" />
                차 한 잔 올리기
              </a>
              <Link
                href="/tea"
                className="mt-4 hidden items-center gap-2 rounded-[10px] border border-gold/50 px-5 py-2.5 text-[12px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 sm:inline-flex"
              >
                <Teacup className="h-4 w-4" />
                차 한 잔 올리기
              </Link>
              <p className="mt-3 break-keep text-[11px] leading-5 text-hanji-faint">
                억지로는 마시지 않는 것이 차입니다 — 마음이 동할 때만.
              </p>
            </div>
          )}

          <button
            onClick={archiveCurrent}
            className="btn-obang mt-8 px-9 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
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
      // 답 쓰는 동안에는 이 화면이 본문 높이를 그대로 쓴다 (h-full).
      // 아래 띠는 감춰 두므로(globals.css: body[data-writing] footer) 겹칠 것이 없다.
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {/* 채팅형 회향 — 위: 화두(물음)와 대화, 아래: 입력창.
            입력창은 흐름 안의 형제라 화면을 덮지 않고, 위 대화는 스스로 스크롤한다. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 sm:px-6">
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
                  아래에 답을 적어, 회향하십시오.
                </p>
              </div>
            </div>

            {/* 사유의 방에 남긴 단상 — 답을 쓰는 동안 곁에 둔다 */}
            {current.notes && (
              <div className="flex flex-col items-start">
                <span className="mb-1.5 text-[10px] tracking-[0.3em] text-gold-soft">
                  사유의 방에 남긴 단상
                </span>
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-gold/25 bg-ink-2/40 px-4 py-3">
                  <p className="whitespace-pre-line break-keep text-[13px] leading-7 text-hanji-dim">
                    {current.notes}
                  </p>
                </div>
                <span className="mt-1.5 text-[10px] text-hanji-faint">
                  이 단상은 회향과 함께 기록에 남습니다
                </span>
              </div>
            )}
          </div>
        </div>
        {/* 아래 입력창 — 화면 아래에 앉되, 대화를 덮지 않는다 */}
        <div className="shrink-0 border-t border-ink-3 bg-ink/95 px-4 pb-3 pt-3 backdrop-blur md:pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="mx-auto w-full max-w-xl">
            {/* 글칸은 늘 한 줄을 다 쓴다 — 좁게 눌리지 않도록 */}
            <textarea
              autoFocus
              ref={draftRef}
              value={draft}
              onChange={(e) => {
                const value = e.target.value.slice(0, 500);
                setDraft(value);
                keepDraft(current.hwaduId, value); // 떠나도 잃지 않게 한 자씩 맡겨 둔다
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              rows={3}
              maxLength={500}
              placeholder="여기에 답을 적으십시오…"
              className="max-h-[40vh] min-h-[92px] w-full resize-none overflow-y-auto rounded-2xl border border-ink-3 bg-ink-2/60 px-4 py-3 text-[15px] leading-7 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/40"
            />
            {/* 나가기 · 글자수 · 회향 — 글칸 아래 한 줄로 */}
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                onClick={() => setWriting(false)}
                className="shrink-0 text-[11px] tracking-wider text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                나가기
              </button>
              <span className="text-[10px] text-hanji-faint">
                {draft.length}/500
              </span>
              <button
                onClick={saveJournal}
                disabled={!draft.trim()}
                className="btn-obang shrink-0 rounded-full px-6 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
              >
                회향
              </button>
            </div>
          </div>
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

        {/* 사유의 방 FAB — MobileTabBar와 동일한 스타일, 화두만 보기 전용 */}
        <button
          onClick={() => setNotesOpen(true)}
          aria-label="사유의 방 열기"
          className="notes-fab btn-obang fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.5)] md:bottom-8 md:right-8"
        >
          <Banga className="h-6 w-6 text-gold-soft" />
        </button>
        <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
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
        {(current.customSource || hwadu?.context) && (
          <p className="mt-7 text-xs tracking-wider text-hanji-faint">
            {/* 세션에 담긴 배경(고친 화두·서버 화두)이 먼저, 없으면 원문 */}
            {current.customSource ?? hwadu?.context}
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
        {onlineCount !== null && onlineCount > 0 && (
          <p className="mt-1.5 text-[11px] tracking-widest text-hanji-faint">
            지금 도량에 {onlineCount}명이 함께 있습니다
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
              {remaining > 0 && (
                <span className="text-[19px] font-light">
                  <span className="tabular-nums text-hanji">
                    {formatCountdown(remaining)}
                  </span>{" "}
                  남음
                </span>
              )}
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
            onClick={() => {
              // 쓰다 만 답이 있으면 그 자리에서 이어 쓴다
              setDraft((d) => d || loadDraft(current.hwaduId));
              setWriting(true);
            }}
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
