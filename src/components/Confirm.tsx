"use client";

// ─────────────────────────────────────────────────────────────
// 도량의 물음창 — 브라우저 기본 팝업(흰 창) 대신 쓰는 확인 창.
// 먹빛 바탕에 금빛 테두리. 낮 모드에서는 석간주 계열로 따라간다.
// Esc로 물러설 수 있고, 열려 있는 동안 포커스는 창 안에 머문다.
//
//   const confirm = useConfirm();
//   if (await confirm("이 화두를 내려놓으시겠습니까?", "기록 없이 사라집니다"))
//     ...
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Ask = {
  title: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmFn = (
  title: string,
  detail?: string,
  labels?: { confirm?: string; cancel?: string }
) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  // 제공자 밖에서 쓰이면 브라우저 기본 창으로 물러선다
  return (
    fn ??
    ((title, detail) =>
      Promise.resolve(window.confirm(detail ? `${title}\n\n${detail}` : title)))
  );
}

// 창 안에서 포커스를 받을 수 있는 것들
const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 창을 열기 직전에 포커스가 있던 곳 — 닫으면 그리로 돌려준다
  const prevFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const detailId = useId();

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setAsk(null);
  }, []);

  const confirm = useCallback<ConfirmFn>((title, detail, labels) => {
    // 앞선 물음이 아직 남아 있으면 '아니오'로 매듭짓는다 — 기다리는 쪽이 영영 멈추지 않게
    resolver.current?.(false);
    resolver.current = null;
    prevFocus.current = document.activeElement as HTMLElement | null;
    setAsk({
      title,
      detail,
      confirmLabel: labels?.confirm ?? "네",
      cancelLabel: labels?.cancel ?? "아니오",
    });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  // Esc로 닫고, Tab은 창 안에서만 돌게 한다.
  // 물음이 잇달아 바뀌어도 다시 걸지 않도록 '열렸는지'만 본다.
  const opened = ask !== null;
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((n) => !n.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const here = document.activeElement;
      if (!panel.contains(here)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && here === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && here === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const back = prevFocus.current;
      prevFocus.current = null;
      if (back?.isConnected) back.focus();
    };
  }, [opened, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {ask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          {/* 뒤를 덮는 어둠 */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => close(false)}
          />
          {/* 물음창 */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={ask.detail ? detailId : undefined}
            className="confirm-panel rise relative w-full max-w-sm px-7 py-7 text-center"
          >
            <p
              id={titleId}
              className="break-keep font-serif text-[16px] font-light leading-8 text-hanji"
            >
              {ask.title}
            </p>
            {ask.detail && (
              <p
                id={detailId}
                className="mt-3 break-keep text-[12.5px] leading-6 text-hanji-faint"
              >
                {ask.detail}
              </p>
            )}
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                onClick={() => close(false)}
                className="border border-ink-3 px-6 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
              >
                {ask.cancelLabel}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className="btn-obang px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
              >
                {ask.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
