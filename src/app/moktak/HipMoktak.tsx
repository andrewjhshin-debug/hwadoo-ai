"use client";

import HipLanes, { type LaneTab } from "@/components/HipLanes";

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

/** 갈래 이름은 HipLanes 가 쥔다 — 여기서는 옛 이름으로 다시 내보낸다 */
export type HipTab = LaneTab;


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
  /** 살갗 점 — 오브제 바로 밑. 형: 「목탁 밑에 작은 색상 버튼 동그라미로」 */
  dots: React.ReactNode;
  /** 키캡 — 눌린 상태와 누르기·떼기.
      형: 「눌리는 거 만들어서, 클릭하면 눌려지면서 키캡 소리 나도록」 */
  keyHits: number;
  keyDown: boolean;
  onKeyDown: () => void;
  onKeyUp: () => void;
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
  dots,
  keyHits,
  keyDown,
  onKeyDown,
  onKeyUp,
  pops,
}: HipMoktakProps) {
  // 갈래마다 세는 것이 다르다 — 큰 숫자 하나가 그 갈래의 오늘이다
  const n =
    tab === "moktak" ? hits
    : tab === "yeomju" ? beadHits
    : tab === "keycap" ? keyHits
    : bowlHits;
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
      {/* hip-screen-scroll — 이 판은 살림살이까지 있어 길다.
          형: 「내린 건 좋은데 겹치지 않게 탭이랑」.
          통으로 안 만들면 내용이 그냥 흘러넘쳐 아래 염주를 밟는다. */}
      <div className="hip-screen hip-screen-scroll" data-lane={tab}>
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
          {/* 合 은 머리에서 내렸다 — 형: 「저거 오른쪽 위 말고 목탁이랑
              숫자 사이에 넣자」. 치는 동안 눈은 목탁에 가 있는데 박자 표는
              화면 반대편 귀퉁이에서 깜빡였다. 보라는 것을 안 보이는 데
              두었으니 켜지는 줄도 몰랐다. 손이 가는 자리 옆으로 옮긴다. */}
          <HipTop />
        </header>

        {/* ── 갈래 셋 ──
            형: 「공덕에는 오리지날처럼 위에 목탁 염주 싱잉볼로 옮길 수 있는
            탭 주고」. 서랍 뒤에 있던 것을 머리로 올렸다. */}
        {/* 갈래 띠는 HipLanes 가 쥔다 — 방 여섯도 같은 띠를 쓴다.
            여기서만 그리면 문을 여는 순간 띠가 사라져서, 방마다 다른
            앱처럼 보였다. 한 군데서 만들어 열 자리가 같이 쓴다. */}
        <HipLanes tab={tab} onTab={onTab} />

        {/* 형: 「목탁에서 목탁이랑 그 격자 위치 바꿔 위아래로」.
            한 번 내렸다가 다시 올린다 — **오브제가 위, 백팔 격자가 아래.**
            치는 물건이 눈에 먼저 들어오고, 얼마나 찼는지는 그 아래서
            받는다. 격자는 보는 것이지 누르는 것이 아니니 밑이 맞다. */}
        <div className="hip-screen-mid">
          {/* ③ 숫자가 톡 — key 를 갈아 끼워 칠 때마다 다시 난다 */}
          <p key={`n${tab}${n}`} className="hip-big" aria-label={`오늘 ${n}번`}>
            {String(n).padStart(3, "0")}
          </p>

          {/* ── 박자 ──
              형: 「이말 넣어 — 박자가 맞고 있어요 · 4번째. 이거 일정하게
              하는 거 유도하게 하는 거 넘 좋다」

              合 한 글자만으로는 그것이 칭찬인지 무슨 표시인지 알 수 없었다.
              **몇 번째로 고르게 치고 있는지**까지 적어 주면, 숫자가 올라가는
              것을 보려고 손이 저절로 박자를 맞춘다. 설명 대신 셈이 이끈다.
              자리는 늘 잡아 둔다 — 떴다 사라지며 아래를 밀어 올리면
              목탁이 손 밑에서 움직인다. */}
          <p className={`hip-beat${combo >= 2 ? " on" : ""}`} aria-live="polite">
            <b>合</b>
            <span>박자가 맞고 있어요 · {combo}번째</span>
          </p>
          {/* 형: 「목탁에서 0번 남음 이거 없애고」.
              백팔까지 얼마 남았는지는 **바로 아래 격자가 이미 말한다.**
              같은 것을 숫자로 한 번 더 적으니 둘 다 안 읽혔다.
              그릇은 격자가 없으니 한 마디만 남긴다. */}
          {/* 형: 「저기 그릇 글자 없애고」.
              바로 아래에 「작은 그릇 · 중간 그릇 · 큰 그릇」 알약이 이미
              서 있는데 그 위에 「그릇」이라 또 적고 있었다. */}

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

          {/* ── 키캡 ──
              형: 「키캡 이 느낌으로 불상이나 캐릭터 불교로 넣어서 위아래
              올라갔다 내려가게」 「키캡 저게 지금 안 귀엽잖아 귀엽게」
              「머리에 색을 넣든 하고, 이마에 동글동글 저거 좀 기괴하다.
               옷도 주황색으로 가는 건 어떨까, 넘 노래 캐릭터가 다」

              연꽃 받침과 상을 **한 덩이**로 구웠다(제미나이). 코드로 통을
              그려 상을 얹던 것보다 훨씬 낫다 — 그림자와 살이 한 몸이라
              진짜 하나의 물건으로 보인다.
              머리는 감청(나발 본래 색), 옷은 주황 가사, 살은 금 —
              세 색이 갈리니 노랑 덩어리로 안 뭉친다.

              눌림: 한 덩이라 아래로 내려가며 **살짝 찌그러진다.**
              바닥을 축으로 세로가 줄고 가로가 늘면, 손끝은 그것을
              「말랑한 것을 눌렀다」로 읽는다. */}
          {tab === "keycap" && (
            <button
              className={`hip-keycap${keyDown ? " on" : ""}`}
              aria-label="눌러서 한 번"
              onPointerDown={onKeyDown}
              onPointerUp={onKeyUp}
              onPointerLeave={onKeyUp}
              onPointerCancel={onKeyUp}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* 형: 「키캡 눌리는 모션을 두라고. 두 개 이미지를 분리해서
                  꽃받침이랑 부처상을.. 그다음에 부처상이 위아래 자연스럽게
                  키캡처럼 움직이면서 소리 나도록 해야지」

                  한 장일 때는 통째로 찌그러뜨리는 수밖에 없었다 — 받침까지
                  같이 눌리니 「말랑한 덩어리」이지 키캡이 아니었다.
                  두 장으로 가른다. **윗알(부처상)만 내려가고 받침은 가만히.**
                  그래야 손끝이 진짜 키를 눌렀다고 읽는다.
                  받침이 위에 깔리므로 부처상이 내려가면 그 뒤로 숨는다. */}
              <span className="hip-keycap-stack">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="hip-keycap-buddha" src="/obj/keycap-buddha.png" alt="" draggable={false} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="hip-keycap-cup" src="/obj/keycap-cup.png" alt="" draggable={false} />
              </span>
            </button>
          )}
          {/* 살갗 — 오브제 바로 밑. 고르는 것과 보이는 것이 붙어 있어야
              고른 티가 바로 난다 */}
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
          {/* 살갗 — 오브제 **바로 아래**.
              형: 「염주랑 목탁 둘 다에서 위치 옮기고」.
              숫자 밑에 있으면 무엇의 색을 고르는 것인지 안 보인다.
              고르는 것과 보이는 것이 붙어 있어야 고른 티가 바로 난다. */}
          {tab === "moktak" && <div className="hip-obj-foot">{dots}</div>}

          {/* 백팔 격자는 걷었다 —
              형: 「저 그리드 없애고 그 자리 더 활용해. 그리드 격자 필요 없다」.
              백여덟 칸이 화면의 절반을 먹으면서 말하는 것은 「몇 번 쳤나」
              하나뿐인데, 그건 바로 위 큰 숫자가 이미 말하고 있었다.
              같은 말을 두 번 하면 둘 다 안 읽힌다. 비운 자리는 오브제가
              받는다 — 크게, 가운데로. */}

          {/* 형이 여기 셈 줄에 빨간 X 를 쳤다 — 「이 부분 필요 없고」.
              몇 번 쳤는지는 내 도량으로 간다. 치는 화면에서는 큰 숫자
              하나면 족하다. */}

          {/* 살림살이는 **목탁 갈래에만.** 형: 「이거는 목탁에만 넣고」.
              정근(외며 칠 말)도 자동 목탁도 목탁을 칠 때 쓰는 것이다 —
              염주·싱잉볼·키캡 밑에 있으면 남의 살림이다.
              「⋯」 서랍을 걷고 판 아래에 조용히 깐다.
              형: 「오른쪽 위 ... 없이 그냥 화면에 녹여 기능 옵션」.
              숨겨 두면 있는 줄도 모르고, 열면 화면이 통째로 덮여
              치던 것이 사라진다. 내려야 보이니 치는 동안은 안 걸린다. */}
          {tab === "moktak" && options}
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
