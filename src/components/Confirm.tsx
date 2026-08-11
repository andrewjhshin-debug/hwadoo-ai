"use client";

// ─────────────────────────────────────────────────────────────
// 도량의 물음창 — 브라우저 기본 팝업(흰 창) 대신 쓰는 확인 창.
// 먹빛 바탕에 금빛 테두리. 낮 모드에서는 석간주 계열로 따라간다.
//
//   const confirm = useConfirm();
//   if (await confirm("이 화두를 내려놓으시겠습니까?", "기록 없이 사라집니다"))
//     ...
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
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

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((title, detail, labels) => {
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

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setAsk(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {ask && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          role="dialog"
          aria-modal="true"
        >
          {/* 뒤를 덮는 어둠 */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => close(false)}
          />
          {/* 물음창 */}
          <div className="confirm-panel rise relative w-full max-w-sm px-7 py-7 text-center">
            <p className="break-keep font-serif text-[16px] font-light leading-8 text-hanji">
              {ask.title}
            </p>
            {ask.detail && (
              <p className="mt-3 break-keep text-[12.5px] leading-6 text-hanji-faint">
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
