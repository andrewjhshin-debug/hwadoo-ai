"use client";

// ─────────────────────────────────────────────────────────────
// 화두 — 첫 화면
// 화두가 없을 때: 화 두 + 슬로건 + [새 화두 받기]
// 화두를 들고 있을 때: 질문이 화면의 주인공. 로고는 물러난다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Enso from "@/components/Enso";
import Dudu from "@/components/Dudu";
import {
  loadMerit,
  nextRank,
  rankOf,
  stageOf,
  stageProgress,
} from "@/lib/merit";
import NotesDrawer from "@/components/NotesDrawer";
import BeopdangCard from "@/components/BeopdangCard";
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
import { plainThoughts } from "@/lib/thoughts";
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
// 접속 표는 사이드바가 올린다(모든 화면에 있으므로) — 여기선 세기만 한다
import { watchOnlineCount } from "@/lib/presence";

// 나눔 물음창의 작은 안내 — 공유하면 무엇이 일어나는지
const SHARE_NOTE =
  "공유한 답은 검수를 거쳐, 공유한 그때의 글로 보입니다.";

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

// 남은 시간을 토막으로 나눈다 — 큰 숫자와 작은 단위로 보이기 위해서.
// 한 줄짜리 긴 문자열("2일 13시간 05분 42초")은 좁은 화면에서 넘치고,
// 눈에도 한 번에 들어오지 않는다. 전체 문장은 aria-label 로 그대로 읽힌다.
function countdownParts(ms: number): { value: string; unit: string }[] {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  // 하루 넘게 남았는데 초까지 세면 조급해진다 — 작은 단위부터 접는다
  if (d > 0)
    return [
      { value: String(d), unit: "일" },
      { value: pad(h), unit: "시간" },
      { value: pad(m), unit: "분" },
    ];
  if (h > 0)
    return [
      { value: String(h), unit: "시간" },
      { value: pad(m), unit: "분" },
      { value: pad(s), unit: "초" },
    ];
  return [
    { value: String(m), unit: "분" },
    { value: pad(s), unit: "초" },
  ];
}

// 접은 글의 여닫이 표식 — 브라우저 기본 삼각형을 지우고 글만 남긴다
const FOLD =
  "cursor-pointer list-none [&::-webkit-details-marker]:hidden";

// 물음의 길이에 따라 활자의 기준을 달리 잡는다.
// 짧은 물음은 벽보처럼 크게, 긴 물음은 한 단계 낮춰 한 화면에 들어오게.
// 한 크기로 밀어붙이면 긴 화두가 좁은 화면에서 열 줄 넘게 흘러
// 글자만 크고 읽히지는 않는다.
function questionFit(text: string): { min: number; max: number } {
  const n = text.replace(/\s+/g, " ").trim().length;
  if (n <= 40) return { min: 34, max: 88 };
  if (n <= 62) return { min: 29, max: 80 };
  return { min: 25, max: 72 };
}

