"use client";

import { useState } from "react";
import { Share } from "@/components/icons";

type Props = {
  title: string;
  text: string;
  className?: string;
};

/** 화면 한켠의 작은 나눔 단추. 이미지 카드를 따로 만들지 않고 현재 주소와 기록만 건넨다. */
export default function ShareButton({ title, text, className = "" }: Props) {
  const [done, setDone] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      }
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        } catch {
          // 공유창을 닫았거나 복사할 수 없어도 화면을 어지럽히지 않는다.
        }
      }
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      title={done ? "복사됨" : title}
      aria-label={done ? "공유 글 복사됨" : title}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink-3 text-hanji-faint transition-colors hover:border-gold/45 hover:text-gold-soft ${className}`}
    >
      <Share className="h-3.5 w-3.5" />
    </button>
  );
}
