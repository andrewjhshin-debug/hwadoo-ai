"use client";

// ─────────────────────────────────────────────────────────────
// 선지식(善知識)의 한마디 — 화두를 기다리는 동안 기대는 어깨.
// 오늘의 한 구절 + 어록의 서고.
// 내장 어록에 뒷방에서 더한 어록을 합치고, 감춘 것(hiddenIds)과
// 영영 지운 것(removedIds)은 mergeSayings 가 둘 다 걸러 보인다.
// 뒷방에서 고쳐 쓴 어록(edited)은 mergeSayings 가 원문 위에 덮어 읽는다.
// (뒷방의 손질을 읽지 못하면 내장 어록 그대로 조용히 보인다)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Dharmachakra } from "@/components/icons";
import { randomSaying, SAYINGS, splitSentences, type Saying } from "@/lib/sayings";
import { fetchAdminContent, mergeSayings } from "@/lib/adminContent";

export default function MastersPage() {
  const [saying, setSaying] = useState<Saying | null>(null);
  const [pool, setPool] = useState<Saying[]>(SAYINGS);

  useEffect(() => {
    // 우선 내장 어록으로 첫 한마디 — 뒷방의 손질(더함·감춤)이 오면 합쳐 잇는다
    setSaying(randomSaying());
    fetchAdminContent()
      .then((c) => {
        const merged = mergeSayings(c.sayings);
        // 모두 감춰져 비었으면 내장 그대로 둔다 — 빈 서고는 아무도 돕지 못한다
        if (merged.length === 0) return;
        setPool(merged);
        // 지금 걸린 한마디가 감춰진 것이면 합쳐진 어록에서 다시 뽑는다
        setSaying((cur) =>
          cur && merged.some((s) => s.text === cur.text)
            ? cur
            : merged[Math.floor(Math.random() * merged.length)]
        );
      })
      .catch(() => {});
  }, []);

  // 아무 한마디나 — 직전 것과는 겹치지 않게 (합쳐진 어록에서)
  const another = () => {
    setSaying((cur) => {
      const rest = cur ? pool.filter((s) => s.text !== cur.text) : pool;
      return rest.length > 0
        ? rest[Math.floor(Math.random() * rest.length)]
        : cur;
    });
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        善知識 · 선지식의 한마디
      </h1>

      {/* 한마디 — 누를 때마다 다른 말 */}
      {saying && (
        <section className="rise rise-d1 mt-12 text-center">
          <blockquote className="question-glow break-keep font-serif text-lg font-light leading-[1.8] text-hanji sm:text-xl">
            {splitSentences(saying.text).map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </blockquote>
          <p className="mt-5 text-xs tracking-widest text-hanji-dim">
            — {saying.name}
            {saying.era && (
              <span className="text-hanji-faint"> · {saying.era}</span>
            )}
            {saying.source && (
              <span className="text-hanji-faint"> · 『{saying.source}』</span>
            )}
          </p>
          <button
            onClick={another}
            className="mt-7 border border-ink-3 px-6 py-2.5 text-xs tracking-[0.25em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
          >
            다른 한마디
          </button>
        </section>
      )}

      <div className="rise rise-d2 my-12 flex items-center justify-center gap-3.5 opacity-70">
        <div className="h-px w-[90px] bg-gradient-to-r from-transparent to-gold/40" />
        <Dharmachakra className="h-4 w-4" stroke="#B99A54" />
        <div className="h-px w-[90px] bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 어록의 서고 */}
      <section className="rise rise-d2">
        <p className="text-center text-[11px] tracking-[0.34em] text-hanji-faint">
          어록의 서고
        </p>
        <div className="mt-8 flex flex-col gap-8">
          {pool.map((s, i) => (
            <figure key={i} className="border-l border-gold/25 pl-5">
              <blockquote className="break-keep font-serif text-[15px] font-light leading-8 text-hanji-dim">
                {splitSentences(s.text).map((line, j) => (
                  <span key={j} className="block">
                    {line}
                  </span>
                ))}
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
