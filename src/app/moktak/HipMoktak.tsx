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
  onMore: () => void;
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
  onMore,
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
    setKnot(true);
    const t = window.setTimeout(() => setKnot(false), 900);
    return () => window.clearTimeout(t);
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
          <div className="flex items-center gap-3">
            <span
              className={`hip-hap ${combo >= 2 ? "on" : ""}`}
              aria-hidden={combo < 2}
            >
              合
            </span>
            <button onClick={onMore} aria-label="살림살이" className="hip-more">
              ⋯
            </button>
          </div>
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

        {/* 형: 「목탁이랑 저거 민트 핑크 칸 차는 거 위치 위아래 바꾸고」.
            셈과 격자가 위로, **오브제가 아래로** 내려왔다. 엄지가 닿는
            자리에 치는 물건이 있어야 한다 — 위에 있으면 손을 뻗어야 한다. */}
        <div className="hip-screen-mid">
          {/* ③ 숫자가 톡 — key 를 갈아 끼워 칠 때마다 다시 난다 */}
          <p key={`n${tab}${n}`} className="hip-big" aria-label={`오늘 ${n}번`}>
            {String(n).padStart(3, "0")}
          </p>
          {tab === "bowl" ? (
            <p className="hip-under">{ringing ? "울리는 중" : "그릇"}</p>
          ) : (
            <p className="hip-under">{left} 남음</p>
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

          {/* ── 오브제 — 코드로 그린다 ──
              형: 「메인에 오늘의 물음 위 연꽃 반응형 존나 좋다. 저런 느낌
              디자인으로 전반을 가자」.

              사진으로 구운 오브제는 아무리 잘 구워도 남의 결이다.
              연꽃처럼 **선으로 그리고 천천히 움직이면** 그게 우리 것이 된다. */}
          <button
            onClick={touch}
            aria-label={
              tab === "moktak"
                ? "목탁 치기"
                : tab === "yeomju"
                  ? "염주 한 알"
                  : ringing
                    ? "그릇 그치기"
                    : "그릇 울리기"
            }
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

            {tab === "moktak" && <Moktak spin={n} />}
            {tab === "yeomju" && <Yeomju lit={pos % KNOT} spin={n} />}
            {tab === "bowl" && <Bowl ringing={ringing} spin={n} />}

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

          <div className="hip-stats">
            {[
              [merit.toLocaleString("ko-KR"), "공덕"],
              [hits.toLocaleString("ko-KR"), "목탁"],
              [beadHits.toLocaleString("ko-KR"), "염주"],
            ].map(([v, k]) => (
              <div key={k}>
                <b>{v}</b>
                <span>{k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HipShell>
  );
}

/** 목탁 — 둥근 몸 · 용머리 자리의 귀 둘 · 초승달로 파인 입.
    형: 「목탁처럼 보이면서 귀엽고」. 이 셋이 목탁의 전부다. */
function Moktak({ spin }: { spin: number }) {
  return (
    <span key={`o${spin}`} aria-hidden className="hip-mok">
      <svg viewBox="0 0 200 200">
        <defs>
          <radialGradient id="mokBody" cx="34%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#FCCEDD" />
            <stop offset="56%" stopColor="#F29FBD" />
            <stop offset="100%" stopColor="#DC7BA0" />
          </radialGradient>
          <radialGradient id="mokEar" cx="34%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#F7B7CF" />
            <stop offset="100%" stopColor="#DA7A9E" />
          </radialGradient>
        </defs>
        {/* 숨 쉬는 테 — 연꽃과 같은 박자로 */}
        <g className="hip-mok-aura">
          <circle cx="100" cy="108" r="84" />
          <circle cx="100" cy="108" r="74" />
        </g>
        {/* 방석 — 목탁은 방석 위에 얹혀 있다.
            혹 둘에 가로 틈만 그렸더니 개구리 얼굴로 읽혔다. 얼굴을
            지우는 건 이목구비를 빼는 게 아니라 **물건의 자리**를 주는
            일이다. 방석에 얹히는 순간 그것은 얼굴이 아니라 물건이 된다 */}
        <ellipse className="hip-mok-mat" cx="100" cy="174" rx="60" ry="14" />
        {/* 꼭지 — 목탁 머리의 쌍어(두 물고기) 자리.
            둘로 벌려 놓으면 눈이 된다. **하나로 덮고 가운데만 파면**
            물고기 둘이 맞댄 그 모양이 되고, 눈으로는 안 읽힌다 */}
        <path className="hip-mok-ear" d="M74 58q0-30 26-30t26 30z" />
        <path className="hip-mok-groove" d="M100 32v24" />
        {/* 몸 — 살짝 눌린 동그라미 */}
        <ellipse className="hip-mok-body" cx="100" cy="112" rx="66" ry="58" />
        {/* 두 쪽이 만나는 자리 — 아주 옅게 */}
        <path className="hip-mok-seam" d="M42 100q58 16 116 0" />
        {/* 입 — 가로로 길게 파인 홈.
            웃는 선으로 그렸더니 얼굴이 됐다. 목탁의 입은 **몸통을 거의
            가로지르는 가늘고 깊은 틈**이다. 그 하나로 목탁이 된다 */}
        <path
          className="hip-mok-mouth"
          d="M42 132Q100 168 158 132Q100 138 42 132Z"
        />
        {/* 틈 아래 입술 — 한 겹 깊어 보이게 */}
        <path className="hip-mok-lip" d="M52 140q48 24 96 -2" />
        {/* 빛 한 점 */}
        <ellipse
          className="hip-mok-shine"
          cx="74"
          cy="86"
          rx="23"
          ry="13"
          transform="rotate(-26 74 86)"
        />
        {/* 채 — 목탁은 분홍만. 형: 「목탁은 핑크만 두고」 */}
        <path className="hip-mok-stick" d="M152 180l36-32" />
        <circle className="hip-mok-knob" cx="148" cy="184" r="13" />
      </svg>
    </span>
  );
}

/** 염주 — 알 스물일곱이 한 바퀴. 넘긴 만큼 물든다 */
function Yeomju({ lit, spin }: { lit: number; spin: number }) {
  const R = 62;
  return (
    <span key={`o${spin}`} aria-hidden className="hip-mok hip-bead">
      <svg viewBox="0 0 200 200">
        <defs>
          <radialGradient id="beadOn" cx="34%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#FBC3D6" />
            <stop offset="100%" stopColor="#D2688F" />
          </radialGradient>
          <radialGradient id="beadMom" cx="34%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#F7E3BC" />
            <stop offset="100%" stopColor="#C9A063" />
          </radialGradient>
        </defs>
        <g className="hip-mok-aura">
          <circle cx="100" cy="100" r="82" />
        </g>
        {/* 실 */}
        <circle className="hip-bead-thread" cx="100" cy="100" r={R} />
        {Array.from({ length: KNOT }, (_, i) => {
          const a = (i / KNOT) * Math.PI * 2 - Math.PI / 2;
          const x = 100 + Math.cos(a) * R;
          const y = 100 + Math.sin(a) * R;
          // 맨 위는 모주 — 한 바퀴가 어디서 시작하는지 알려 준다
          if (i === 0)
            return <circle key={i} className="hip-bead-mom" cx={x} cy={y} r="12" />;
          return (
            <circle
              key={i}
              className="hip-bead-one"
              cx={x}
              cy={y}
              r="8.4"
              data-on={i <= lit ? "1" : undefined}
            />
          );
        })}
      </svg>
    </span>
  );
}

/** 싱잉볼 — 놋 사발과 채. 울리는 동안 테가 떨린다 */
function Bowl({ ringing, spin }: { ringing: boolean; spin: number }) {
  return (
    <span
      key={`o${spin}`}
      aria-hidden
      className={`hip-mok hip-bowl${ringing ? " on" : ""}`}
    >
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="bowlBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8FD9C8" />
            <stop offset="52%" stopColor="#5CC2AC" />
            <stop offset="100%" stopColor="#3E9C88" />
          </linearGradient>
        </defs>
        <g className="hip-mok-aura">
          <circle cx="100" cy="106" r="82" />
          <circle cx="100" cy="106" r="72" />
        </g>
        {/* 방석 */}
        <ellipse className="hip-bowl-mat" cx="100" cy="158" rx="52" ry="11" />
        {/* 사발 — 위가 열린 반타원 */}
        <path className="hip-bowl-body" d="M38 98a62 56 0 0 0 124 0z" />
        {/* 아가리 */}
        <ellipse className="hip-bowl-rim" cx="100" cy="98" rx="62" ry="15" />
        {/* 빛 한 줄 */}
        <path className="hip-bowl-shine" d="M62 112q10 28 34 38" />
        {/* 채 — 곧추세워 뒀더니 허공에 뜬 막대였다. 살짝 기울여
            테에 기대 놓고, 끝에 가죽 머리를 붙인다 */}
        <g transform="rotate(14 170 104)">
          <rect className="hip-bowl-stick" x="164" y="40" width="12" height="82" rx="6" />
          <circle className="hip-bowl-head" cx="170" cy="130" r="13" />
        </g>
      </svg>
    </span>
  );
}
