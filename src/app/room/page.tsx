"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 — 반가사유상 아래에서 떠오르는 것을 적는 곳.
// 메모는 지금 들고 있는 화두에 붙어 자동 저장된다.
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

export default function RoomPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = loadStore();
    setStore(s);
    setNotes(s.current?.notes ?? "");
  }, []);

  const persist = (value: string) => {
    const latest = loadStore();
    if (!latest.current) return;
    saveStore({ ...latest, current: { ...latest.current, notes: value } });
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
    timer.current = setTimeout(() => persist(value), 600);
  };

  // 임시 저장 — 지금 곧바로 저장
  const saveNow = () => {
    if (timer.current) clearTimeout(timer.current);
    persist(notes);
  };

  if (!store) return null;

  // 들고 있는 화두가 없다 — 빈 방
  if (!store.current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <div className="rise breathe opacity-70">
          <BangaLarge />
        </div>
        <h1 className="rise rise-d1 mt-6 text-xs tracking-[0.5em] text-gold-soft">
          思惟之房 · 사유의 방
        </h1>
        <p className="rise rise-d1 mt-6 font-serif text-lg font-light leading-9 text-hanji">
          방은 비어 있고, 물음이 그대를 기다립니다.
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

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-12">
      <div className="rise flex flex-col items-center">
        <div className="breathe opacity-80">
          <BangaLarge />
        </div>
        <h1 className="mt-4 text-xs tracking-[0.5em] text-gold-soft">
          思惟之房 · 사유의 방
        </h1>
      </div>

      <p className="rise rise-d1 mt-8 whitespace-pre-line text-center font-serif text-base font-light leading-8 text-hanji-dim">
        {sessionQuestion(store.current)}
      </p>

      <div className="rise rise-d2 mt-9 flex flex-1 flex-col border-t border-ink-3 pt-7">
        <p className="text-xs leading-6 text-hanji-faint">
          떠오르는 것을 적어 두십시오. 답이 아니라 발자국입니다.
          <br />이 단상은 「{sessionTitle(store.current)}」 화두에 묶여
          저장됩니다.
        </p>
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          rows={7}
          placeholder="오늘 문득 —"
          className="journal-area mt-4 h-[30vh] min-h-[160px]"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          {savedAt && (
            <span className="text-[11px] text-hanji-faint">
              임시 저장됨 · {savedAt}
            </span>
          )}
          <button
            onClick={saveNow}
            className="border border-ink-3 px-5 py-2 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            임시 저장
          </button>
        </div>
      </div>

      {/* 지난 화두들의 단상 — 화두별로 남는다 */}
      {store.history.some((s) => s.notes) && (
        <div className="rise rise-d3 mt-10 border-t border-ink-3 pt-7">
          <p className="text-xs tracking-[0.4em] text-hanji-faint">
            지난 화두의 단상
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {[...store.history]
              .reverse()
              .filter((s) => s.notes)
              .map((s) => (
                <details key={`${s.hwaduId}-${s.receivedAt}`}>
                  <summary className="cursor-pointer text-[13px] text-hanji-dim transition-colors hover:text-hanji">
                    「{sessionTitle(s)}」{" "}
                    <span className="text-[11px] text-hanji-faint">
                      · {formatDate(s.receivedAt)}
                    </span>
                  </summary>
                  <p className="mt-2 whitespace-pre-line border-l border-gold/25 pl-4 text-[13px] leading-7 text-hanji-faint">
                    {s.notes}
                  </p>
                </details>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
