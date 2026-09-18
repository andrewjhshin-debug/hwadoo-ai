"use client";

// ─────────────────────────────────────────────────────────────
// 멍 — 아무것도 하지 않는 방.
//
// 화면에 남는 것은 **점 하나**뿐이다. 아주 느리게 숨 쉬듯 커졌다 작아진다.
// 숫자도 막대도 없다 — 재고 있는 것을 보여 주면 사람은 그걸 쳐다보고,
// 쳐다보는 동안은 멍이 아니다.
//
// 끝나는 길은 셋. 화면을 건드리거나, 앱을 나가거나, 화면을 끄거나.
// 「그만」 단추를 따로 두지 않는다 — 아무 데나 누르면 끝이니 단추가 곧
// 화면 전체다. 대신 처음 삼 초 동안만 그 말을 적어 둔다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  endMung,
  loadMung,
  MUNG_MIN_SEC,
  sayDuration,
  type MungBook,
} from "@/lib/mung";
import { buzz } from "@/lib/sound";

const CSS = `
/* 점 하나 — 스무 초에 한 번 숨 쉰다. 따라 쉬라는 것이 아니라,
   화면이 죽은 것이 아님을 알리는 최소한의 기척이다. */
@keyframes mung-breathe {
  0%, 100% { transform: scale(1);    opacity: .30 }
  50%      { transform: scale(1.55); opacity: .62 }
}
.mung-dot { animation: mung-breathe 20s ease-in-out infinite; }
/* 들어서면 둘레가 천천히 어두워진다 — 방이 닫히는 느낌 */
@keyframes mung-dim { from { opacity: 0 } to { opacity: 1 } }
.mung-veil { animation: mung-dim 6s ease-out both; }
/* 처음 안내는 삼 초 뒤 스스로 사라진다 */
@keyframes mung-fade { 0%, 55% { opacity: .5 } 100% { opacity: 0 } }
.mung-hint { animation: mung-fade 4s ease-in forwards; }
@media (prefers-reduced-motion: reduce) {
  .mung-dot, .mung-veil, .mung-hint { animation: none; }
  .mung-hint { opacity: .5; }
}
`;

type Stage = "ready" | "sitting" | "done";

