"use client";

// ─────────────────────────────────────────────────────────────
// 화두 질문 — 프로페셔널한 조판.
// · 문장(마침표) 단위로 줄을 나눈다
// · 한 문장이 길면 쉼표에서 한 번 더 나눈다 → 줄이 짧아지고 글자는 커진다
// · 그렇게 나눈 줄들이 좌우 경계에 꼭 맞도록 글자 크기를 자동으로 키운다
// ─────────────────────────────────────────────────────────────

import { useLayoutEffect, useRef, useState } from "react";
import { splitSentences } from "@/lib/sayings";

// 한 줄이 이보다 길면 쉼표에서 한 번 더 끊는다
const LONG = 14;

function toLines(text: string): string[] {
  const out: string[] = [];
  for (const sentence of splitSentences(text.replace(/\n+/g, " "))) {
    if (sentence.length <= LONG || !sentence.includes(", ")) {
      out.push(sentence);
      continue;
    }
    // 쉼표 기준으로 가장 가운데에 가까운 곳에서 두 동아리로 나눈다
    const parts = sentence.split(", ");
    const mid = Math.ceil(parts.length / 2);
    const head = parts.slice(0, mid).join(", ") + ",";
    const tail = parts.slice(mid).join(", ");
    out.push(head, tail);
  }
  return out;
}

export default function Question({
  text,
  max = 68,
  min = 26,
  className = "",
}: {
  text: string;
  max?: number;
  min?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(min);

  const lines = toLines(text);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const fit = () => {
      const avail = wrap.clientWidth;
      if (avail === 0) return;
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
      {/* 보이지 않는 측정판 — 언제나 max 크기, 줄바꿈 없이 */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 font-serif font-light"
        style={{ fontSize: max, lineHeight: 1.45, whiteSpace: "nowrap" }}
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
        style={{ fontSize: size, lineHeight: 1.45 }}
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
