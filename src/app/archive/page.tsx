"use client";

// 기록 — 회향을 마친 화두들의 서고(書庫)
import { useEffect, useState } from "react";
import Link from "next/link";
import { sessionQuestion, sessionTitle } from "@/lib/hwadu";
import { formatDate, loadStore, type Session } from "@/lib/store";

export default function ArchivePage() {
  const [history, setHistory] = useState<Session[] | null>(null);

  useEffect(() => {
    setHistory(loadStore().history);
  }, []);

  if (!history) return null;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        記錄 · 기록
      </h1>

      {history.length === 0 ? (
        <div className="rise rise-d1 mt-24 text-center">
          <p className="font-serif text-base font-light leading-8 text-hanji-dim">
            아직 회향한 화두가 없습니다.
          </p>
          <p className="mt-2 text-xs text-hanji-faint">
            물음을 품은 시간이 쌓이면, 이곳이 그대의 서고가 됩니다.
          </p>
          <Link
            href="/"
            className="btn-obang mt-10 inline-block px-8 py-3 text-xs tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
          >
            화두를 받으러 가다
          </Link>
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-11">
          {[...history].reverse().map((s, i) => (
            <article
              key={`${s.hwaduId}-${s.receivedAt}`}
              className={`rise border-t border-ink-3 pt-7 ${i < 3 ? `rise-d${i + 1}` : ""}`}
            >
              <p className="text-[11px] tracking-[0.25em] text-gold-soft">
                {s.customQuestion ? "그대가 던진 화두" : sessionTitle(s)}
              </p>
              <p className="mt-3 whitespace-pre-line font-serif text-[15px] font-light leading-8 text-hanji">
                {sessionQuestion(s)}
              </p>
              <p className="mt-3 text-[11px] tracking-wider text-hanji-faint">
                {formatDate(s.receivedAt)} 받음
                {s.journalAt && ` · ${formatDate(s.journalAt)} 회향`}
              </p>
              {s.journal && (
                <blockquote className="mt-4 whitespace-pre-line border-l border-gold/30 pl-5 text-sm font-light leading-8 text-hanji-dim">
                  {s.journal}
                </blockquote>
              )}
              {s.notes && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] tracking-widest text-hanji-faint transition-colors hover:text-hanji-dim">
                    단상 보기
                  </summary>
                  <p className="mt-2 whitespace-pre-line pl-5 text-[13px] leading-7 text-hanji-faint">
                    {s.notes}
                  </p>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