export default function MungPage() {
  const [stage, setStage] = useState<Stage>("ready");
  const [book, setBook] = useState<MungBook | null>(null);
  const [last, setLast] = useState({ sec: 0, gained: 0, record: false });
  const startRef = useRef(0);
  const stageRef = useRef<Stage>("ready");
  stageRef.current = stage;

  useEffect(() => setBook(loadMung()), []);

  const stop = useCallback(() => {
    if (stageRef.current !== "sitting") return;
    // 시계는 벽시계로 잰다. 화면이 꺼져 있던 동안에도 시간은 흘렀고,
    // 그 시간이야말로 이 방이 재려는 것이다.
    const sec = (Date.now() - startRef.current) / 1000;
    const { gained, record } = endMung(sec);
    setLast({ sec: Math.floor(sec), gained, record });
    setBook(loadMung());
    setStage("done");
    if (sec >= MUNG_MIN_SEC) buzz(14);
  }, []);

  // 앱을 나가거나 화면을 끄면 끝난다. 이게 이 방의 규칙이라
  // 몰래 이어 주지 않는다 — 규칙이 물러 터지면 재미가 없다.
  useEffect(() => {
    if (stage !== "sitting") return;
    const away = () => {
      if (document.visibilityState === "hidden") stop();
    };
    window.addEventListener("visibilitychange", away);
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("visibilitychange", away);
      window.removeEventListener("pagehide", stop);
    };
  }, [stage, stop]);

  const begin = () => {
    startRef.current = Date.now();
    setStage("sitting");
  };

  // ── 앉아 있는 동안 — 점 하나 ──────────────────────────────
  if (stage === "sitting") {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="멍 그만두기"
        onPointerDown={stop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") stop();
        }}
        className="fixed inset-0 z-[80] grid place-items-center bg-[#070605] outline-none"
      >
        <style>{CSS}</style>
        <span
          aria-hidden
          className="mung-veil pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 45% at 50% 50%, rgba(217,180,91,0.05), transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="mung-dot block h-[10px] w-[10px] rounded-full"
          style={{ background: "var(--color-gold)" }}
        />
        <p className="mung-hint absolute bottom-[14vh] text-[11.5px] tracking-[0.3em] text-hanji-faint">
          아무 데나 누르면 끝납니다
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 pb-16 pt-8 text-center md:pt-12">
      <style>{CSS}</style>

      {/* 無事 — 「할 일 없음」. 임제록의 無事是貴人(할 일 없는 이가 귀한
          사람)에서 왔다. 이 방에 딱 맞는 말이고, 멍이 노는 것이 아니라
          수행의 한 자리라는 것을 두 글자로 말해 준다.
          (처음엔 㝱 를 썼는데 글꼴에 없어 네모로 깨졌다) */}
      <p className="rise text-[12px] tracking-[0.35em] text-hanji-faint">
        無事 · 멍
      </p>

      {stage === "done" ? (
        <>
          <p className="rise rise-d1 mt-6 font-serif text-[52px] font-light leading-none text-hanji">
            {sayDuration(last.sec)}
          </p>
          <p className="rise rise-d1 mt-3 break-keep text-[13px] leading-6 text-hanji-dim">
            {last.sec < MUNG_MIN_SEC
              ? "너무 짧았어요. 스무 초는 넘겨야 셈에 듭니다."
              : last.record
                ? "지금까지 가장 오래 앉았습니다."
                : "잘 앉으셨습니다."}
          </p>
          {last.gained > 0 && (
            <p className="rise rise-d2 mt-4 inline-block rounded-full border border-gold/45 px-3.5 py-1.5 text-[11.5px] text-gold">
              공덕 +{last.gained.toLocaleString("ko-KR")}
            </p>
          )}
          <div className="rise rise-d2 mt-8 flex w-full max-w-[280px] flex-col gap-2.5">
            <button
              onClick={begin}
              className="rounded-full border border-gold/55 bg-gold/[0.07] px-6 py-3.5 text-[13.5px] tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/15"
            >
              한 번 더
            </button>
            <Link
              href="/"
              className="rounded-full border border-ink-3 px-6 py-2.5 text-[11.5px] tracking-[0.25em] text-hanji-faint transition-colors hover:text-hanji"
            >
              뜰로
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="rise rise-d1 mt-7 break-keep font-serif text-[27px] leading-[1.5] text-hanji sm:text-[31px]">
            아무것도
            <br />
            하지 마세요
          </p>
          <p className="rise rise-d1 mt-5 break-keep text-[13px] leading-7 text-hanji-dim">
            화면에 점 하나만 남습니다.
            <br />
            건드리거나 앱을 나가면 끝납니다.
          </p>
          {/* 얼마나 앉았는지는 **끝난 뒤에만** 알려 준다. 재는 것이 보이면
              쳐다보게 되고, 쳐다보는 동안은 멍이 아니다. */}
          <p className="rise rise-d2 mt-3 text-[11.5px] leading-6 text-hanji-faint">
            시간은 끝난 뒤에 알려 드립니다.
          </p>

          <button
            onClick={begin}
            className="rise rise-d2 mt-9 w-full max-w-[280px] rounded-full border border-gold/55 bg-gold/[0.07] px-6 py-4 text-[14px] tracking-[0.18em] text-gold-soft transition-colors hover:border-gold/75 hover:bg-gold/15 hover:text-gold"
          >
            시작
          </button>

          {book && (book.best > 0 || book.todaySec > 0) && (
            <div className="rise rise-d3 mt-10 w-full max-w-[280px] border-t border-ink-3 pt-4">
              <dl className="flex items-baseline justify-between text-[12px]">
                <dt className="text-hanji-faint">가장 오래</dt>
                <dd className="font-serif text-gold-soft">
                  {sayDuration(book.best)}
                </dd>
              </dl>
              <dl className="mt-2 flex items-baseline justify-between text-[12px]">
                <dt className="text-hanji-faint">오늘</dt>
                <dd className="text-hanji-dim">{sayDuration(book.todaySec)}</dd>
              </dl>
              <dl className="mt-2 flex items-baseline justify-between text-[12px]">
                <dt className="text-hanji-faint">지금까지</dt>
                <dd className="text-hanji-dim">
                  {book.times.toLocaleString("ko-KR")}번
                </dd>
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
}
