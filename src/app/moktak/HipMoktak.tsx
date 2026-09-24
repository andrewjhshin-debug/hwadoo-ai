"use client";

// ─────────────────────────────────────────────────────────────
// 공덕 — 폰 판. 功.
//
// 형이 짚어 준 것들 —
//   「탭이랑 막 겹치잖아」          → 화면을 통째로 덮는다(하심과 같은 길)
//   「흰 핑크 민트 이쁘게 힙하게」   → 흰 바탕에 연꽃 분홍과 민트가 번진다
//   「글자수는 최대한 줄여」         → 남은 글자는 百八 · 숫자 · 남음 · 셈 셋
//   「목탁이나 염주 원래 디자인을 빼먹진 마」
//                                  → **오브제가 주인공**이다
//   「공덕에는 오리지날처럼 위에 목탁 염주 싱잉볼로 옮길 수 있는 탭 주고」
//                                  → 머리에 셋을 나란히. 서랍 뒤에 숨겨 뒀던
//                                    갈래를 다시 꺼내 놓는다. 셋 다 이 판에서
//                                    그린다 — 넘어가도 옛 화면이 안 뜬다
//   「핑크 목탁 존나 구리다. 목탁처럼 보이면서 귀엽게」
//                                  → 귀 둘을 얹고 입을 크게 팠다. 둥근 몸 ·
//                                    용머리 자리의 귀 · 초승달로 파인 입.
//                                    그 셋이면 누구나 목탁으로 읽는다
//
// 내가 얹은 것들 —
//   ① **숨 쉬는 바탕** — 분홍과 민트 덩이가 아주 느리게(26초) 흐른다
//   ② **파문** — 칠 때마다 오브제에서 고리 하나가 퍼진다
//   ③ **숫자가 톡** — 칠 때마다 숫자가 살짝 눌렸다 돌아온다
//   ④ **마디의 결** — 스물일곱째마다 격자가 민트로 한 번 훑고 지나간다
//
// 셋의 결을 갈랐다 — 목탁은 분홍, 염주는 장미빛 알, 싱잉볼은 민트 놋.
// 한눈에 어느 갈래인지 알아야 머리의 탭을 안 읽는다.
//
// 기능은 한 줄도 새로 안 짰다. 셈·소리·공덕·서랍은 전부 부모(page.tsx)가
// 쥐고 있고 여기는 받아 그린다 — 이 파일을 통째로 지워도 앱은 돈다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import HipShell from "@/components/HipShell";
import HipTop from "@/components/HipTop";
import { ROUND } from "@/lib/merit";

export type HipTab = "moktak" | "yeomju" | "bowl";

export type HipMoktakProps = {
  /** 지금 갈래 — 머리의 탭으로 옮긴다 */
  tab: HipTab;
  onTab: (t: HipTab) => void;
  hits: number;
  merit: number;
  beadHits: number;
  bowlHits: number;
  combo: number;
  /** 염주 — 이번 바퀴에서 몇 알째인가 (0~107) */
  pos: number;
  /** 싱잉볼 — 지금 울고 있는가 */
  ringing: boolean;
  /** 한 번 친다 — 부모의 손타 처리를 그대로 부른다 */
  onHit: () => void;
  /** 한 알 넘긴다 */
  onAdvance: () => void;
  /** 그릇을 울린다(울고 있으면 그친다) */
  onRing: () => void;
  /** 살림살이(정근·소리·자동·살갗)를 펴 보인다 */
  /** 살림살이(정근·소리·자동·살갗) — 부모가 그려 준 것을 판 아래에 깐다.
      형: 「오른쪽 위 ... 없이 그냥 화면에 녹여 기능 옵션」 */
  options: React.ReactNode;
  /** 염주·싱잉볼 — **원래 그림과 원래 굴림 그대로.**
      코드로 다시 그렸던 것은 버렸다. 부모가 그려서 넘긴다 */
  bead: React.ReactNode;
  bowl: React.ReactNode;
  /** 떠오르는 글자 */
  pops: { id: number; ch: string; dx: number; rot: number }[];
};

/** 염주 알 스물일곱 — 한 마디 */
const KNOT = 27;

