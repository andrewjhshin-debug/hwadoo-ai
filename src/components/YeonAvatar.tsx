"use client";

// ─────────────────────────────────────────────────────────────
// 내 도량의 동그란 얼굴 — 눌러서 남이 보는 나로.
//
// 형: 「올린 사진이랑 프로필은 내 도량에서 볼 수 있게 해. 다만 동그라미
//      프로필에 사진 하고 그 안에 돋보기 넣고, 그걸 누르면 다른 화면으로
//      가고」
//
// 돋보기를 **안에** 둔다. 옆에 글자로 「프로필 보기」라고 쓰면 그건
// 설명이지 물건이 아니다. 얼굴 위에 돋보기가 얹혀 있으면 눌러서 크게
// 본다는 뜻이 저절로 읽힌다(형: 「직관직관직관」).
//
// 사진이 없으면 연꽃빛 동그라미에 緣 한 글자 — 비어 있다는 것도 한눈에.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useState } from "react";
import { watchAuth } from "@/lib/sync";
import { 내프로필, type 인연프로필 } from "@/lib/yeon";

export default function YeonAvatar({ size = 52 }: { size?: number }) {
  const [me, setMe] = useState<인연프로필 | null>(null);

  useEffect(
    () =>
      watchAuth(async (u) => {
        setMe(u ? await 내프로필() : null);
      }),
    []
  );

  // 통과된 것 우선, 없으면 보는 중인 것이라도. 얼굴이 있으면 얼굴을 보여 준다
  const 얼굴 =
    (me?.photos ?? []).find((f) => f.state === "ok")?.url ??
    (me?.photos ?? []).find((f) => f.state === "pending")?.url ??
    null;

  return (
    <Link
      href={me ? "/gathering/me/view" : "/gathering/me"}
      className="hip-me-face"
      style={{ width: size, height: size }}
      aria-label={me ? "남이 보는 내 프로필" : "인연 프로필 만들기"}
    >
      {얼굴 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={얼굴} alt="" draggable={false} />
      ) : (
        <em aria-hidden>緣</em>
      )}
      {/* 돋보기 — 얼굴 안 오른아래 */}
      <i aria-hidden>
        <svg viewBox="0 0 24 24">
          <circle cx="10.5" cy="10.5" r="6.4" />
          <path d="M15.2 15.2 L20 20" />
        </svg>
      </i>
    </Link>
  );
}
