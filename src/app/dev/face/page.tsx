"use client";

// 얼굴 인증 시험판 — **개발 중에만.** /dev 아래라 길에 안 걸려 있다.
// 인연 프로필은 로그인해야 열려서, 인증 판만 따로 띄워 볼 자리가 필요하다.

import { useState } from "react";
import FaceLive from "@/components/FaceLive";

export default function DevFace() {
  const [열림, 열림잡기] = useState(false);
  const [찍힘, 찍힘잡기] = useState<string>("");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-5 px-6">
      <button
        onClick={() => 열림잡기(true)}
        className="rounded-full border border-gold/50 px-6 py-3 text-[15px] text-hanji"
      >
        얼굴 인증 열기
      </button>
      {찍힘 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={찍힘} alt="찍힌 것" className="w-52 rounded-2xl" />
      )}
      {열림 && (
        <FaceLive
          gesture="왼손으로 V"
          onShot={(f) => {
            찍힘잡기(URL.createObjectURL(f));
            열림잡기(false);
          }}
          onClose={() => 열림잡기(false)}
        />
      )}
    </main>
  );
}
