"use client";

// ─────────────────────────────────────────────────────────────
// 선지식(善知識)의 한마디 — 오늘의 한 구절 + 어록 서고
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Dharmachakra } from "@/components/icons";
import { SAYINGS, todaySaying, type Saying } from "@/lib/sayings";

export default function MastersPage() {
  // 날짜 기반이라 서버/클라이언트가 어긋나지 않도록 마운트 후 계산
  const [today, setToday] = useState<Saying | null>(null);

  useEffect(() => {
    setToday(todaySaying());
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        善知識 · 선지식의 한마디
      </h1>

      {/* 오늘의 한마디 */}
      {today && (
        <section className="rise rise-d1 mt-12 text-center">
          <p className="text-[11px] tracking-[0.34em] text-hanji-faint">
            오늘의 한마디
          </p>
          <blockquote className="question-glow mt-6 font-serif text-xl font-light leading-[1.9] text-hanji sm:text-2xl">
            {today.text}
          </blockquote>
          <p className="mt-5 text-xs tracking-widest text-hanji-dim">
            — {today.name}
            {today.era && <span className="text-hanji-faint"> · {today.era}</span>}
            {today.source && (
              <span className="text-hanji-faint"> · 『{today.source}』</span>
            )}
          </p>
        </section>
      )}

      <div className="rise rise-d2 my-12 flex items-center justify-center gap-3.5 opacity-70">
        <div className="h-px w-[90px] bg-gradient-to-r from-transparent to-gold/40" />
        <Dharmachakra className="h-4 w-4" stroke="#B99A54" />
        <div className="h-px w-[90px] bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 어록 서고 */}
      <section className="rise rise-d2">
        <p className="text-center text-[11px] tracking-[0.34em] text-hanji-faint">
          어록의 서고
        </p>
        <div className="mt-8 flex flex-col gap-8">
          {SAYINGS.map((s, i) => (
            <figure key={i} className="border-l border-gold/25 pl-5">
              <blockquote className="font-serif text-[15px] font-light leading-8 text-hanji-dim">
                {s.text}
              </blockquote>
              <figcaption className="mt-2 text-xs tracking-widest text-hanji-faint">
                — {s.name}
                {s.era && ` · ${s.era}`}
                {s.source && ` · 『${s.source}』`}
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 text-center text-[11px] leading-5 text-hanji-faint">
          전승된 어록과 경전을 우리말로 풀어 옮긴 것입니다.
        </p>
      </section>
    </div>
  );
}
