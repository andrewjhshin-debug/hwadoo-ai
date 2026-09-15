"use client";

// ─────────────────────────────────────────────────────────────
// ⓘ — 눌러야 나오는 한 마디.
//
// 규칙이 늘수록 화면에 설명이 붙는다. 공덕은 어떻게 쌓이고, 자리는 왜
// 안 오르고, 안 오면 왜 깎이는지. 그걸 다 적어 두면 화면이 설명서가 된다.
//
// 그래서 접었다. 평소엔 작은 동그라미 하나, 누르면 그 자리에 뚝 뜬다.
// 궁금한 사람만 열고, 아닌 사람은 못 본 채로 지나간다.
//
// 담는 말은 짧게 — 세 줄을 넘기면 이 부품을 쓰는 뜻이 없다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";

export default function Info({
  title,
  children,
  className = "",
}: {
  /** 창 머리에 한 줄 (없으면 안 그린다) */
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  // 바깥을 누르거나 Esc 면 닫는다
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={box} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={title ? `${title} 설명` : "설명"}
        aria-expanded={open}
        className={`grid h-[15px] w-[15px] place-items-center rounded-full border text-[9.5px] leading-none transition-colors ${
          open
            ? "border-gold bg-gold/15 text-gold"
            : "border-hanji-faint/55 text-hanji-faint hover:border-gold/60 hover:text-gold-soft"
        }`}
      >
        i
      </button>

      {open && (
        // 오른쪽으로 넘치지 않게 오른쪽 모서리에 건다.
        // 폭을 고정해 두어야 글이 길어져도 창이 춤추지 않는다.
        <span
          role="note"
          className="absolute right-0 top-[21px] z-50 w-[248px] rounded-[12px] border border-gold/30 bg-ink-2 px-3.5 py-3 text-left shadow-[0_18px_44px_rgba(0,0,0,.6)]"
        >
          {title && (
            <span className="mb-1 block text-[10.5px] tracking-[0.22em] text-gold-soft">
              {title}
            </span>
          )}
          <span className="block break-keep text-[11.5px] leading-[1.7] text-hanji-dim">
            {children}
          </span>
        </span>
      )}
    </span>
  );
}
