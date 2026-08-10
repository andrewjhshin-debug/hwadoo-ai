"use client";

// ─────────────────────────────────────────────────────────────
// 화두 질문 — 프로페셔널한 조판.
// · 문장(마침표) 단위로 줄을 나눈다 (어이없이 단어 중간에서 안 끊기게)
// · 각 줄은 좌우 경계 안에 들도록 글자 크기를 자동으로 맞춘다
//   (짧은 문장은 크게, 긴 문장은 살짝 줄여 한 줄로)
// ─────────────────────────────────────────────────────────────

import { useLayoutEffect, useRef, useState } from "react";
import { splitSentences } from "@/lib/sayings";

export default function Question({
  text,
  max = 52,
  min = 22,
  className = "",
}: {
  text: string;
  max?: number;
  min?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(max);

  const lines = splitSentences(text.replace(/\n+/g, " "));

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const fit = () => {
      const avail = wrap.clientWidth;
      if (avail === 0) return;
      // 숨은 측정판은 항상 max 크기로 그려 둔다 → 가장 긴 줄의 실제 폭
      let widest = 0;
      measure.querySelectorAll("[data-line]").forEach((n) => {
        widest = Math.max(widest, (n as HTMLElement).scrollWidth);
      });
      if (widest === 0) return;
      const scale = avail / widest;
      setSize(Math.max(min, Math.min(max, Math.floor(max * scale))));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text, max, min]);

  return (
    <>
      {/* 보이지 않는 측정판 — 언제나 max 크기, nowrap */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 font-serif font-light"
        style={{ fontSize: max, lineHeight: 1.5, whiteSpace: "nowrap" }}
      >
        {lines.map((l, i) => (
          <div key={i} data-line>
            {l}
          </div>
        ))}
      </div>

      <h1
        ref={wrapRef}
        className={`break-keep font-serif font-light ${className}`}
        style={{ fontSize: size, lineHeight: 1.5 }}
      >
        {lines.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </h1>
    </>
  );
}
