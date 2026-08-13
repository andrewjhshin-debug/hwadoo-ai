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
        setSaveError("저장하지 못했습니다 — 저장 공간을 확인해 주십시오.");
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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-10 pt-5 md:pt-12">
      {/* 상단 — 제목 + 화두, 콤팩트하게 위로 */}
      <h1 className="rise text-center text-[11px] tracking-[0.4em] text-gold-soft">
        思惟之房 · 사유의 방
      </h1>
      <p className="rise rise-d1 mt-2 whitespace-pre-line text-center font-serif text-[13px] font-light leading-6 text-hanji-dim">
        {sessionQuestion(store.current)}
      </p>

      {/* 메모 — 박스로 또렷이 구분, 넓게 */}
      <div className="rise rise-d2 mt-5 flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] leading-5 text-hanji-faint">
            떠오르는 것을 적어 두십시오 — 답이 아니라 발자국입니다.
          </p>
          {saveError ? (
            <span className="shrink-0 text-[10px] leading-5 text-vermilion">
              {saveError}
            </span>
          ) : (
            savedAt && (
              <span className="shrink-0 text-[10px] text-hanji-faint">
                {saved ? `저장됨 · ${savedAt}` : "적는 중…"}
              </span>
            )
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="여기에 적으십시오…"
          className="w-full flex-1 resize-none rounded-xl border border-gold/30 bg-ink-2/50 p-4 text-[14px] leading-7 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/60"
          style={{ minHeight: "48vh" }}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={saveNow}
            className="btn-obang px-6 py-2 text-[12px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
          >
            저장
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
