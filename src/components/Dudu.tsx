"use client";

// ─────────────────────────────────────────────────────────────
// 나무 한 장 — 그림이 있으면 그림을, 없으면 코드로 그린 나무를 쓴다.
//
// **두 갈래로 자란다.** 고른 얼굴에 따라 길이 갈린다 —
//   나무(namu) → URBAN BUDDHA : 후드티 꼬마에서 퍼퍼 입은 부처까지
//   무(mu)     → THE HIP MONK : 헤드폰 낀 꼬마 승에서 금빛 가사까지
// 한 갈래만 두면 「고른 얼굴」이 아무 뜻도 없게 된다. 얼굴을 고르는 일이
// 곧 어느 길로 갈지 고르는 일이어야 한다.
//
//   public/dudu/{namu|mu}/{자리번호}.png   (0 동자 … 5 부처)
//   public/dudu/{자리번호}.png             ← 옛 한 갈래(되돌아갈 자리)
//
// 파일이 없으면 <img> 가 조용히 실패하고 한 칸 아래로, 끝내 없으면
// 옛 자리로, 그것도 없으면 코드로 그린 나무로 내려간다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { dongja, type Mood } from "@/lib/dongja";
import { loadMe, ME_EVENT, type FaceId } from "@/lib/me";

type Props = {
  /** 자리 번호 0~5. 없으면 그림을 찾지 않고 코드 나무만 쓴다 */
  stage?: number;
  mood?: Mood;
  /** 어느 갈래로 그릴지 — 안 주면 내가 고른 얼굴을 따른다 */
  face?: FaceId;
  /** 한 화면에 여러 장일 때 그라디언트 id 가 겹치지 않게 */
  uid: string;
  className?: string;
};

export default function Dudu({ stage, mood = "default", uid, className, face }: Props) {
  const [art, setArt] = useState<string | null>(null);
  // 밖에서 얼굴을 주지 않으면 내 얼굴을 쓴다. 서랍은 붙고 난 뒤에 읽는다.
  const [mine, setMine] = useState<FaceId | null>(null);
  useEffect(() => {
    const read = () => setMine(loadMe()?.face ?? "namu");
    read();
    window.addEventListener(ME_EVENT, read);
    return () => window.removeEventListener(ME_EVENT, read);
  }, []);
  const track = face ?? mine;

  useEffect(() => {
    if (stage === undefined || !track) return;
    let alive = true;
    // 그림이 아직 안 들어온 자리는 **바로 아래 자리의 그림**으로 대신한다.
    // 한 자리만 비어도 코드 그림으로 떨어지면 결이 튀어서, 여섯 장이
    // 다 차기 전까지는 아래로 한 칸씩 내려가며 있는 것을 찾는다.
    // 갈래 안에서 아래로 훑고, 그래도 없으면 옛 한 갈래로 한 번 더 훑는다
    const probe = (s: number, dir: string | null) => {
      if (!alive) return;
      if (s < 0) {
        if (dir) return probe(stage, null); // 갈래가 통째로 비었다 — 옛 자리로
        setArt(null); // 한 장도 없다 — 코드로 그린 나무로
        return;
      }
      const src = dir ? `/dudu/${dir}/${s}.png` : `/dudu/${s}.png`;
      const img = new Image();
      img.onload = () => {
        if (alive) setArt(src);
      };
      img.onerror = () => probe(s - 1, dir);
      img.src = src;
    };
    probe(stage, track);
    return () => {
      alive = false;
    };
  }, [stage, track]);

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