export default function Home() {
  const confirm = useConfirm();
  const [store, setStore] = useState<Store | null>(null);
  const [merit, setMerit] = useState(0); // 공덕 — 첫 화면의 수행 줄에 보인다
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

  // 공덕 — 뜰에 들어올 때, 그리고 다른 방에서 쌓고 돌아왔을 때
  useEffect(() => {
    const read = () => setMerit(loadMerit().total);
    read();
    window.addEventListener("focus", read);
    window.addEventListener("hwadu-merit-updated", read);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("hwadu-merit-updated", read);
    };
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
    const stopWatch = watchOnlineCount(setOnlineCount);
    return () => {
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
    // ?? 가 아니라 || — 이전 버그로 defaultDays 가 0에 눌어붙은 계정도
    // 다음에 받는 화두부터는 저절로 사흘 기본값으로 되돌아온다.
    const days = base.defaultDays || 3;
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
    setSaveError(saved ? "" : "저장하지 못했습니다 — 저장 공간을 확인해 주세요.");
    dropDraft(hwaduId);
    setDraft("");
    setWriting(false);
    setShareDone(false);
    setShareError("");
    // 회향을 마치자마자 — 나눔의 뜻을 묻는다
    const ok = await confirm(
      "이 답을 다른 수행자에게 공유하겠습니까?",
      `이름 없이 공유됩니다. ${SHARE_NOTE}`,
      { confirm: "네", cancel: "아니오" }
    );
    if (ok) {
      // 부치는 데까지 기다린다 — 성공했을 때만 성공 문구를 보인다
      try {
        await shareAnswer(hwaduId, answer);
        setShareDone(true);
      } catch {
        setShareError(
          "나눔에 부치지 못했습니다 — 잠시 후 다시 시도해 주세요."
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
          `이미 ${heldDays}일을 품었습니다.`,
          { confirm: "바꾸겠습니다", cancel: "그대로 두기" }
        );
        if (!ok) return;
      }
    }
    // 지금 화두에만 적용한다 — 여기서 defaultDays 까지 바꾸면, 한 번 고른
    // 기간(특히 '스스로 정한 때')이 이후 받는 모든 화두에 조용히 눌어붙는다.
    update((base) => ({
      ...base,
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
      <div className="relative flex flex-1 flex-col items-center justify-start px-5 pb-16 pt-6 text-center sm:justify-center sm:py-16">
        <div className="rise-sharp">
          <Enso size={116} />
        </div>
        {/* 이름 한 줄, 슬로건 한 줄.
            HWADU 를 옆에 달았더니 이름이 한쪽으로 밀려 가운데를 잃었다.
            로마자는 뺀다 — 이 도량의 이름은 두 글자로 족하다.
            크기도 한 단 내렸다. 화면을 가득 메우면 이름이 아니라 간판이 된다. */}
        <div className="rise-sharp rise-s1 mt-5 flex justify-center">
          <h1 className="text-obang font-serif text-[clamp(46px,13vw,64px)] font-medium leading-[1.02] tracking-[0.06em] [text-indent:0.06em]">
            화두
          </h1>
        </div>
        {/* 곁의 한 줄 — 이름보다 훨씬 작게. 다만 읽히지 않을 만큼 흐리지는 않게 */}
        <p className="rise-sharp rise-s1 mt-5 max-w-[19rem] break-keep text-[12.5px] font-light leading-6 tracking-[0.04em] text-hanji-dim">
          &ldquo;{SLOGAN}&rdquo;
        </p>
        <div className="rise-sharp rise-s2 my-8 flex items-center gap-3 opacity-70">
          <div className="h-px w-[72px] bg-gradient-to-r from-transparent to-gold/45" />
          <Dharmachakra className="h-4 w-4" stroke="#B99A54" />
          <div className="h-px w-[72px] bg-gradient-to-r from-gold/45 to-transparent" />
        </div>
        {/* 이 화면에서 눈이 갈 곳은 여기 하나 — 손가락 폭만큼 넓고 높게 */}
        <button
          onClick={receive}
          className="btn-obang btn-hot rise-sharp rise-s2 inline-flex h-[60px] w-full max-w-[19rem] items-center justify-center gap-2.5 font-serif text-[16px] tracking-[0.3em] text-hanji"
        >
          <Lotus className="h-[18px] w-[18px]" stroke="#B99A54" />
          <span className="[text-indent:0.3em]">새 화두 받기</span>
        </button>

        {/* 누구의 화두인가 — 채워진 알약 스위치 (클릭으로만 바뀜) */}
        <div className="rise-sharp rise-s3 mt-6 inline-flex rounded-full border border-ink-3 bg-ink-2 p-1 text-[11.5px]">
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
                className={`tap rounded-full px-5 py-2.5 tracking-[0.1em] transition-colors ${
                  active
                    ? "border border-gold/55 bg-gold/15 font-medium text-gold"
                    : "border border-transparent bg-transparent text-hanji-faint"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {/* 나무 — 공덕이 쌓이면 자란다. 동자에서 부처까지 여섯 자리.
            카드째로 내 도량으로 가는 문이다 — 오늘의 세 가지가 거기 있다.
            (안쪽 수행 세 칸은 Link 중첩이 되지 않도록 카드 밖 형제로 둔다) */}
        <div className="rise-sharp rise-s3 mt-12 w-full max-w-sm">
          <Link
            href="/settings"
            className="tap block rounded-[18px] border border-ink-3 bg-ink-2/40 px-5 py-4 text-left transition-colors hover:border-gold/40"
          >
            <div className="flex items-center gap-4">
              <Dudu
                stage={stageOf(merit)}
                mood={
                  merit >= 1620 ? "joy" : merit >= 108 ? "bright" : "default"
                }
                uid="home"
                className="block h-[58px] w-[58px] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] tracking-[0.34em] text-hanji-faint">
                  공덕
                </p>
                {/* 큰 숫자 하나 — 이 카드가 말하는 것은 결국 이것 하나다.
                    다만 주인공(새 화두 받기)보다는 한 단계 낮춘다. */}
                <p className="mt-0.5 font-serif text-[32px] font-light leading-none tabular-nums text-gold">
                  {merit.toLocaleString("ko-KR")}
                </p>
                <p className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-serif text-[13.5px] text-hanji-dim">
                    {rankOf(merit).name}
                  </span>
                  <span className="font-serif text-[10.5px] text-gold-soft">
                    {rankOf(merit).hanja}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-3.5 h-[4px] overflow-hidden rounded-full bg-ink-3">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-500"
                style={{ width: `${Math.round(stageProgress(merit) * 100)}%` }}
              />
            </div>
            <p className="mt-2 break-keep text-[11px] leading-5 text-hanji-faint">
              {nextRank(merit)
                ? `${nextRank(merit)!.rank.name}까지 ${nextRank(merit)!.left.toLocaleString("ko-KR")}`
                : rankOf(merit).say}
              <span className="text-hanji-dim"> · 내 도량 · 오늘의 세 가지 →</span>
            </p>
          </Link>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { href: "/bae", label: "백팔배" },
              { href: "/moktak", label: "목탁·염주" },
              { href: "/breath", label: "호흡" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="tap rounded-full border border-ink-3 py-3 text-center text-[12px] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 법당 — 공덕이 가 닿는 끝. 내려오다 반드시 지나가는 자리에 둔다 */}
        <div className="mt-12 flex w-full justify-center">
          <BeopdangCard />
        </div>

        <div className="mt-12 flex gap-2.5 opacity-50">
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
      <div className="flex flex-1 flex-col items-center px-5 py-12 sm:py-14">
        <section className="rise-sharp flex w-full max-w-2xl flex-col items-center text-center">
          {/* 물음이 먼저다.
              답만 덜렁 띄워 놨더니 무엇에 대한 답인지가 사라졌다 —
              「SjGtg」 넉 자만 남은 화면은 아무 말도 하지 않는다.
              그래서 화두를 위에, 가로줄 하나 긋고, 그 아래 내 답. */}
          {hwadu?.hanja && (
            <span className="rounded-full border border-gold/25 px-4 py-1 font-serif text-[10px] tracking-[0.42em] text-gold-soft [text-indent:0.42em]">
              {hwadu.hanja}
            </span>
          )}
          <p className="hwadu-body mt-5 whitespace-pre-line break-keep font-serif text-[clamp(17px,4.4vw,21px)] leading-[1.9] text-hanji-dim">
            {sessionQuestion(current)}
          </p>

          {/* 물음과 답을 가르는 금 — 붓을 내려놓은 자리 */}
          <span className="mt-8 flex items-center gap-3 text-[10px] tracking-[0.34em] text-gold-soft">
            <i className="h-px w-10 bg-gradient-to-r from-transparent to-gold/45" />
            回向 · 나의 답
            <i className="h-px w-10 bg-gradient-to-l from-transparent to-gold/45" />
          </span>

          {/* 답은 물음보다 밝게 — 이 화면의 주인공이다 */}
          <p className="hwadu-body mt-5 whitespace-pre-line break-keep font-serif text-[clamp(18px,5vw,23px)] text-hanji">
            {current.journal}
          </p>

          {/* 참구하며 남긴 단상 — 답과 함께 남는다 */}
          {current.notes && (
            <details className="mt-6 w-full max-w-xl text-left">
              <summary
                className={`${FOLD} text-[11px] tracking-[0.3em] text-hanji-faint transition-colors hover:text-hanji-dim`}
              >
                사유의 방에 남긴 단상 함께 보기
              </summary>
              <p className="mt-3 whitespace-pre-line border-l border-gold/25 pl-4 text-[13px] leading-7 text-hanji-faint">
                {plainThoughts(current.notes)}
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

          {/* 다른 수행자들은 이렇게 답했습니다 — 검수를 통과한 회향.
              글을 지우지 않고 접는다. 몇 편인지가 여는 이유가 된다. */}
          {sharedAnswers.length > 0 && (
            <details className="mt-10 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 text-left">
              <summary
                className={`${FOLD} flex items-center justify-between gap-3 text-[12.5px] tracking-[0.16em] text-hanji-dim transition-colors hover:text-hanji`}
              >
                <span>다른 수행자들은 이렇게 답했습니다</span>
                <span className="shrink-0 text-[11px] tabular-nums text-gold-soft">
                  {sharedAnswers.length}
                </span>
              </summary>
              <div className="mt-6 flex flex-col gap-7">
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
            </details>
          )}

          {/* 선사의 말 — 한 자도 줄이지 않는다. 다만 접어 둔다.
              여는 사람은 온전한 어록을 그대로 만난다. */}
          <details className="mt-3 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 text-left">
            <summary
              className={`${FOLD} flex items-center justify-between gap-3 text-[12.5px] tracking-[0.16em] text-hanji-dim transition-colors hover:text-hanji`}
            >
              <span>
                {current.hwaduId.startsWith("thrown:")
                  ? "이 물음에 대하여"
                  : "옛 스승들은 이렇게 일렀습니다"}
              </span>
              {hwadu?.masters.length ? (
                <span className="shrink-0 text-[11px] tabular-nums text-gold-soft">
                  {hwadu.masters.length}
                </span>
              ) : null}
            </summary>
            <div className="mt-6 flex flex-col gap-8">
              {hwadu?.masters.map((m, i) => (
                <figure key={m.name + i}>
                  <blockquote className="whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
                    {m.text}
                  </blockquote>
                  <figcaption className="mt-3 text-right text-xs tracking-widest text-hanji-dim">
                    — {m.name}
                    {m.era && (
                      <span className="text-hanji-faint"> · {m.era}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-6 break-keep text-xs leading-6 text-hanji-faint">
              {current.hwaduId.startsWith("thrown:")
                ? "이 화두는 어느 낯선 이가 던진 것 — 스승의 답은 없습니다."
                : "정답은 없습니다. 다만 천 년 전에도 같은 물음을 품은 이들이 있었습니다."}
            </p>
          </details>

          {/* 잠시 — 다음으로 나아가기 전에.
              첫 문장만 남기고 나머지 뜻은 접어 둔다 (지우지 않는다) */}
          <div className="mt-3 w-full max-w-xl rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.34em] text-hanji-faint">
                  숨을 고르다
                </p>
                <p className="mt-1.5 break-keep text-[13px] leading-6 text-hanji-dim">
                  답을 쓰는 것으로 화두가 끝나지는 않습니다.
                </p>
              </div>
              <Link
                href="/breath"
                className="shrink-0 rounded-full border border-gold/40 px-4 py-2 text-[11.5px] tracking-[0.15em] text-gold-soft transition-colors hover:bg-gold/10 hover:text-gold"
              >
                호흡 명상 →
              </Link>
            </div>
            <details className="mt-3">
              <summary
                className={`${FOLD} text-[11px] tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim`}
              >
                왜 잠시 앉는가
              </summary>
              <p className="mt-2.5 break-keep text-[13px] leading-7 text-hanji-dim">
                지금 이 자리에서 잠시 눈을 감고 — 내가 쓴 답을 다시 한 번 몸으로
                느껴봅니다. 스승의 말과 나의 말이 어떻게 다르고, 어떻게 닮았는지
                그저 바라봅니다.
              </p>
            </details>
          </div>

          {/* 차 한 잔 — 회향의 여운이 남은 자리에서만 조용히 청한다.
              모바일은 카카오페이 바로, PC는 찻자리(QR)로. 링크가 없으면 접는다. */}
          {DONATION_URL && (
            <div className="mt-3 w-full max-w-xl rounded-[14px] border border-gold/25 bg-gold/5 px-5 py-4 text-left">
              <p className="text-[10px] tracking-[0.34em] text-gold-soft">
                喫茶去 · 차 한 잔
              </p>
              <p className="mt-2 break-keep text-[13px] leading-6 text-hanji-dim">
                {current.durationDays >= 21
                  ? "긴 물음을 끝까지 품으셨습니다. 이 도량이 그 곁에 있었다면 — 차 한 잔 값으로 등불을 보태 주실 수 있습니다."
                  : "이 물음이 마음에 남았다면 — 차 한 잔 값으로 도량의 등불을 보태 주실 수 있습니다."}
              </p>
              <a
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 text-[12px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 sm:hidden"
              >
                <Teacup className="h-4 w-4" />
                차 한 잔 올리기
              </a>
              <Link
                href="/tea"
                className="mt-3.5 hidden items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 text-[12px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10 sm:inline-flex"
              >
                <Teacup className="h-4 w-4" />
                차 한 잔 올리기
              </Link>
              <p className="mt-2.5 break-keep text-[11px] leading-5 text-hanji-faint">
                찻값은 이 도량을 잇는 데 쓰입니다.
              </p>
            </div>
          )}

          <button
            onClick={archiveCurrent}
            className="btn-obang btn-hot mt-12 flex h-[58px] w-full max-w-[19rem] items-center justify-center font-serif text-[15px] tracking-[0.26em] text-hanji"
          >
            <span className="[text-indent:0.26em]">다음 화두를 받다</span>
          </button>
        </section>
      </div>
    );
  }

  // ── 붓을 들었다 — 답 쓰기 ─────────────────────────────
  if (writing && unlocked) {
    return (
      // 답 쓰는 자리는 **한 겹 띄워** 화면을 통째로 쓴다.
      // 본문 흐름 안에 두었더니 바깥 스크롤 통이 같이 움직여, 아래 회향 단추가
      // 화면 밖으로 밀려났다(폰에서 저장이 안 보였다). 띄워 두면 입력줄은
      // 언제나 화면 맨 아래에 붙어 있다.
      <div className="fixed inset-0 z-50 flex flex-col bg-ink">
        {/* 채팅형 회향 — 위: 화두(물음)와 대화, 아래: 입력창.
            입력창은 흐름 안의 형제라 화면을 덮지 않고, 위 대화는 스스로 스크롤한다. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
            {/* 화두 — 스승의 물음처럼 왼쪽 말풍선 */}
            <div className="flex flex-col items-start">
              <span className="mb-1.5 text-[10px] tracking-[0.3em] text-hanji-faint">
                화두
              </span>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-ink-3 bg-ink-2/60 px-4 py-3.5">
                {/* 답을 쓰는 동안에도 물음이 제일 또렷해야 한다 */}
                <p className="hwadu-body whitespace-pre-line break-keep font-serif text-[16.5px] text-hanji">
                  {flatQuestion(sessionQuestion(current))}
                </p>
              </div>
            </div>
            {/* 안내 말풍선 */}
            <div className="flex flex-col items-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink-2/40 px-4 py-3">
                <p className="text-[12.5px] leading-6 text-hanji-dim">
                  며칠을 품고 계셨습니다. 무엇이 보였습니까.
                </p>
              </div>
            </div>

            {/* 사유의 방 단상은 여기에 두지 않는다 — 섞이면 어느 것이
                내 답인지 흐려진다. 단상은 서고에서 따로 펼쳐 본다. */}
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
              placeholder="여기에 답을 적어 주세요…"
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
                className="btn-obang tap shrink-0 rounded-full px-7 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
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
      // 아래 탭 바(76)와 떠 있는 단추가 「되돌아가기」를 덮고 있었다.
      // 아래를 넉넉히 비우면 가운데 정렬이 그만큼 위로 올라가, 머리 쪽
      // 빈 자리도 같이 줄어든다 — 두 불편이 한 번에 풀린다.
      <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-[calc(132px+env(safe-area-inset-bottom,0px))] pt-6 text-center md:pb-16 md:pt-12">
        {hwadu?.hanja && (
          <span className="rounded-full border border-gold/25 px-4 py-1 font-serif text-[10px] tracking-[0.42em] text-gold-soft [text-indent:0.42em]">
            {hwadu.hanja}
          </span>
        )}
        {/* 오직 이것만 보는 자리 — 곁에 아무것도 없으니 상한만 더 연다 */}
        <div className="question-glow hwadu-q mt-10 w-full max-w-2xl">
          <Question
            text={sessionQuestion(current)}
            min={questionFit(sessionQuestion(current)).min}
            max={questionFit(sessionQuestion(current)).max + 16}
            className="text-hanji"
          />
        </div>
        <button
          onClick={() => setFocusMode(false)}
          className="tap mt-12 rounded-full border border-ink-3 px-7 py-3 text-[11.5px] tracking-[0.25em] text-hanji-faint transition-colors hover:border-gold/40 hover:text-hanji"
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

  // 달이 차오르는 정도 — 받은 때부터 열리는 때까지를 한 줄 막대로 보인다.
  // 문장으로 "얼마 남았습니다"를 되풀이하는 것보다 눈에 한 번에 들어온다.
  // remaining 은 이 화면에서만 1초마다 갱신된다(needsCountdown) — 아직 재지
  // 못한 첫 순간에는 0으로 두어 막대가 가득 찬 채 번쩍이지 않게 한다.
  const moonSpan = unlockAt(current) - current.receivedAt;
  const moonPct =
    remaining > 0 && moonSpan > 0
      ? Math.min(
          100,
          Math.max(0, Math.round(((moonSpan - remaining) / moonSpan) * 100))
        )
      : 0;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-start px-5 pb-16 pt-4 text-center sm:justify-center sm:py-12">
      <section className="rise-sharp flex w-full max-w-2xl flex-col items-center">
        {/* 한자 — 금테 알약 하나. 제목·부제로 겹을 늘리지 않는다 */}
        {hwadu?.hanja && (
          <span className="rounded-full border border-gold/25 px-4 py-1 font-serif text-[10px] tracking-[0.42em] text-gold-soft [text-indent:0.42em]">
            {hwadu.hanja}
          </span>
        )}
        {/* 질문 — 이 화면에서 눈이 갈 곳은 여기 하나.
            활자를 키우고 자간·행간을 눌러 한 덩어리로 세운다(.hwadu-q). */}
        <div className="question-glow hwadu-q mt-8 w-full">
          <Question
            text={sessionQuestion(current)}
            min={questionFit(sessionQuestion(current)).min}
            max={questionFit(sessionQuestion(current)).max}
            className="text-hanji"
          />
        </div>
        {(current.customSource || hwadu?.context) && (
          <p className="mt-7 max-w-[24rem] break-keep text-[11.5px] leading-6 tracking-wide text-hanji-faint">
            {/* 세션에 담긴 배경(고친 화두·서버 화두)이 먼저, 없으면 원문 */}
            {current.customSource ?? hwadu?.context}
          </p>
        )}

        {/* 화두 곁의 세 가지 — 화두만 보기 · 함께 든 이 · 도량의 사람.
            누를 수 있는 것만 알약으로 남기고, 숫자는 흐린 한 줄로 내린다.
            같은 무게의 알약 셋이 화두 바로 밑에서 눈을 뺏던 것을 막는다. */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={() => setFocusMode(true)}
            className="tap rounded-full border border-gold/40 px-6 py-2.5 text-[11px] tracking-[0.25em] text-gold-soft transition-colors hover:bg-gold/10 hover:text-gold"
          >
            화두만 보기
          </button>
          {(holdingCount !== null ||
            (onlineCount !== null && onlineCount > 0)) && (
            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] tracking-wide text-hanji-faint">
              {holdingCount !== null && (
                <span>
                  {holdingCount >= 2
                    ? `함께 든 이 ${holdingCount}명`
                    : "이 물음을 든 사람은 그대뿐"}
                </span>
              )}
              {holdingCount !== null &&
                onlineCount !== null &&
                onlineCount > 0 && <span aria-hidden>·</span>}
              {onlineCount !== null && onlineCount > 0 && (
                <span>도량에 {onlineCount}명</span>
              )}
            </p>
          )}
        </div>

        {/* 달 — 찼으면 상자를 걷고 한 줄로 알린다. 그 자리의 주인공은
            '붓을 들다' 하나뿐이므로, 카드가 그 옆에 서 있을 이유가 없다. */}
        {unlocked ? (
          <div className="mt-10 flex w-full flex-col items-center">
            <p className="flex items-center gap-2.5 font-serif text-[17px] font-light tracking-wide text-hanji">
              <span className="moon !h-[20px] !w-[20px] shrink-0" />
              달이 차올랐습니다
            </p>
            <button
              onClick={() => {
                // 쓰다 만 답이 있으면 그 자리에서 이어 쓴다
                setDraft((d) => d || loadDraft(current.hwaduId));
                setWriting(true);
              }}
              className="btn-obang btn-hot mt-6 flex h-[58px] w-full max-w-[19rem] items-center justify-center font-serif text-[15px] tracking-[0.3em] text-hanji"
            >
              <span className="[text-indent:0.3em]">붓을 들다</span>
            </button>
          </div>
        ) : (
          /* 아직 차오르는 중 — 숫자와 막대 하나. 화두보다는 낮게 둔다 */
          <div className="mt-10 w-full max-w-md rounded-[16px] border border-ink-3 bg-ink-2/40 px-6 py-6">
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-hanji-faint">
                {/* .moon 의 본디 크기가 15px — 따로 키우지 않는다 */}
                <span className="moon shrink-0" />
                달이 차오르는 중 · {dayCount(current)}일째
              </span>
              {remaining > 0 && (
                // 전체 문장은 aria-label 로 그대로 읽힌다 — 토막은 눈을 위한 것
                <div
                  className="mt-4 flex items-end justify-center gap-3.5"
                  aria-label={`${formatCountdown(remaining)} 남음`}
                >
                  {countdownParts(remaining).map((p) => (
                    <span key={p.unit} className="flex items-baseline gap-1">
                      <span className="font-serif text-[26px] font-light leading-none tabular-nums text-hanji-dim">
                        {p.value}
                      </span>
                      <span className="text-[10.5px] text-hanji-faint">
                        {p.unit}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 h-[4px] w-full overflow-hidden rounded-full bg-ink-3">
                <div
                  className="h-full rounded-full bg-gold transition-[width] duration-1000"
                  style={{ width: `${moonPct}%` }}
                />
              </div>
              <p className="mt-2.5 break-keep text-[11px] leading-5 text-hanji-faint">
                {durationLabel(current.durationDays)} 뒤 답을 쓸 수 있어요
              </p>
            </div>
          </div>
        )}

        {/* 오늘의 참구법 — 날마다 다른 사유의 길.
            달 카드와 한 덩어리로 붙여, 카드 둘이 따로 서지 않게 한다 */}
        {!unlocked && (
          <div className="mt-2.5 w-full max-w-md rounded-[16px] border border-ink-3 bg-ink-2/40 px-6 py-5 text-left">
            <p className="text-[10px] tracking-[0.34em] text-gold-soft">
              오늘의 참구법 · {dayCount(current)}일째
            </p>
            <p className="mt-2.5 break-keep text-[13px] font-light leading-7 text-hanji-dim">
              {todayGuide(dayCount(current))}
            </p>
          </div>
        )}

        {/* 사유의 방 — 누르면 오른쪽 서랍이 열리고, 다시 누르면 접힌다.
            달을 기다리는 동안에는 손이 갈 곳이 여기뿐이라 넓게 연다 */}
        <button
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
          className={`tap mt-8 flex h-[54px] w-full max-w-[20rem] items-center justify-center gap-2.5 rounded-full border px-3 text-[12.5px] tracking-[0.1em] transition-colors ${
            notesOpen
              ? "border-gold/60 bg-gold/10 text-gold"
              : "border-gold/40 text-hanji hover:bg-gold/10"
          }`}
        >
          <Banga className="h-[17px] w-[17px] shrink-0 text-gold-soft" />
          {notesOpen ? "사유의 방 — 접기" : "사유의 방 — 떠오르는 것을 적다"}
        </button>

        {/* 기간 바꾸기 — 열면 알약 한 줄로 갈라진다 */}
        {!unlocked && (
          <div className="mt-7">
            {showSettings ? (
              <div className="flex flex-col items-center gap-2.5">
                <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-ink-3 bg-ink-2/50 p-1">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`tap rounded-full px-4 py-2 text-[11.5px] tracking-[0.12em] transition-colors ${
                        current.durationDays === d
                          ? "bg-gold font-medium text-ink"
                          : "text-hanji-dim hover:text-hanji"
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

        {/* 참구의 마음가짐 — 넉 줄을 한 줄로 접는다. 펴면 그대로 다 있다 */}
        <details className="mt-8 w-full max-w-md">
          <summary
            className={`${FOLD} text-center text-[12px] leading-6 tracking-[0.04em] text-hanji-faint transition-colors hover:text-hanji-dim`}
          >
            서두르지 마세요. 질문에는 정답이 없습니다.
          </summary>
          <p className="mt-2.5 break-keep text-center text-[12px] leading-6 text-hanji-faint">
            생각으로 찾아낸 것은 답이 아닙니다. 생각하기보다 끝까지 하는 힘이
            중요합니다.
          </p>
        </details>

        {/* 기다리는 동안 — 갈 곳. 내 도량(나무·공덕·오늘의 세 가지)도 여기서 */}
        {!unlocked && (
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2 text-[11.5px]">
            {[
              { href: "/masters", label: "선지식의 한마디" },
              { href: "/my-hwadu", label: "나도 화두 던지기" },
              { href: "/settings", label: "오늘의 세 가지" },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="tap rounded-full border border-ink-3 px-4 py-3 tracking-[0.06em] text-hanji-faint transition-colors hover:border-gold/40 hover:text-hanji"
              >
                {x.label}
              </Link>
            ))}
          </div>
        )}

        {/* 법당 — 내가 켠 불에 누가 손을 모았는지 여기서 돌아온다 */}
        <div className="mt-12 flex w-full justify-center">
          <BeopdangCard />
        </div>

        {/* 내려놓기 — 멀찍이, 흐리게. 찾으면 보이는 자리면 된다 */}
        <button
          onClick={layDown}
          className="tap mt-12 rounded-full border border-ink-3 px-7 py-3 text-[11.5px] tracking-[0.25em] text-hanji-faint transition-colors hover:border-vermilion/50 hover:text-hanji"
        >
          이 화두를 내려놓다
        </button>
      </section>

      {/* 사유의 방 서랍 */}
      <NotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  );
}
