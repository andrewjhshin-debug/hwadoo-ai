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
import { loadMerit, MERIT_EVENT, rankByNeed, type Rank } from "@/lib/merit";
import { realmOf } from "@/lib/realm";
import { loadStore } from "@/lib/store";

export default function MeritToast() {
  const [gain, setGain] = useState(0); // 지금 한 줄에 모인 몫
  /** 방금 한 번에 붙은 몫 — 형: 「키캡이 3이면 +3 +3 +3 계속 이렇게」.
      쌓인 수를 보여 주면 「방금 여덟을 받았나?」로 읽힌다. 한 타의
      무게는 늘 같아야 한다 */
  const [last, setLast] = useState(0);
  const [up, setUp] = useState<Rank | null>(null); // 방금 오른 자리
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
    setLast(d);
    if (clear.current) window.clearTimeout(clear.current);
    clear.current = window.setTimeout(() => setGain(0), 1400);

    // 자리는 공덕만으로 오르지 않는다 — 회향한 화두 수도 같이 본다.
    // 그걸 안 넘겨 주면 realmOf 가 문턱만 보고 올랐다고 하는데, 정작
    // 내 도량과 뜰은 그대로라 「올랐다더니 아무 데도 안 올라 있는」 꼴이 됐다.
    const returned = loadStore().history.length;
    const before = realmOf(was, returned);
    const after = realmOf(now, returned);
    if (after.id !== before.id && after.need > before.need) {
      // 띄우는 이름은 육도가 아니라 이 앱이 쓰는 사다리(位)다.
      // 육도는 오르는 계단이 아니라 벗어나야 할 굴레라, 「아귀도로 올랐다」는
      // 말이 교리에도 안 맞고 화면 어디에도 그 이름이 없다.
      setUp(rankByNeed(after.need));
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
          key={gain}   /* 값이 같아도 다시 톡 튀게 — 쌓인 수를 열쇠로 */
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-[72px] z-[60] md:right-8 md:top-8"
          style={{ animation: "mt-pop 1.4s ease-out forwards" }}
        >
          <span className="rounded-full border border-gold/45 bg-ink-2/90 px-3.5 py-1.5 font-serif text-[15px] leading-none text-gold shadow-[0_8px_26px_rgba(0,0,0,0.5)] backdrop-blur">
            {/* 형: 「공덕 숫자는 + 로 가자. 그 뭐 할 때마다 공덕 올라가잖아,
                우리 세팅값 있지? 그럼 그게 3이면 +3 +6 +9 이렇게 표기되도록」

                한때 + 를 뺐던 까닭은 한 타에 1 이 붙는데 「+49」라고 떠서
                방금 마흔아홉을 받은 것처럼 읽혔기 때문이다. 지금은 갈래마다
                제값이 있고(MERIT_VALUE — 목탁 3, 절 5 …) 그 값이 차곡차곡
                더해진다. +3 · +6 · +9 로 오르면 한 번에 얼마가 붙는지가
                눈에 보이고, 얼마나 쌓였는지도 같이 보인다. 속이는 게 아니라
                **한 타의 무게**를 알려 주는 것이다. */}
            +{last.toLocaleString("ko-KR")}
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
              {up.hanja}
            </span>
          </div>
          <p className="mt-7 text-[11px] tracking-[0.5em] text-gold-soft">
            位 · 자리가 올랐습니다
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
