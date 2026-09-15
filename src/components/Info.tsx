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
//
// ■ 왜 창을 body 로 내보내는가
//   처음엔 버튼 옆에 붙여 두었다(absolute). 그런데 뒤의 큰 숫자가 창을
//   뚫고 올라왔다 — z-50 을 줬는데도. 까닭은 **쌓임 맥락**이다.
//   이 부품이 앉은 구획에 rise(transform) 애니메이션이 걸려 있으면 거기서
//   맥락이 새로 시작되고, 그 안의 z-50 은 바깥 형제들과 겨루지 못한다.
//   그래서 창만 portal 로 body 에 내보내고 자리는 좌표로 잡는다.
//   맥락이 없으니 무엇도 위로 올라오지 못한다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const W = 252; // 창 너비 — 고정해 두어야 글이 길어져도 창이 춤추지 않는다
const GAP = 8; // 단추와 창 사이

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
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLSpanElement>(null);

  // 단추 위치를 재어 창을 그 아래에 놓는다. 화면 밖으로 나가면 안쪽으로 당긴다.
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.min(
        Math.max(12, r.right - W), // 기본은 오른쪽 모서리에 맞춘다
        window.innerWidth - W - 12
      );
      setAt({ top: r.bottom + GAP, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // 바깥을 누르거나 Esc 면 닫는다
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !box.current?.contains(t)) setOpen(false);
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
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        ref={btn}
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

      {open &&
        at &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={box}
            role="note"
            style={{ top: at.top, left: at.left, width: W }}
            // bg-ink-2 는 반투명이 아니지만, 뒤에 한 겹 더 깔아 둔다 —
            // 살갗이 얇으면 큰 숫자의 빛무리가 비쳐 글이 읽히지 않는다.
            className="fixed z-[999] block rounded-[12px] border border-gold/35 bg-ink-2 px-3.5 py-3 text-left shadow-[0_18px_44px_rgba(0,0,0,.75)] ring-1 ring-ink"
          >
            <span className="pointer-events-none absolute inset-0 rounded-[12px] bg-ink-2" />
            <span className="relative block">
              {title && (
                <span className="mb-1 block text-[10.5px] tracking-[0.22em] text-gold-soft">
                  {title}
                </span>
              )}
              <span className="block break-keep text-[11.5px] leading-[1.7] text-hanji-dim">
                {children}
              </span>
            </span>
          </span>,
          document.body
        )}
    </span>
  );
}
