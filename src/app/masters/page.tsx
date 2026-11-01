"use client";

// ─────────────────────────────────────────────────────────────
// 선지식(善知識)의 한마디 — 화두를 기다리는 동안 기대는 어깨.
// 오늘의 한 구절 + 어록의 서고.
// 내장 어록에 뒷방에서 더한 어록을 합치고, 감춘 것(hiddenIds)과
// 영영 지운 것(removedIds)은 mergeSayings 가 둘 다 걸러 보인다.
// 뒷방에서 고쳐 쓴 어록(edited)은 mergeSayings 가 원문 위에 덮어 읽는다.
// (뒷방의 손질을 읽지 못하면 내장 어록 그대로 조용히 보인다)
//
// 어록 문장은 한 글자도 손대지 않는다 — 그게 이 화면의 내용이다.
// 바꾼 것은 담는 그릇뿐: 한 구절에 카드 하나, 스승은 금빛 뱃지 한 글자,
// 여섯째 구절부터는 <details> 로 접는다. 스물여섯 구절이 한 번에
// 쏟아지면 첫 구절조차 읽히지 않는다. 접은 것은 지운 것이 아니다.
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

  // 형: 「선지식은 중요하다 — 무게감 있고 신비롭게」. 갈래·구절 수 같은 말은 걷는다.
  return (
    <div className="hip-masters">
      <header>
        <p>善知識</p>
      </header>

      {saying && (
        <section className="hip-masters-now">
          <blockquote key={saying.text}>
            {splitSentences(saying.text).map((line, i) => <span key={i}>{line}</span>)}
          </blockquote>
          <p className="hip-masters-who">
            {saying.name}
            {saying.source && <small>『{saying.source}』</small>}
          </p>
          <button onClick={another}>다른 한마디</button>
        </section>
      )}

      <div className="hip-masters-rule" aria-hidden><Dharmachakra className="h-4 w-4" /></div>

      <section className="hip-masters-shelf">
        {pool.map((s, i) => (
          <figure key={`${s.name}-${i}`}>
            <blockquote>{splitSentences(s.text).map((line, j) => <span key={j}>{line}</span>)}</blockquote>
            <figcaption>{s.name}{s.source && <small>『{s.source}』</small>}</figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}
