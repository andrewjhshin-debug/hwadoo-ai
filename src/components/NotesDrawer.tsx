"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 서랍 — 화두를 화면에 둔 채, 오른쪽에서 열리는 메모장.
// 맨 위에 지금 든 화두가 적히고, 메모는 그 화두에 묶여 자동 저장된다.
// /room 페이지의 단상과 같은 곳에 저장되어 실시간으로 오간다.
// 아직 화두가 없으면 빈 방을 보이고, 그래도 적힌 글은 따로 갈무리해 두었다가
// 화두를 받으신 뒤 그 화두의 단상으로 이어 붙인다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStore, saveStore } from "@/lib/store";
import { sessionQuestion } from "@/lib/hwadu";
import { Banga } from "./icons";

// 화두가 없을 때 쓴 글을 잠시 맡아 두는 자리 — 어떤 경우에도 글이 사라지지 않게.
const DRAFT_KEY = "hwadoo-notes-draft";

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(value: string) {
  try {
    if (value.trim()) localStorage.setItem(DRAFT_KEY, value);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경 — 화면의 글은 그대로 둔다
  }
}

export default function NotesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [saved, setSaved] = useState(false);
  // 브라우저에 적지 못했을 때의 안내 (저장 공간이 찼을 때 등)
  const [saveError, setSaveError] = useState("");
  const [hasHwadu, setHasHwadu] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 아직 저장되지 않은 손글씨가 있는지 — 밖에서 온 갱신이 이를 덮어쓰지 않게 한다
  const dirty = useRef(false);

  // 열릴 때 최신 화두·단상을 불러온다. 맡아 둔 글이 있으면 함께 되살린다.
  useEffect(() => {
    if (!open) return;
    const s = loadStore();
    const kept = readDraft();
    const stored = s.current?.notes ?? "";
    setHasHwadu(!!s.current);
    setNotes(
      s.current
        ? stored && kept
          ? `${stored}\n\n${kept}`
          : stored || kept
        : kept
    );
    setQuestion(s.current ? sessionQuestion(s.current) : "");
    setSaved(false);
    dirty.current = !!kept;
  }, [open]);

  // 열려 있을 때 뒤로가기(back)를 누르면 서랍만 닫는다 — 페이지를 벗어나지 않게.
  // onClose를 ref로 잡아, 함수 재생성으로 effect가 다시 도는 부작용(열자마자 닫힘)을 막는다.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ notes: true }, "");
    const onPop = () => closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.notes) window.history.back();
    };
  }, [open]);

  // 다른 곳(/room 등)에서 단상이 바뀌면 서랍도 따라 갱신
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      const s = loadStore();
      setHasHwadu(!!s.current);
      // 화두가 없거나 아직 저장 전인 글이 있으면, 쓰던 것을 지우지 않는다
      if (!s.current || dirty.current) return;
      const latest = s.current.notes ?? "";
      setNotes((cur) => (cur === latest ? cur : latest));
    };
    window.addEventListener("hwadoo-store-updated", sync);
    return () => window.removeEventListener("hwadoo-store-updated", sync);
  }, [open]);

  // 늘 최신 글을 가리키는 손잡이 (주기 저장에서 쓴다)
  const notesRef = useRef("");
  useEffect(() => {
    notesRef.current = notes;
  });

  // 화두에 묶어 저장한다. 화두가 없으면 따로 맡아 두고 false를 돌려준다.
  const persist = (value: string): boolean => {
    const latest = loadStore();
    if (!latest.current) {
      writeDraft(value);
      setHasHwadu(false);
      return false;
    }
    if ((latest.current.notes ?? "") !== value) {
      if (
        !saveStore({ ...latest, current: { ...latest.current, notes: value } })
      ) {
        // 적지 못했다 — 글은 화면에 그대로 두고(dirty 유지) 사정을 알린다
        setSaveError("저장하지 못했습니다 — 저장 공간을 확인해 주십시오.");
        return false;
      }
      setSaved(true);
    }
    setSaveError("");
    writeDraft(""); // 맡아 둔 글은 화두의 단상으로 옮겨졌다
    dirty.current = false;
    return true;
  };

  const onChange = (value: string) => {
    setNotes(value);
    setSaved(false);
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(value), 600);
  };

  const saveNow = () => {
    if (timer.current) clearTimeout(timer.current);
    persist(notes);
  };

  // 안전망 — 열려 있는 동안 20초마다, 그리고 창을 덮거나 떠날 때 한 번 더
  useEffect(() => {
    if (!open) return;
    const tick = setInterval(() => persist(notesRef.current), 20_000);
    const onLeave = () => persist(notesRef.current);
    window.addEventListener("visibilitychange", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      clearInterval(tick);
      window.removeEventListener("visibilitychange", onLeave);
      window.removeEventListener("pagehide", onLeave);
      persist(notesRef.current); // 서랍을 닫을 때도 저장
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toHome = () => {
    onClose();
    router.push("/");
  };

  // 화두도 없고 쓴 글도 없다 — 빈 방을 보인다
  const empty = !hasHwadu && !notes.trim();

  return (
    <>
      {/* 배경 가림막 — 모바일은 팝업 뒤 딤, 데스크톱은 서랍 뒤 옅은 딤 */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:bg-black/30 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`notes-panel fixed z-50 flex flex-col overflow-hidden bg-ink-2/95 backdrop-blur transition-all duration-300
          /* 모바일 — 화면 가운데 팝업 카드 (홈 인디케이터를 피한다) */
          inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] top-3 rounded-2xl
          /* 데스크톱 — 오른쪽 전체 높이 서랍 */
          md:inset-x-auto md:inset-y-0 md:bottom-0 md:right-0 md:top-0 md:w-[380px] md:rounded-none
          ${
            open
              ? "scale-100 opacity-100 md:translate-x-0"
              : "pointer-events-none scale-95 opacity-0 md:translate-x-full md:scale-100 md:opacity-100"
          }`}
      >
        <header className="flex items-start justify-between border-b border-ink-3 px-6 py-5">
          <button
            onClick={toHome}
            aria-label="뜰로"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Banga className="h-6 w-6 text-gold-soft" />
            <div className="text-left">
              <p className="text-[10px] tracking-[0.4em] text-hanji-faint">
                思惟之房
              </p>
              <h2 className="text-sm tracking-[0.2em] text-hanji">사유의 방</h2>
            </div>
          </button>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-2 text-hanji-dim transition-colors hover:text-hanji"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {/* 지금 든 화두 — 맨 위에 */}
        {question && (
          <div className="border-b border-ink-3 px-6 py-4">
            <p className="text-[10px] tracking-[0.3em] text-hanji-faint">
              지금의 화두
            </p>
            <p className="mt-2 whitespace-pre-line font-serif text-sm font-light leading-7 text-hanji">
              {question.replace(/\n+/g, " ")}
            </p>
          </div>
        )}

        {empty ? (
          /* 빈 방 — 아직 물음이 없다 */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 pb-8 text-center">
            <div className="breathe opacity-70">
              <Banga className="h-16 w-16 text-gold-soft" />
            </div>
            <p className="mt-6 font-serif text-base font-light leading-8 text-hanji">
              방은 비어 있고, 물음이 그대를 기다립니다.
            </p>
            <p className="mt-3 text-xs leading-6 text-hanji-faint">
              단상은 화두에 묶여 남습니다. 먼저 화두를 받으십시오.
            </p>
            <button
              onClick={toHome}
              className="btn-obang mt-8 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
            >
              화두를 받으러 가다
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col px-6 pt-4">
            {hasHwadu ? (
              <p className="shrink-0 text-xs leading-6 text-hanji-faint">
                떠오르는 것을 적어 두십시오. 답이 아니라 발자국입니다.
              </p>
            ) : (
              /* 화두가 없는데 이미 쓴 글이 있다 — 지우지 않고 맡아 둔다 */
              <p className="shrink-0 rounded-lg border border-vermilion/40 px-3 py-2 text-xs leading-6 text-hanji-dim">
                아직 화두가 없어 이 글을 묶어 둘 곳이 없습니다. 글은 그대로
                맡아 두었으니, 화두를 받으시면 그 화두의 단상으로 이어집니다.
              </p>
            )}
            {/* 메모 — 남은 공간을 모두 차지, 스스로 스크롤.
                글꼴은 16px 아래로 내리지 않는다 (iOS가 화면을 확대한다) */}
            <textarea
              value={notes}
              onChange={(e) => onChange(e.target.value)}
              placeholder="여기에 적으십시오…"
              className="mt-3 min-h-0 w-full flex-1 resize-none rounded-xl border border-gold/30 bg-ink/40 p-4 text-[16px] leading-8 text-hanji outline-none placeholder:text-hanji-faint focus:border-gold/60"
            />
            {/* 저장 — 하단 고정(키보드가 올라와도 밀리지 않음) */}
            <div className="flex shrink-0 items-center justify-end gap-3 py-3">
              {!hasHwadu ? (
                <button
                  onClick={toHome}
                  className="text-[11px] text-vermilion underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
                >
                  화두를 받으러 가다
                </button>
              ) : saveError ? (
                <span className="text-[11px] leading-5 text-vermilion">
                  {saveError}
                </span>
              ) : (
                saved && (
                  <span className="text-[11px] text-hanji-faint">
                    저장되었습니다
                  </span>
                )
              )}
              {/* 닫기 — 자동 저장 구조이므로, 지금 글을 저장하고 서랍을 닫는다 */}
              <button
                onClick={() => {
                  saveNow();
                  onClose();
                }}
                className="rounded-full border border-ink-3 px-5 py-2 text-[12px] tracking-[0.2em] text-hanji-faint transition-colors hover:border-gold/30 hover:text-hanji-dim"
              >
                닫기
              </button>
              <button
                onClick={saveNow}
                className="btn-obang px-6 py-2 text-[12px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
