"use client";

// ────────────────────────────────────────────────────────────────
// 공덕이 붙는 순간 — 숫자가 뜨고, 자리가 오르면 화면이 한 번 열린다.
//
// 계급(육도)을 만들어 놓고 오르는 순간이 밋밋하면 계급이 아니다.
// 그래서 둘을 붙였다 —
//   · +N 공덕   어느 방에서 무엇을 하든 오른쪽 위에 숫자가 떠올랐다 사라진다.
//     잇달아 치면 한 줄로 합쳐 센다(목탁을 백 번 치는데 쪽지가 백 장 뜨면 안 된다).
//   · 승급      도(道)가 바뀌면 화면이 어두워지고 한자 한 글자가 쿵 찍힌다.
//     금빛 파문 셋. 두 초쯤 두었다가 스스로 걷힌다 — 누를 것을 만들지 않는다.
//
// 장부는 merit.ts 가 쥔다. 여기는 그 장부가 바뀌는 것만 듣는다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { loadMerit, MERIT_EVENT } from "@/lib/merit";
import { realmOf, type Realm } from "@/lib/realm";

export default function MeritToast() {
  const [gain, setGain] = useState(0); // 지금 한 줄에 모인 몫
  const [up, setUp] = useState<Realm | null>(null); // 방금 오른 자리
  const prev = useRef<number | null>(null);
  const clear = useRef<number | null>(null);

  const read = useCallback(() => {
    const now = loadMerit().total;
    const was = prev.current;
    prev.current = now;
    if (was === null) return; // 첫 읽기는 알리지 않는다
    const d = now - was;
    if (d <= 0) return;

    // 잇달아 붙으면 한 줄로 합친다
    setGain((g) => g + d);
    if (clear.current) window.clearTimeout(clear.current);
    clear.current = window.setTimeout(() => setGain(0), 1400);

    const before = realmOf(was);
    const after = realmOf(now);
    if (after.id !== before.id && after.need > before.need) {
      setUp(after);
      window.setTimeout(() => setUp(null), 2600);
    }
  }, []);

  useEffect(() => {
    prev.current = loadMerit().total;
    window.addEventListener(MERIT_EVENT, read);
    return () => {
      window.removeEventListener(MERIT_EVENT, read);
      if (clear.current) window.clearTimeout(clear.current);
    };
  }, [read]);

  return (
    <>
      <style>{`
        @keyframes mt-pop {
          0%   { opacity:0; transform: translateY(10px) scale(.92) }
          18%  { opacity:1; transform: translateY(0) scale(1) }
          70%  { opacity:1 }
          100% { opacity:0; transform: translateY(-14px) }
        }
        @keyframes mt-stamp {
          0%   { opacity:0; transform: scale(2.1) rotate(-9deg) }
          40%  { opacity:1; transform: scale(.94) rotate(0deg) }
          55%  { transform: scale(1.03) }
          100% { opacity:1; transform: scale(1) }
        }
        @keyframes mt-ring {
          0%   { opacity:.75; transform: scale(.35) }
          100% { opacity:0;   transform: scale(2.4) }
        }
        @keyframes mt-veil { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* ── +N 공덕 ── */}
      {gain > 0 && (
        <div
          key={gain}
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-[72px] z-[60] md:right-8 md:top-8"
          style={{ animation: "mt-pop 1.4s ease-out forwards" }}
        >
          <span className="rounded-full border border-gold/45 bg-ink-2/90 px-3.5 py-1.5 font-serif text-[15px] leading-none text-gold shadow-[0_8px_26px_rgba(0,0,0,0.5)] backdrop-blur">
            +{gain.toLocaleString("ko-KR")}
            <span className="ml-1.5 text-[10.5px] tracking-[0.2em] text-gold-soft">
              공덕
            </span>
          </span>
        </div>
      )}

      {/* ── 자리가 올랐다 ── */}
      {up && (
        <div
          role="status"
          className="pointer-events-none fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink/80 backdrop-blur-sm"
          style={{ animation: "mt-veil .3s ease-out both" }}
        >
          <div className="relative grid h-[168px] w-[168px] place-items-center">
            {[0, 1, 2].map((k) => (
              <span
                key={k}
                aria-hidden
                className="absolute h-full w-full rounded-full border border-gold/60"
                style={{ animation: `mt-ring 1.5s ease-out ${0.25 + k * 0.22}s both` }}
              />
            ))}
            <span
              className="grid h-[118px] w-[118px] place-items-center rounded-full bg-gold font-serif text-[58px] leading-none text-ink shadow-[0_0_60px_rgba(217,180,91,0.55)]"
              style={{ animation: "mt-stamp .7s cubic-bezier(.2,1.3,.3,1) both" }}
            >
              {up.mark}
            </span>
          </div>
          <p className="mt-7 text-[11px] tracking-[0.5em] text-gold-soft">
            {up.hanja}
          </p>
          <p className="mt-2.5 font-serif text-[30px] font-light leading-none text-hanji">
            {up.name}
          </p>
          <p className="mt-3.5 break-keep px-10 text-center text-[13px] leading-6 text-hanji-dim">
            {up.say}
          </p>
        </div>
      )}
    </>
  );
}
