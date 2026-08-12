"use client";

// ─────────────────────────────────────────────────────────────
// 화두 질문 — 프로페셔널한 조판.
// · 문장(마침표) 단위로 줄을 나눈다
// · 한 줄이 길면 쉼표에서, 쉼표가 없으면 띄어쓰기에서 한 번 더 나눈다
// · 그렇게 나눈 줄들이 좌우 경계에 꼭 맞도록 글자 크기를 자동으로 키운다
// 줄 길이의 기준은 화면 폭에 따라 달라진다 — 좁은 화면일수록 잘게 나눈다.
// ─────────────────────────────────────────────────────────────

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { splitSentences } from "@/lib/sayings";

// 폭을 아직 재지 못했을 때 쓰는 기본 줄 길이
const LONG = 14;
// 이 크기 아래로는 내려가지 않는다 — 여기에 걸리면 줄이 꺾이는 것을 받아들인다
const FLOOR = 18;

// 한 줄을 두 동아리로 나눈다 — 쉼표가 있으면 쉼표에서, 없으면 가운데에 가장 가까운 띄어쓰기에서
function splitOnce(line: string): [string, string] | null {
  const parts = line.split(", ");
  if (parts.length > 1) {
    const mid = Math.ceil(parts.length / 2);
    return [parts.slice(0, mid).join(", ") + ",", parts.slice(mid).join(", ")];
  }
  const target = line.length / 2;
  let at = -1;
  for (let i = 1; i < line.length - 1; i++) {
    if (line[i] !== " ") continue;
    if (at < 0 || Math.abs(i - target) < Math.abs(at - target)) at = i;
  }
  if (at < 0) return null;
  return [line.slice(0, at), line.slice(at + 1)];
}

function toLines(text: string, longest: number): string[] {
  const out: string[] = [];
  const push = (line: string) => {
    if (line.length <= longest) {
      out.push(line);
      return;
    }
    const two = splitOnce(line);
    if (!two) {
      out.push(line); // 더 나눌 자리가 없다
      return;
    }
    push(two[0]);
    push(two[1]);
  };
  for (const sentence of splitSentences(text.replace(/\n+/g, " "))) push(sentence);
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
  const [avail, setAvail] = useState(0);
  const [fit, setFit] = useState({ size: min, nowrap: true });

  // min은 '적어도 이만큼은 되었으면 하는 크기' — 그 크기로 들어갈 만큼만 한 줄에 담는다
  const longest = avail > 0 ? Math.max(6, Math.floor(avail / min)) : LONG;
  const lines = useMemo(() => toLines(text, longest), [text, longest]);

  // 쓸 수 있는 폭을 지켜본다
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const read = () => {
      const w = wrap.clientWidth;
      if (w > 0) setAvail((cur) => (cur === w ? cur : w));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // 가장 긴 줄이 그 폭에 꼭 맞도록 글자 크기를 정한다
  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure || avail === 0) return;
    let widest = 0;
    measure.querySelectorAll("[data-line]").forEach((n) => {
      widest = Math.max(widest, (n as HTMLElement).scrollWidth);
    });
    if (widest === 0) return;
    // 1px은 남겨 둔다 — 반올림 때문에 마지막 글자가 삐져나가지 않게
    const ideal = Math.floor((max * (avail - 1)) / widest);
    const size = Math.min(max, Math.max(FLOOR, ideal));
    // 하한에 걸리지 않았다면 계산한 줄이 다시 꺾일 일이 없다
    setFit((cur) =>
      cur.size === size && cur.nowrap === ideal >= FLOOR
        ? cur
        : { size, nowrap: ideal >= FLOOR }
    );
  }, [avail, lines, max]);

  return (
    <>
      {/* 보이지 않는 측정판 — 언제나 max 크기, 줄바꿈 없이.
          폭 0짜리 상자에 가두어 가로 오버플로를 만들지 않는다 */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute h-0 w-0 overflow-hidden"
      >
        <div
          ref={measureRef}
          className="font-serif font-light"
          style={{
            fontSize: max,
            lineHeight: 1.45,
            whiteSpace: "nowrap",
            width: "max-content",
          }}
        >
          {lines.map((l, i) => (
            <div key={i} data-line>
              {l}
            </div>
          ))}
        </div>
      </div>

      <h1
        ref={wrapRef}
        className={`break-keep font-serif font-light ${className}`}
        style={{ fontSize: fit.size, lineHeight: 1.45 }}
      >
        {lines.map((l, i) => (
          <span
            key={i}
            className={`block ${fit.nowrap ? "whitespace-nowrap" : ""}`}
          >
            {l}
          </span>
        ))}
      </h1>
    </>
  );
}
