"use client";

// ─────────────────────────────────────────────────────────────
// 목탁 — 폰 판.
//
// 형이 짚어 준 것들 —
//   「탭이랑 막 겹치잖아」          → 화면을 통째로 덮는다(하심과 같은 길)
//   「흰 핑크 민트 이쁘게 힙하게」   → 흰 바탕에 연꽃 분홍과 민트가 번진다
//   「글자수는 최대한 줄여」         → 남은 글자는 百八 · 숫자 · 남음 · 셈 셋
//   「목탁이나 염주 원래 디자인을 빼먹진 마」
//                                  → **오브제가 주인공**이다. 숫자만 남긴 판을
//                                    한 번 만들어 봤는데 그건 우리 앱이 아니었다
//   「니가 더 생각하고 디자인 요소 더 넣으라고」
//                                  → 아래 넷은 시키지 않은 것들이다
//
// 내가 얹은 넷 —
//   ① **숨 쉬는 바탕** — 분홍과 민트 덩이가 아주 느리게(26초) 흐른다.
//      멈춰 있는 그라데이션은 배경이고, 흐르면 자리가 된다
//   ② **파문** — 칠 때마다 오브제에서 분홍 고리 하나가 퍼진다.
//      목탁은 소리가 퍼지는 물건이니 눈에도 퍼져야 한다
//   ③ **숫자가 톡** — 칠 때마다 숫자가 아주 살짝 눌렸다 돌아온다.
//      손끝과 화면이 같은 박자로 움직인다
//   ④ **마디의 결** — 스물일곱째마다 격자가 민트로 한 번 훑고 지나간다.
//      백여덟은 스물일곱의 네 몫이다. 그 마디를 몸이 알아채게
//
// 기능은 한 줄도 새로 안 짰다. 셈·소리·공덕·서랍은 전부 부모(page.tsx)가
// 쥐고 있고 여기는 받아 그린다 — 이 파일을 통째로 지워도 앱은 돈다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import HipShell from "@/components/HipShell";
import { ROUND } from "@/lib/merit";

export type HipMoktakProps = {
  hits: number;
  merit: number;
  beadHits: number;
  bowlHits: number;
  combo: number;
  /** 지금 고른 살갗 그림 */
  src: string;
  /** 한 번 친다 — 부모의 손타 처리를 그대로 부른다 */
  onHit: () => void;
  /** 살림살이(갈래·정근·소리·자동·살갗)를 펴 보인다 */
  onMore: () => void;
  /** 떠오르는 글자 */
  pops: { id: number; ch: string; dx: number; rot: number }[];
};

export default function HipMoktak({
  hits,
  merit,
  beadHits,
  bowlHits,
  combo,
  src,
  onHit,
  onMore,
  pops,
}: HipMoktakProps) {
  const inRound = hits % ROUND;
  const left = ROUND - inRound;

  // ④ 마디 — 스물일곱째를 지날 때만 격자가 한 번 훑인다
  const [knot, setKnot] = useState(false);
  const seen = useRef(0);
  useEffect(() => {
    if (hits === seen.current) return;
    const crossed = hits > 0 && hits % 27 === 0;
    seen.current = hits;
    if (!crossed) return;
    setKnot(true);
    const t = window.setTimeout(() => setKnot(false), 900);
    return () => window.clearTimeout(t);
  }, [hits]);

  return (
    <HipShell here="/moktak">
    <div className="hip-screen md:hidden">
      {/* ① 숨 쉬는 바탕 — 덩이 둘이 서로 다른 박자로 아주 느리게 흐른다 */}
      <span aria-hidden className="hip-bloom hip-bloom-a" />
      <span aria-hidden className="hip-bloom hip-bloom-b" />

      <header className="hip-screen-top">
        <a href="/" aria-label="화두 홈" className="hip-home">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 4.2c1.7 2.4 2.4 4.4 2.4 6.3s-1.1 3.7-2.4 4.9c-1.3-1.2-2.4-3-2.4-4.9s.7-3.9 2.4-6.3z" />
            <path d="M12 15.4c-1.9-1.6-4.6-2.3-7.4-2.2.3 2.6 2.4 4.6 5 5 .9.1 1.7 0 2.4-.3" />
            <path d="M12 15.4c1.9-1.6 4.6-2.3 7.4-2.2-.3 2.6-2.4 4.6-5 5-.9.1-1.7 0-2.4-.3" />
          </svg>
          <b>화두</b>
        </a>
        <div className="flex items-center gap-3">
          <span className="hip-kicker">百八</span>
          <span
            className={`hip-hap ${combo >= 2 ? "on" : ""}`}
            aria-hidden={combo < 2}
          >
            合
          </span>
          <button onClick={onMore} aria-label="살림살이" className="hip-more">
            ⋯
          </button>
        </div>
      </header>

      <div className="hip-screen-mid">
        {/* ── 목탁 — 이 화면의 주인공. 누르는 자리도 여기다 ── */}
        <button
          onClick={onHit}
          aria-label="목탁 치기"
          className="hip-obj"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {/* ② 파문 — 칠 때마다 새 고리 하나 */}
          {hits > 0 && (
            <span key={`w${hits}`} aria-hidden>
              <i className="hip-ripple" />
              <i className="hip-ripple hip-ripple-2" />
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={`o${hits}`} src={src} alt="" aria-hidden className="hip-obj-img" />
          {/* 떠오르는 글자 */}
          <span aria-hidden className="hip-pops">
            {pops.map((p) => (
              <span
                key={p.id}
                style={{
                  left: p.dx,
                  transform: `rotate(${p.rot}deg)`,
                  animation: "mk-pop 1s cubic-bezier(.2,.7,.3,1) forwards",
                }}
              >
                {p.ch}
              </span>
            ))}
          </span>
        </button>

        {/* ③ 숫자가 톡 — key 를 갈아 끼워 칠 때마다 다시 난다 */}
        <p key={`n${hits}`} className="hip-big" aria-label={`오늘 울린 목탁 ${hits}번`}>
          {String(hits).padStart(3, "0")}
        </p>
        <p className="hip-under">{left} 남음</p>

        <div
          className={`hip-grid108 mt-7 w-full${knot ? " knot" : ""}`}
          role="img"
          aria-label={`백팔 중 ${inRound}번`}
        >
          {Array.from({ length: ROUND }, (_, i) => (
            <i
              key={i}
              style={{ ["--i" as string]: String(i) }}
              data-on={i < inRound ? "1" : undefined}
              data-knot={i % 27 === 0 ? "1" : undefined}
            />
          ))}
        </div>

        <div className="hip-stats">
          {[
            [merit.toLocaleString("ko-KR"), "공덕"],
            [beadHits.toLocaleString("ko-KR"), "염주"],
            [bowlHits.toLocaleString("ko-KR"), "싱잉볼"],
          ].map(([n, k]) => (
            <div key={k}>
              <b>{n}</b>
              <span>{k}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
    </HipShell>
  );
}
