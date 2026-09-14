"use client";

// ─────────────────────────────────────────────────────────────
// 두두 한 장 — 그림이 있으면 그림을, 없으면 코드로 그린 두두를 쓴다.
//
// public/dudu/{자리번호}.png 를 넣어 두면 그 자리부터 그림으로 바뀐다.
// (0 동자 · 1 사미 · 2 수좌 · 3 선사 · 4 보살 · 5 부처)
// 파일이 없으면 <img> 가 조용히 실패하고 SVG 로 되돌아간다 — 그림이
// 하나씩 들어올 때마다 저절로 갈아 끼워진다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { dongja, type Mood } from "@/lib/dongja";

type Props = {
  /** 자리 번호 0~5. 없으면 그림을 찾지 않고 코드 두두만 쓴다 */
  stage?: number;
  mood?: Mood;
  /** 한 화면에 여러 장일 때 그라디언트 id 가 겹치지 않게 */
  uid: string;
  className?: string;
};

export default function Dudu({ stage, mood = "default", uid, className }: Props) {
  const [art, setArt] = useState<string | null>(null);

  useEffect(() => {
    if (stage === undefined) return;
    let alive = true;
    const src = `/dudu/${stage}.png`;
    const img = new Image();
    img.onload = () => {
      if (alive) setArt(src);
    };
    img.onerror = () => {
      if (alive) setArt(null);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [stage]);

  if (art) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={art} alt="" aria-hidden className={className} />
    );
  }
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: dongja(mood, uid) }}
    />
  );
}