export default function HipMoktak({
  tab,
  onTab,
  hits,
  merit,
  beadHits,
  bowlHits,
  combo,
  pos,
  ringing,
  onHit,
  onAdvance,
  onRing,
  options,
  bead,
  bowl,
  pops,
}: HipMoktakProps) {
  // 갈래마다 세는 것이 다르다 — 큰 숫자 하나가 그 갈래의 오늘이다
  const n = tab === "moktak" ? hits : tab === "yeomju" ? beadHits : bowlHits;
  const inRound = (tab === "yeomju" ? pos : hits) % ROUND;
  const left = ROUND - inRound;

  // ④ 마디 — 스물일곱째를 지날 때만 격자가 한 번 훑인다
  const [knot, setKnot] = useState(false);
  const seen = useRef(-1);
  useEffect(() => {
    if (n === seen.current) return;
    const crossed = n > 0 && n % KNOT === 0;
    seen.current = n;
    if (!crossed) return;
    // 켜는 것도 타이머로 미룬다 — 효과 안에서 곧바로 setState 하면
    // 렌더가 연쇄로 돈다(react-hooks 규칙). 한 틱 미루면 그만이다
    const on = window.setTimeout(() => setKnot(true), 0);
    const off = window.setTimeout(() => setKnot(false), 900);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [n]);

  const touch = tab === "moktak" ? onHit : tab === "yeomju" ? onAdvance : onRing;

  return (
    <HipShell here="/moktak">
      <div className="hip-screen md:hidden" data-lane={tab}>
        {/* ① 숨 쉬는 바탕 — 덩이 둘이 서로 다른 박자로 아주 느리게 흐른다 */}
        <span aria-hidden className="hip-bloom hip-bloom-a" />
        <span aria-hidden className="hip-bloom hip-bloom-b" />

        <header className="hip-screen-top">
          <a href="/" aria-label="화두 홈" className="hip-home">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 4.2c1.7 2.4 2.4 4.4 2.4 6.3s-1.1 3.7-2.4 4.9c-1.3-1.2-2.4-3-2.4-4.9s.7-3.9 2.4-6.3z" />
              <path d="M12 15.4c-1.9-1.6-4.6-2.3-7.4-2.2.3 2.6 2.4 4.6 5 5 .9.1 1.7 0 2.4-.3" />
              <path d="M12 15.4c1.9-1.6 4.6-2.3 7.4-2.2-.3 2.6-2.4 4.6-5 5-.9.1-1.7 0-2.4-.3" />
            </svg>
            <b>화두</b>
          </a>
          <HipTop>
            <span
              className={`hip-hap ${combo >= 2 ? "on" : ""}`}
              aria-hidden={combo < 2}
            >
              合
            </span>
          </HipTop>
        </header>

        {/* ── 갈래 셋 ──
            형: 「공덕에는 오리지날처럼 위에 목탁 염주 싱잉볼로 옮길 수 있는
            탭 주고」. 서랍 뒤에 있던 것을 머리로 올렸다. */}
        <div className="hip-lanes" role="tablist" aria-label="무엇을">
          {(
            [
              ["moktak", "목탁"],
              ["yeomju", "염주"],
              ["bowl", "싱잉볼"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              data-on={tab === k ? "1" : undefined}
              onClick={() => tab !== k && onTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 형: 「목탁에서 목탁이랑 그 격자 위치 바꿔 위아래로」.
            한 번 내렸다가 다시 올린다 — **오브제가 위, 백팔 격자가 아래.**
            치는 물건이 눈에 먼저 들어오고, 얼마나 찼는지는 그 아래서
            받는다. 격자는 보는 것이지 누르는 것이 아니니 밑이 맞다. */}
        <div className="hip-screen-mid">
          {/* ③ 숫자가 톡 — key 를 갈아 끼워 칠 때마다 다시 난다 */}
          <p key={`n${tab}${n}`} className="hip-big" aria-label={`오늘 ${n}번`}>
            {String(n).padStart(3, "0")}
          </p>
          {/* 형: 「목탁에서 0번 남음 이거 없애고」.
              백팔까지 얼마 남았는지는 **바로 아래 격자가 이미 말한다.**
              같은 것을 숫자로 한 번 더 적으니 둘 다 안 읽혔다.
              그릇은 격자가 없으니 한 마디만 남긴다. */}
          {tab === "bowl" && (
            <p className="hip-under">{ringing ? "울리는 중" : "그릇"}</p>
          )}

          {/* ── 오브제 ──
              목탁은 3D 렌더 한 장. 염주와 싱잉볼은 **원래 그림과 원래
              굴림 그대로** 부모가 그려서 넘긴다.
              형: 「염주 디자인은 원래 있던 거 다 적용」
                  「싱잉볼 염주 전부 기존 거 유지 디자인」

              염주는 **버튼으로 감싸지 않는다** — 드래그 판을 버튼에 넣으면
              쓸 때마다 click 이 겹쳐 두 번 센다. 톡 누르기는 원본의
              onPointerUp 이 이미 처리한다(8px 미만이면 한 알). */}
          {tab === "yeomju" && bead}
          {tab === "bowl" && bowl}

          {tab === "moktak" && (
          <button
            onClick={touch}
            aria-label="목탁 치기"
            className="hip-obj"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {/* 파문 — 칠 때마다 고리 둘이 퍼진다 */}
            {n > 0 && (
              <span key={`w${tab}${n}`} aria-hidden>
                <i className="hip-ripple" />
                <i className="hip-ripple hip-ripple-2" />
              </span>
            )}

            <Moktak spin={n} />

            {/* 떠오르는 글자 */}
            <span aria-hidden className="hip-pops">
              {pops.map((p) => (
                <span
                  key={p.id}
                  style={{
                    left: p.dx,
                    transform: `rotate(${p.rot}deg)`,
                    animation: "mk-pop 1s cubic-bezier(.2,.7,.3,1) forwards",
                  }}
                >
                  {p.ch}
                </span>
              ))}
            </span>
          </button>
          )}

          {/* 백팔 격자 — 그릇은 바퀴를 돌지 않으니 두지 않는다 */}
          {tab !== "bowl" && (
            <div
              className={`hip-grid108 mt-7 w-full${knot ? " knot" : ""}`}
              role="img"
              aria-label={`백팔 중 ${inRound}번`}
            >
              {Array.from({ length: ROUND }, (_, i) => (
                <i
                  key={i}
                  style={{ ["--i" as string]: String(i) }}
                  data-on={i < inRound ? "1" : undefined}
                  data-knot={i % KNOT === 0 ? "1" : undefined}
                />
              ))}
            </div>
          )}

          {/* 형이 여기 셈 줄에 빨간 X 를 쳤다 — 「이 부분 필요 없고」.
              몇 번 쳤는지는 내 도량으로 간다. 치는 화면에서는 큰 숫자
              하나면 족하다. */}

          {/* 살림살이 — 「⋯」 서랍을 걷고 판 아래에 조용히 깐다.
              형: 「오른쪽 위 ... 없이 그냥 화면에 녹여 기능 옵션」.
              숨겨 두면 있는 줄도 모르고, 열면 화면이 통째로 덮여
              치던 것이 사라진다. 내려야 보이니 치는 동안은 안 걸린다. */}
          {options}
        </div>
      </div>
    </HipShell>
  );
}

/** 목탁 — 3D 렌더 한 장.
    형: 「목탁은 저딴 식으로 가면 안 됨. 3차원 제미나이 써서 기존 느낌으로
    둥글고 귀엽게」.

    코드로 그려 봤다. 선으로 그으면 웃는 얼굴이 되고, 채워 그리면 개구리가
    됐다. 목탁은 **깎은 물건**이라 면과 그늘이 있어야 목탁으로 읽힌다 —
    평면으로는 안 되는 물건이었다. 그래서 원래 목탁(public/obj/moktak.png)을
    레퍼런스로 넣고 같은 각도·같은 짜임으로 다시 렌더했다. 달라진 것은
    셋뿐이다 — 통통하게, 무광 분홍으로, 금붕어는 더 작고 동글게. */
function Moktak({ spin }: { spin: number }) {
  return (
    <span key={`o${spin}`} aria-hidden className="hip-mok hip-mok-img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/obj/moktak-pink.png" alt="" />
    </span>
  );
}
