"use client";

// ─────────────────────────────────────────────────────────────
// 뜰에 놓는 법당 한 칸 — 공덕이 가 닿는 끝을 보여 준다.
//
// ■ 왜 홈에 두나
//   법당은 떠 있는 메뉴 안쪽에 있어서 폰에서는 아무도 못 찾았다.
//   그보다 큰 문제는, 공덕을 쌓아도 **그게 어디로 가는지 안 보인다**는 것이다.
//   목탁 → 공덕 → 연꽃 → 초 → 끝. 끝이 안 보이니 숫자 놀음으로 읽힌다.
//   그 끝을 뜰에 올려 둔다. 내려가다 보면 반드시 지나가는 자리다.
//
// ■ 두 얼굴
//   ① 돌아온 것이 있으면 — 「어머니를 위해 일곱 사람이 같이 빌었습니다」
//      이게 이 칸의 본뜻이다. 내가 켠 불 앞에 모르는 사람이 손을 모았다는 것.
//      공덕이 숫자에서 사건이 되는 유일한 자리라, 다른 무엇보다 앞에 세운다.
//   ② 없으면 — 지금 타고 있는 초 몇 자루를 불꽃으로 보여 준다.
//      남의 이름이 걸려 있는 걸 보면 「나도 하나」가 된다.
//
// 불꽃은 CSS 다. 법당(CandleHall)의 것을 줄여 옮겼다 — 여기선 여섯 자루까지만.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { watchAuth } from "@/lib/sync";
import { fetchCandles, wishOf, type Candle } from "@/lib/candle";
import { echoLine, pullEchoes, type Echo } from "@/lib/candleEcho";

/** 작은 불꽃 하나 — 박자를 어긋나게 해야 줄이 살아 보인다 */
function Flame({ hue, seed }: { hue: number; seed: number }) {
  const delay = `${(seed % 13) * 0.17}s`;
  const dur = `${1.5 + (seed % 7) * 0.11}s`;
  return (
    <span className="relative block h-[18px] w-[10px]">
      <span
        className="candle-glow absolute left-1/2 top-[60%] h-[42px] w-[42px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(${hue},70%,72%,.26) 0%, rgba(255,178,80,.2) 34%, transparent 70%)`,
          animationDelay: delay,
          animationDuration: dur,
        }}
      />
      <span
        className="candle-flame absolute bottom-0 left-1/2 h-[18px] w-[9px] -translate-x-1/2"
        style={{
          background: "linear-gradient(to top, #ffb64a, #ffe08a 40%, #fffaea 82%)",
          animationDelay: delay,
          animationDuration: dur,
        }}
      />
    </span>
  );
}

export default function BeopdangCard() {
  const [burning, setBurning] = useState<Candle[] | null>(null);
  const [echoes, setEchoes] = useState<Echo[]>([]);

  const read = useCallback(() => {
    void fetchCandles()
      .then((cs) => setBurning(cs.slice(0, 6)))
      .catch(() => setBurning([]));
  }, []);

  useEffect(() => {
    read();
    // 돌아온 것은 로그인한 사람에게만 있다
    const off = watchAuth((u) => {
      if (!u) return setEchoes([]);
      void pullEchoes().then(setEchoes).catch(() => setEchoes([]));
    });
    return off;
  }, [read]);

  // 아직 아무 초도 못 읽었고 돌아온 것도 없으면 자리를 차지하지 않는다
  if (burning === null && !echoes.length) return null;

  const hasEcho = echoes.length > 0;
  const got = echoes.reduce((n, e) => n + e.added, 0);

  return (
    <Link
      href="/candle"
      className="tap block w-full max-w-sm rounded-[18px] border border-ink-3 bg-ink-2/40 px-5 py-4 text-left transition-colors hover:border-gold/40"
    >
      <style>{`
        .candle-flame {
          border-radius: 50% 50% 46% 46% / 62% 62% 38% 38%;
          transform-origin: 50% 100%;
          animation-name: bd-sway; animation-timing-function: ease-in-out;
          animation-iteration-count: infinite; filter: blur(.35px);
        }
        @keyframes bd-sway {
          0%,100% { transform: scale(1,1) skewX(0deg) }
          31%     { transform: scale(.94,1.08) skewX(-4deg) }
          67%     { transform: scale(1.04,.97) skewX(3deg) }
        }
        .candle-glow {
          animation-name: bd-breathe; animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes bd-breathe {
          0%,100% { opacity:.8 } 43% { opacity:1 } 71% { opacity:.68 }
        }
        @media (prefers-reduced-motion: reduce) {
          .candle-flame, .candle-glow { animation: none }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] tracking-[0.3em] text-gold-soft">燭 · 법당</p>
        <span className="text-[11px] text-hanji-faint">
          {hasEcho ? "돌아왔습니다" : "보러 가기 →"}
        </span>
      </div>

      {hasEcho ? (
        // ① 돌아온 것 — 이 칸이 있는 까닭
        <>
          <p className="mt-3 break-keep font-serif text-[17px] leading-8 text-hanji">
            {echoLine(echoes[0])}
          </p>
          {echoes.length > 1 && (
            <p className="mt-1 text-[12px] leading-6 text-hanji-dim">
              그리고 {echoes.length - 1}자루에 더 —{" "}
              <span className="text-gold-soft">모두 {got.toLocaleString("ko-KR")}명</span>
            </p>
          )}
          <p className="mt-2.5 text-[11.5px] leading-5 text-hanji-faint">
            얼굴도 모르는 이들이 당신이 켠 불 앞에서 손을 모았습니다.
          </p>
        </>
      ) : (
        // ② 아직 없으면 — 지금 타고 있는 불을 보여 준다
        <>
          <div className="mt-3 flex min-h-[34px] items-end gap-3">
            {burning && burning.length > 0 ? (
              burning.map((c, i) => (
                <Flame key={c.id} hue={wishOf(c.kind).hue} seed={i * 7 + c.forName.length} />
              ))
            ) : (
              <span className="text-[12.5px] leading-7 text-hanji-dim">
                아직 켜진 초가 없습니다.
              </span>
            )}
          </div>
          <p className="mt-3 break-keep text-[12.5px] leading-6 text-hanji-dim">
            {burning && burning.length > 0 ? (
              <>
                지금 <span className="text-gold-soft">{burning.length}자루</span>가 남의
                이름을 걸고 타고 있습니다.
              </>
            ) : (
              <>연꽃 한 송이로 초를 켭니다. 내 이름이 아니라 남의 이름을 적는 자리입니다.</>
            )}
          </p>
        </>
      )}
    </Link>
  );
}
