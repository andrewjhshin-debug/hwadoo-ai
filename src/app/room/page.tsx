"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 — 화두를 실제로 '드는' 곳.
// · 참구 중: 단상(斷想)을 적어 둔다 — 자동 임시저장
// · 때가 되면: 붓을 들어 그대의 답(회향)을 쓴다
// · 회향 후: 옛 스승들의 답이 열린다 (피드백) + 차 한 잔(후원)
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Donation from "@/components/Donation";
import { getHwadu, sessionQuestion } from "@/lib/hwadu";
import {
  dayCount,
  durationLabel,
  formatRemaining,
  isManual,
  isUnlocked,
  loadStore,
  saveStore,
  unlockAt,
  type Store,
} from "@/lib/store";

export default function RoomPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [writing, setWriting] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = loadStore();
    setStore(s);
    setNotes(s.current?.notes ?? "");
  }, []);

  const update = useCallback((next: Store) => {
    setStore(next);
    saveStore(next);
  }, []);

  // 단상 자동 임시저장 — 타이핑이 멈추고 0.6초 뒤
  const onNotesChange = (value: string) => {
    setNotes(value);
    setSavedNote(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // 항상 최신 기록 위에 덮어쓴다 — 상태 갱신과 저장을 분리
      const latest = loadStore();
      if (!latest.current) return;
      const next = {
        ...latest,
        current: { ...latest.current, notes: value },
      };
      saveStore(next);
      setStore(next);
      setSavedNote(true);
    }, 600);
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

  const nextHwadu = () => {
    if (!store?.current) return;
    update({
      ...store,
      history: [...store.history, store.current],
      current: null,
    });
    router.push("/");
  };

  if (!store) return null;

  const current = store.current;

  // 들고 있는 화두가 없을 때
  if (!current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="rise font-serif text-lg font-light leading-9 text-hanji">
          들고 있는 화두가 없습니다.
        </p>
        <p className="rise rise-d1 mt-2 text-[13px] text-hanji-dim">
          방은 비어 있고, 물음은 그대를 기다립니다.
        </p>
        <Link
          href="/"
          className="btn-obang rise rise-d2 mt-9 px-8 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
        >
          화두를 받으러 가다
        </Link>
      </div>
    );
  }

  const hwadu = getHwadu(current.hwaduId);
  const unlocked = isUnlocked(current);
  const question = sessionQuestion(current);

  // ── 회향을 마쳤다 — 스승들의 답 (피드백) ──
  if (current.journal) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
        <p className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
          回向 · 그대의 답
        </p>
        <p className="rise rise-d1 mt-6 whitespace-pre-line text-center font-serif text-[15px] font-light leading-9 text-hanji">
          {current.journal}
        </p>

        <div className="rise rise-d2 mt-14 border-t border-ink-3 pt-11 text-center">
          <p className="text-xs tracking-[0.5em] text-hanji-faint">
            {current.customQuestion
              ? "이 화두는 그대가 던진 것"
              : "옛 스승들은 이렇게 일렀습니다"}
          </p>
        </div>

        {current.customQuestion ? (
          <p className="rise rise-d3 mt-9 text-center text-sm leading-8 text-hanji-dim">
            그대가 세상에 던진 물음이니, 스승의 답 또한 그대 안에 있습니다.
            <br />
            정답은 없습니다 — 다만 물음과 함께 보낸 시간만이 남습니다.
          </p>
        ) : (
          <div className="mt-9 flex flex-col gap-9">
            {hwadu?.masters.map((m, i) => (
              <figure key={m.name + i} className={`rise ${i === 0 ? "rise-d3" : "rise-d4"}`}>
                <blockquote className="whitespace-pre-line font-serif text-[15px] font-light leading-9 text-hanji">
                  {m.text}
                </blockquote>
                <figcaption className="mt-3 text-right text-xs tracking-widest text-hanji-dim">
                  — {m.name}
                  {m.era && <span className="text-hanji-faint"> · {m.era}</span>}
                </figcaption>
              </figure>
            ))}
            <p className="text-center text-xs leading-6 text-hanji-faint">
              정답은 없습니다. 다만 천 년 전에도 같은 물음을 품은 이들이
              있었습니다.
            </p>
          </div>
        )}

        {current.notes && (
          <details className="rise rise-d4 mt-12 border-t border-ink-3 pt-8">
            <summary className="cursor-pointer text-xs tracking-[0.3em] text-hanji-faint transition-colors hover:text-hanji-dim">
              참구하며 남긴 단상 보기
            </summary>
            <p className="mt-5 whitespace-pre-line text-sm leading-8 text-hanji-dim">
              {current.notes}
            </p>
          </details>
        )}

        <div className="rise rise-d4 mt-14">
          <Donation />
        </div>

        <p className="mt-12 text-center">
          <button
            onClick={nextHwadu}
            className="btn-obang px-9 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
          >
            다음 화두를 받다
          </button>
        </p>
      </div>
    );
  }

  // ── 붓을 들었다 — 답 쓰기 ──
  if (writing && unlocked) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-14">
        <p className="rise whitespace-pre-line text-center font-serif text-sm font-light leading-8 text-hanji-dim">
          {question}
        </p>
        <div className="rise rise-d1 mt-9 border-t border-ink-3 pt-7">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder={
              isManual(current)
                ? "마음이 무르익어 붓을 드셨습니다. 무엇이 보였습니까."
                : `${durationLabel(current.durationDays)}을 품고 계셨습니다. 무엇이 보였습니까.`
            }
            className="journal-area"
          />
        </div>
        <div className="rise rise-d2 mt-5 flex items-center justify-between">
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
      </div>
    );
  }

  // ── 참구 중 — 단상을 적는 방 ──
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-14">
      <p className="rise text-center text-xs tracking-[0.4em] text-gold-soft">
        思惟之房 · 사유의 방
      </p>
      <p className="rise rise-d1 mt-7 whitespace-pre-line text-center font-serif text-lg font-light leading-[2] text-hanji sm:text-xl">
        {question}
      </p>

      <div className="rise rise-d2 mt-8 flex items-center justify-center gap-2.5 text-[13px] font-light text-hanji-dim">
        <span className="moon" />
        {isManual(current) ? (
          <>함께한 지 {dayCount(current)}일째 · 마음이 무르익으면 붓을 드십시오</>
        ) : unlocked ? (
          <>때가 되었습니다 · 이제 붓을 들 수 있습니다</>
        ) : (
          <>
            함께한 지 {dayCount(current)}일째 ·{" "}
            {formatRemaining(unlockAt(current) - Date.now())} 뒤에 붓을 들 수
            있습니다
          </>
        )}
      </div>

      {unlocked && (
        <p className="rise rise-d2 mt-7 text-center">
          <button
            onClick={() => setWriting(true)}
            className="btn-obang px-10 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            붓을 들다
          </button>
        </p>
      )}

      {/* 단상 — 임시저장 메모 */}
      <div className="rise rise-d3 mt-12 border-t border-ink-3 pt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs tracking-[0.4em] text-hanji-faint">
            斷想 · 단상
          </h2>
          <span className="text-[11px] text-hanji-faint">
            {savedNote ? "저절로 저장되었습니다" : "쓰는 대로 저장됩니다"}
          </span>
        </div>
        <p className="mt-3 text-xs leading-6 text-hanji-faint">
          참구하다 스치는 생각이 있거든 여기 적어 두십시오. 답이 아니라
          발자국입니다.
        </p>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={7}
          placeholder="오늘 문득 —"
          className="journal-area mt-5"
        />
      </div>
    </div>
  );
}
