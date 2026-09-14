"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 — 반가사유상 아래에서 떠오르는 것을 적는 곳.
// 메모는 지금 들고 있는 화두에 붙어 자동 저장된다.
//
// 화면의 주인공은 '쓰는 자리'다. 그래서 위쪽 머리글은 한 줄로 눕히고,
// 안내문은 지우지 않고 빈 칸(placeholder) 안으로 접어 넣었다.
// 지난 단상은 통째로 한 번 더 접어, 쓰는 동안 시야를 가리지 않게 했다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sessionQuestion, sessionTitle } from "@/lib/hwadu";
import { formatDate, loadStore, saveStore, type Store } from "@/lib/store";

// 반가사유상 — 크게, 미니멀하게
function BangaLarge() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B99A54"
      strokeWidth="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-24 w-24"
      aria-hidden
    >
      <circle cx="13.6" cy="5" r="2.2" />
      <path d="M15.2 7.2c.9 1 1 2.2.2 3.1" />
      <path d="M15.4 10.3c-1.1.4-2 .1-2.5-.6" />
      <path d="M12 7.6c-1.6 1.2-2.4 2.8-2.4 4.9v2.6" />
      <path d="M9.6 15.1h6.2c1.4 0 2.4.9 2.6 2.3" />
      <path d="M9.6 15.1c-1.8.4-3 1.5-3.4 3.2" />
      {/* 좌대 */}
      <path d="M6 20.5h12" opacity="0.5" />
    </svg>
  );
}

// 방 이름표 — 「思惟之房 · 사유의 방」 두 겹으로 쓰던 제목을
// 금빛 원 안의 한자 한 글자 + 짧은 이름 한 줄로 눌렀다. 뜻은 그대로 남는다.
function RoomMark({ className = "" }: { className?: string }) {
  return (
    <h1 className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/40 font-serif text-[12px] leading-none text-gold"
      >
        思
      </span>
      <span className="text-[11px] tracking-[0.35em] text-hanji-faint">
        사유의 방
      </span>
    </h1>
  );
}

