"use client";

// ─────────────────────────────────────────────────────────────
// 연등(蓮燈) — 천장에 걸리는 등 한 개와 그 아래 쪽지.
//
// 형: 「연등 다운로드 받아 뒀거든. 이걸로 다시 법당에 몇 개 걸어 봐」
//
// 선으로 그리던 것(SVG)을 걷고 **형이 구운 그림**으로 간다.
// 선으로 그리면 서른 개가 다 달라 보이는 값이 있었지만, 종이 결과
// 속에서 배어 나오는 빛은 선으로 흉내가 안 된다. 김부따 판에 걸린
// 등이 사진처럼 보이는 까닭이 그것이다(형: 「지지 말자」).
//
// 그러면 「서른 개가 다 똑같아 보인다」는 어떻게 하나 —
//   · **빛깔을 돌린다.** 같은 그림을 씨에 따라 색상만 옮긴다(hue-rotate).
//     다섯 벌이면 한 화면에서 똑같은 등이 나란히 설 일이 드물다
//   · **줄 길이와 흔들림이 다르다.** 층을 지어 걸리고 저마다 다른 박자로
//     흔들린다 — 이건 그림이 아니라 자리가 만드는 차이라 그대로 남는다
//
// 쪽지는 그림 안에 **빈 칸**으로 들어 있다. 이름은 그 위에 얹는다 —
// 세로로 쓴다(절의 쪽지가 그렇다). 자리는 그림에서 재 두었다.
// ─────────────────────────────────────────────────────────────

/** 쪽지 칸 — deungprep.mjs 가 그림에서 잰 값(백분율) */
export const 쪽지자리 = { left: 39.4, top: 76.2, width: 21, height: 23.7 };

export default function Yeondeung({
  /** 쪽지에 적히는 이름 */
  name,
  /** 등의 빛깔·흔들림을 가르는 씨. 같은 사람은 늘 같은 등을 단다 */
  seed = 0,
  /** 줄 길이(px) — 층을 지어 걸리려면 저마다 달라야 한다 */
  drop = 24,
  /** 꺼진 등 — 다 탄 것은 빛이 죽는다 */
  dim = false,
  /** 얼마나 뒤에 있나 — 0 앞, 1 뒤. 형: 「원근법 줘서」
      뒤엣것은 작고, 옅고, 조금 흐리다. 겹쳐 걸린 등이 깊이를 얻는다 */
  깊이 = 0,
  onClick,
}: {
  name: string;
  seed?: number;
  drop?: number;
  dim?: boolean;
  깊이?: number;
  onClick?: () => void;
}) {
  const s = Math.abs(seed);
  // 빛깔 다섯 벌 — 원화가 연분홍·자주라 ±30도 안에서만 돌린다.
  // 더 돌리면 등이 파래지거나 누레져서 법당이 아니라 축제가 된다
  const 돌림 = [0, -16, 14, -30, 26][s % 5];
  // 흔들림은 저마다 다른 박자로 — 서로 나눌 수 없는 초로 두면 겹치는
  // 자리가 늘 달라져서, 스무 개가 한 몸처럼 흔들리는 일이 없다
  const 초 = 4.6 + ((s * 7) % 23) / 10;
  const 늦 = ((s * 13) % 40) / 10;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hip-deung"
      style={{ "--deung-len": `${drop}px`, "--깊이": 깊이 } as React.CSSProperties}
      aria-label={`${name} 연등`}
    >
      {/* 실 — 천장에서 등까지 */}
      <i className="hip-deung-line" aria-hidden />

      <span
        className="hip-deung-sway"
        style={{ animationDuration: `${초}s`, animationDelay: `-${늦}s` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hip-deung-img"
          src="/obj/deung.png"
          alt=""
          draggable={false}
          style={{
            filter: dim
              ? `hue-rotate(${돌림}deg) saturate(0.28) brightness(1.06) opacity(0.65)`
              : `hue-rotate(${돌림}deg)`,
          }}
        />
        {/* 이름은 쪽지 위에 세로로 */}
        <b className="hip-deung-tag">{name}</b>
      </span>
    </button>
  );
}
