"use client";

// ─────────────────────────────────────────────────────────────
// 공양 넷 — 연등 · 향 · 쌀 · 초.
//
// 형: 「초 연등 쌀 향도 일단 다운받아 뒀다. 법당에 적용」
//     「위는 연등, 아래는 초 쌀 등등 뭐 이런 식으로. 김부따 느낌 살려서
//      지지 말자」
//
// 선으로 그리던 것(SVG)은 다 걷었다. 형이 구운 그림이 훨씬 낫다 —
// 놋쇠 향로의 때, 쌀알 하나하나, 촛농이 흘러내린 자국. 이건 선으로
// 흉내가 안 된다.
//
// **등은 매달리고, 향·쌀·초는 선다.**
//   절이 그렇다 — 등은 천장에 걸고 공양물은 불단 위에 올린다.
//   그래서 등에는 실과 흔들림이 있고, 나머지는 가만히 서 있다.
//   이름이 붙는 자리도 다르다: 등은 제 쪽지에, 나머지는 발치에.
// ─────────────────────────────────────────────────────────────

import Yeondeung from "./Yeondeung";

export type 공양갈래 = "deung" | "ssal" | "cho" | "hyang";

/** 불단에 서는 것들 — 그림과 그 밑에 적는 이름 */
const 선것 = {
  ssal: { src: "/obj/gong-ssal.png", 말: "쌀 공양" },
  cho: { src: "/obj/gong-cho.png", 말: "초 공양" },
  hyang: { src: "/obj/gong-hyang.png", 말: "향 공양" },
} as const;

export default function Gongyang({
  갈래 = "deung",
  name,
  seed = 0,
  drop = 24,
  dim = false,
  onClick,
}: {
  갈래?: 공양갈래;
  name: string;
  seed?: number;
  drop?: number;
  dim?: boolean;
  onClick?: () => void;
}) {
  // 연등은 제 모양을 안다 — 매달리고 쪽지에 이름이 적힌다
  if (갈래 === "deung")
    return <Yeondeung name={name} seed={seed} drop={drop} dim={dim} onClick={onClick} />;

  const 것 = 선것[갈래];
  const s = Math.abs(seed);
  // 같은 그림이 여럿 서면 진열대가 된다 — 키를 조금씩 달리한다.
  // 빛깔은 안 돌린다(놋쇠와 흰 사기는 색이 바뀌면 딴 물건이 된다)
  const 키 = 0.88 + ((s * 11) % 25) / 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hip-gong"
      aria-label={`${name} ${것.말}`}
    >
      <span className="hip-gong-body" style={{ width: `${키 * 100}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hip-gong-img"
          src={것.src}
          alt=""
          draggable={false}
          style={dim ? { filter: "saturate(0.25) opacity(0.5)" } : undefined}
        />
        {/* 초는 불꽃이 살아 있다 — 다 탄 것은 안 흔들린다 */}
        {갈래 === "cho" && !dim && <i className="hip-gong-flame" aria-hidden />}
      </span>
      <span className="hip-gong-name">{name}</span>
    </button>
  );
}