// 접힘 표시 — 이모지 대신 직접 그린 꺾쇠
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180"
      aria-hidden
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export default function RoomPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  // 브라우저에 적지 못했을 때의 안내 (저장 공간이 찼을 때 등)
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef("");
  const lastWrote = useRef<string | null>(null);

  useEffect(() => {
    const s = loadStore();
    setStore(s);
    setNotes(s.current?.notes ?? "");
  }, []);

  // 늘 최신 글을 가리키는 손잡이 (떠날 때 마저 저장하는 데 쓴다)
  useEffect(() => {
    notesRef.current = notes;
  });

  const persist = (value: string) => {
    const latest = loadStore();
    if (!latest.current) return;
    lastWrote.current = value;
    if ((latest.current.notes ?? "") !== value) {
      if (
        !saveStore({ ...latest, current: { ...latest.current, notes: value } })
      ) {
        // 적지 못했다 — 글은 화면에 그대로 두고 사정을 알린다
        setSaved(false);
        setSaveError("저장하지 못했습니다 — 저장 공간을 확인해 주세요.");
        return;
      }
    }
    setSaveError("");
    setSaved(true);
    setSavedAt(
      new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const onChange = (value: string) => {
    setNotes(value);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      persist(value);
    }, 600);
  };

  // 임시 저장 — 지금 곧바로 저장
  const saveNow = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    persist(notes);
  };

  // 같은 단상을 보는 다른 창(하단 FAB의 사유의 방 서랍, 다른 탭)이 글을 바꾸면
  // 이 화면도 따라간다 — 두 곳이 서로의 글을 덮어쓰지 않게.
  // 아직 저장 대기 중이거나 방금 우리가 쓴 값이면 건드리지 않는다.
  useEffect(() => {
    const sync = () => {
      if (timer.current) return;
      const latest = loadStore().current?.notes ?? "";
      if (latest === lastWrote.current) return;
      setNotes((cur) => (cur === latest ? cur : latest));
    };
    window.addEventListener("hwadoo-store-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hwadoo-store-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // 안전망 — 창을 덮거나 이 화면을 떠날 때, 기다리던 저장을 마저 끝낸다
  useEffect(() => {
    const flush = () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      persist(notesRef.current);
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, []);

  if (!store) return null;

  // 들고 있는 화두가 없다 — 빈 방
  if (!store.current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <div className="rise breathe opacity-70">
          <BangaLarge />
        </div>
        <RoomMark className="rise rise-d1 mt-7" />
        <p className="rise rise-d1 mt-6 font-serif text-lg font-light leading-9 text-hanji">
          방은 비어 있고, 물음이 그대를 기다립니다.
        </p>
        <Link
          href="/"
          className="btn-obang rise rise-d2 mt-9 px-8 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
        >
          화두 받으러 가기
        </Link>
      </div>
    );
  }

  // 지난 화두에 남은 단상 — 최근 것이 위로
  const pastNotes = [...store.history].reverse().filter((s) => s.notes);
  const count = notes.trim().length;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-10 pt-5 md:pt-10">
      {/* 머리 — 이름표와 저장 상태를 한 줄에 눕혀 위를 비운다 */}
      <div className="rise flex items-center justify-between gap-3">
        <RoomMark />
        {saveError ? (
          <span className="shrink-0 text-right text-[10px] leading-4 text-vermilion">
            {saveError}
          </span>
        ) : (
          savedAt && (
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-hanji-faint">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  saved ? "bg-gold" : "bg-gold/30"
                }`}
              />
              {saved ? `저장됨 · ${savedAt}` : "적는 중…"}
            </span>
          )
        )}
      </div>

      {/* 지금 들고 있는 물음 — 쓰는 자리의 머리에 놓인 하나의 앵커 */}
      <p className="question-glow rise rise-d1 mt-7 whitespace-pre-line break-keep text-center font-serif text-[19px] font-light leading-8 text-hanji">
        {sessionQuestion(store.current)}
      </p>

      {/* 쓰는 자리 — 이 화면의 주인공. 카드가 통째로 종이가 된다 */}
      <div className="rise rise-d2 mt-7 flex flex-1 flex-col rounded-[14px] border border-ink-3 bg-ink-2/50 p-4 transition-colors focus-within:border-gold/50">
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          aria-label="사유의 방 단상"
          placeholder="떠오르는 것을 적어 두세요 — 답이 아니라 발자국입니다."
          className="w-full flex-1 resize-none bg-transparent text-[14px] leading-8 text-hanji outline-none placeholder:text-hanji-faint"
          style={{ minHeight: "44vh" }}
        />
        <div className="mt-3 flex items-center justify-between border-t border-ink-3 pt-3">
          {/* 글자 수 — 설명 대신 숫자 하나로 오늘의 걸음을 보여준다 */}
          <span className="text-[11px] text-hanji-faint">
            <span className="font-serif text-[16px] font-light text-gold">
              {count}
            </span>
            <span className="ml-1">자</span>
          </span>
          <button
            onClick={saveNow}
            className="btn-obang px-6 py-2 text-[12px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
          >
            저장
          </button>
        </div>
      </div>

      {/* 지난 화두의 단상 — 목록째로 한 번 접어 둔다. 내용은 하나도 줄이지 않았다 */}
      {pastNotes.length > 0 && (
        <details className="rise rise-d3 group mt-8 border-t border-ink-3 pt-5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-hanji-faint transition-colors hover:text-hanji-dim [&::-webkit-details-marker]:hidden">
            <span className="text-[11px] tracking-[0.3em]">지난 단상</span>
            <span className="flex items-center gap-2">
              <span className="font-serif text-[13px] text-gold-soft">
                {pastNotes.length}
              </span>
              <Chevron />
            </span>
          </summary>
          <div className="mt-4 flex flex-col gap-2.5">
            {pastNotes.map((s) => (
              <details
                key={`${s.hwaduId}-${s.receivedAt}`}
                className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3"
              >
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 text-[13px] text-hanji-dim transition-colors hover:text-hanji [&::-webkit-details-marker]:hidden">
                  <span className="break-keep">「{sessionTitle(s)}」</span>
                  <span className="shrink-0 text-[11px] text-hanji-faint">
                    {formatDate(s.receivedAt)}
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-line border-l border-gold/25 pl-4 text-[13px] leading-7 text-hanji-faint">
                  {s.notes}
                </p>
              </details>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
