"use client";

// ────────────────────────────────────────────────────────────────
// 홈 화면에 담기 배너 — 화면 아래(모바일 탭바 위)에 낮게 깔려
// "화두를 홈 화면에 앱처럼 담을까요?" 하고 조용히 묻는다.
// · 이미 앱으로 열렸으면(standalone) 절대 보이지 않는다.
// · '다음에'는 sessionStorage 에만 적는다 — 탭을 닫고 다시 오면 또 묻는다.
// · [담기]: 받아 둔 프롬프트가 있으면 열고, 아이폰이면 사파리 안내로,
//   둘 다 아니면 브라우저 메뉴 안내로 얼굴을 바꾼다.
// · 마운트 1.5초 뒤 스르륵 올라온다 — 첫 화면을 방해하지 않는 때를 고른다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { canInstall, isIOS, isStandalone, promptInstall } from "@/lib/install";

// '다음에'의 기억 — 세션이 살아 있는 동안만
const LATER_KEY = "hwadoo-install-later";

// 배너의 얼굴 — 묻기 / 아이폰 안내 / 브라우저 메뉴 안내
type Phase = "ask" | "ios" | "manual";

export default function InstallBanner() {
  const [phase, setPhase] = useState<Phase | null>(null); // null 이면 그리지 않는다
  const [shown, setShown] = useState(false); // 스르륵 등장의 스위치
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 이미 손안에 있으면 묻지 않는다
    if (isStandalone()) return;
    // 이 세션에서 '다음에'라 했으면 조용히 있는다 — 새 세션이면 또 묻는다
    try {
      if (sessionStorage.getItem(LATER_KEY)) return;
    } catch {
      // 저장소가 막힌 브라우저 — 그래도 묻는다
    }
    setPhase("ask");
    const t = window.setTimeout(() => setShown(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  // 이 세션에는 그만 묻는다
  const close = () => {
    try {
      sessionStorage.setItem(LATER_KEY, "1");
    } catch {
      // 못 적어도 화면에서는 내린다
    }
    setPhase(null);
  };

  // [담기] — 프롬프트가 잡혀 있으면 열고, 아니면 형편에 맞는 안내로 바꾼다
  const handleInstall = async () => {
    if (canInstall()) {
      setBusy(true);
      try {
        await promptInstall();
      } finally {
        setBusy(false);
      }
      close(); // 수락이든 거절이든 — 이 세션에는 더 묻지 않는다
    } else if (isIOS()) {
      setPhase("ios");
    } else {
      setPhase("manual");
    }
  };

  if (!phase) return null;

  return (
    <div
      role="region"
      aria-label="홈 화면에 담기 안내"
      className={`fixed inset-x-0 bottom-16 z-40 border-t border-ink-3 bg-ink-2/95 backdrop-blur transition-all duration-700 ease-out motion-reduce:transition-none md:bottom-0 ${
        shown
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 px-5 py-3">
        {phase === "ask" ? (
          <>
            <p className="break-keep text-[13px] leading-6 text-hanji-dim">
              화두를 홈 화면에 앱처럼 담을까요?
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleInstall}
                disabled={busy}
                className="rounded-[10px] border border-gold/50 px-4 py-2 text-[12px] tracking-[0.15em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
              >
                {busy ? "여는 중…" : "담기"}
              </button>
              <button
                onClick={close}
                className="rounded-[10px] px-3 py-2 text-[12px] tracking-[0.15em] text-hanji-faint transition-colors hover:text-hanji-dim"
              >
                다음에
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="break-keep text-[12px] leading-6 text-hanji-dim">
              {phase === "ios" ? (
                <>
                  사파리 공유 단추 → &lsquo;홈 화면에 추가&rsquo;를 누르면
                  앱처럼 담깁니다.
                </>
              ) : (
                <>
                  브라우저 메뉴(⋮)의 &lsquo;앱 설치&rsquo; 또는 &lsquo;홈
                  화면에 추가&rsquo;를 누르면 담깁니다.
                </>
              )}
            </p>
            <button
              onClick={close}
              className="shrink-0 rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:text-hanji"
            >
              알겠습니다
            </button>
          </>
        )}
      </div>
    </div>
  );
}
