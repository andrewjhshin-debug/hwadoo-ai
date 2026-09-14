"use client";

// ─────────────────────────────────────────────────────────────
// 사유의 방 — 화두와 내가 주고받는 방.
//
// 여느 AI 창과 좌우가 뒤집혀 있다. **오른쪽에서 화두가 묻고, 왼쪽에
// 내가 적는다.** 묻는 쪽이 기계가 아니라 물음이기 때문이다.
// 오간 말은 ThoughtRoom 이 맡는다 — 이 화면은 그 방을 크게 펼친 것이다.
// 지난 화두의 단상은 아래에 접어 둔다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import ThoughtRoom from "@/components/ThoughtRoom";
import { sessionTitle } from "@/lib/hwadu";
import { formatDate, loadStore, type Store } from "@/lib/store";
import { plainThoughts } from "@/lib/thoughts";

// 방 이름표 — 금빛 원 안의 한자 한 글자 + 짧은 이름 한 줄
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

  useEffect(() => {
    const read = () => setStore(loadStore());
    read();
    window.addEventListener("hwadoo-store-updated", read);
    return () => window.removeEventListener("hwadoo-store-updated", read);
  }, []);

  if (!store) return null;

  // 지난 화두에 남은 단상 — 최근 것이 위로
  const pastNotes = [...store.history].reverse().filter((s) => s.notes);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6 pt-5 md:pt-8">
      <RoomMark className="rise shrink-0 px-2" />

      {/* 오간 말 — 오른쪽이 화두, 왼쪽이 나 */}
      <div className="rise rise-d1 mt-4 flex min-h-[62vh] flex-1 flex-col overflow-hidden rounded-[16px] border border-ink-3 bg-ink-2/40">
        <ThoughtRoom />
      </div>

      {/* 지난 화두의 단상 — 통째로 한 번 접어 둔다 */}
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
                  {plainThoughts(s.notes)}
                </p>
              </details>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
