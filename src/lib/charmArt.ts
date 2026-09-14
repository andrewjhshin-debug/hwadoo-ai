// ─────────────────────────────────────────────────────────────
// 부적 그림 — 황지(黃紙)에 주사(朱砂).
//
// 실제 부적은 삼단으로 짜여 있다 —
//   ① 관(冠)  위에 얹히는 반복 문양
//   ② 본문    세로 중심축에 가로 획이 걸리는 몸
//   ③ 봉인    아래 네모 도장
// 이 짜임을 지켜야 부적으로 읽힌다. 획 몇 개만 그으면 낙서가 된다.
//
// 뜻이 있는 글자는 쓰지 않는다 — 전서체 특유의 밀도만 흉내 낸다.
// 붓맛은 feDisplacementMap 으로 획을 흔들어 낸다.
// ─────────────────────────────────────────────────────────────

import type { CharmGrade, CharmId } from "./charm";

// 관(冠) — y 20~38
const CROWN: Record<CharmId, string> = {
  jeongjin: `<path d="M34 24 V34"/><path d="M42 21 V35"/><path d="M50 19 V36"/>
    <path d="M58 21 V35"/><path d="M66 24 V34"/><path d="M32 38 H68"/>`,
  hoehyang: `<path d="M36 30 C36 22 44 22 44 30 C44 38 52 38 52 30 C52 22 60 22 60 30 C60 38 66 36 66 30"/>
    <path d="M32 38 H68"/>`,
  inyeon: `<path d="M38 22 C44 30 56 30 62 22"/><path d="M34 30 C42 38 58 38 66 30"/>
    <path d="M32 38 H68"/>`,
  ansim: `<path d="M36 34 C40 24 60 24 64 34"/><circle cx="50" cy="26" r="3.4"/>
    <path d="M32 38 H68"/>`,
  unryeok: `<path d="M36 36 L42 22 L50 32 L58 22 L64 36"/><path d="M32 38 H68"/>`,
  cheonli: `<path d="M34 22 H66"/><path d="M40 22 V34"/><path d="M50 22 V36"/>
    <path d="M60 22 V34"/><path d="M32 38 H68"/>`,
  // 입에서 나가는 소리 — 세 겹의 물결
  yeomsong: `<path d="M34 24 C40 32 44 20 50 28 C56 36 60 22 66 30"/>
    <path d="M36 32 C42 38 46 28 52 34"/><path d="M32 38 H68"/>`,
};

// 본문 — y 44~104
const BODY: Record<CharmId, string> = {
  // 곧게 올라가는 걸음 — 멈추지 않는다
  jeongjin: `<path d="M50 44 V104"/>
    <path d="M36 54 H64"/><path d="M32 68 H68"/><path d="M36 82 H64"/>
    <path d="M50 88 L38 104"/><path d="M50 88 L62 104"/>`,
  // 안에서 돌아 밖으로
  hoehyang: `<path d="M50 44 V60"/>
    <path d="M50 60 C32 66 32 86 50 86 C68 86 68 66 50 60 Z"/>
    <circle cx="50" cy="73" r="6"/>
    <path d="M36 96 C42 104 58 104 64 96"/><path d="M50 86 V104"/>`,
  // 두 갈래가 만나 매듭
  inyeon: `<path d="M36 44 C36 62 50 62 50 74"/><path d="M64 44 C64 62 50 62 50 74"/>
    <path d="M50 74 V104"/><path d="M38 84 H62"/>
    <path d="M40 98 C44 92 56 92 60 98"/>`,
  // 가라앉는 획 — 고요
  ansim: `<path d="M50 44 V78"/><path d="M34 52 H66"/>
    <path d="M38 66 C44 76 56 76 62 66"/>
    <path d="M36 88 C42 98 58 98 64 88"/><path d="M42 104 H58"/>`,
  // 벌린 팔 — 몸으로 짓는 힘
  unryeok: `<path d="M50 44 V72"/><path d="M32 58 L50 72 L68 58"/>
    <path d="M34 80 H66"/><path d="M42 80 L34 104"/><path d="M58 80 L66 104"/>
    <path d="M44 92 H56"/>`,
  // 길게 뻗는 길
  cheonli: `<path d="M50 44 V104"/><path d="M34 50 H66"/>
    <path d="M36 66 C42 76 58 76 64 66"/><path d="M34 84 H66"/>
    <path d="M40 96 H60"/>`,
  // 입(口)에서 소리가 세 겹으로 퍼져 나간다
  yeomsong: `<path d="M50 44 V60"/><path d="M38 52 H62"/>
    <rect x="40" y="62" width="20" height="16" rx="1.5"/>
    <path d="M34 84 C42 92 58 92 66 84"/>
    <path d="M38 94 C44 100 56 100 62 94"/>
    <path d="M50 78 V104"/>`,
};

/**
 * 부적 한 장. uid 를 달리 주면 한 화면에 여러 장을 놓아도 id 가 안 겹친다.
 *
 * 등급은 종이에만 얹는다 — 하품은 예전 그대로, 중품은 금 한 줄과 진한 봉인,
 * 상품은 금테 두 줄과 은은한 금빛 광. 주사(朱砂) 붉은 획은 어느 등급에서도
 * 손대지 않는다. 부적을 부적으로 읽히게 하는 건 그 붉은 획이다.
 */
export function renderCharm(
  id: CharmId,
  seal: string,
  uid = "",
  grade: CharmGrade = "ha"
): string {
  // 봉인이 진해지는 건 중품부터 — 상품도 그대로 물려받는다
  const deep = grade !== "ha";
  const sealFill = deep ? "rgba(168,26,8,0.12)" : "none";
  const sealWidth = deep ? 3 : 2.2;
  const sealInk = deep ? "#8d1305" : "#a81a08";

  // 상품의 광 — 종이 뒤에 깔아 테두리 밖으로만 번지게 한다.
  // 종이 위에 얹으면 붉은 획이 흐려져 부적이 아니라 스티커가 된다.
  const halo =
    grade === "sang"
      ? `<g filter="url(#cm_glow)"><rect x="5" y="4" width="90" height="148" rx="2.5"
          fill="#f4c945" opacity="0.55"/></g>`
      : "";

  // 금테 — 중품 한 줄, 상품 두 줄(붉은 안테를 사이에 두고 겹으로 둘러싼다)
  const gilt =
    grade === "sang"
      ? `<rect x="7" y="6" width="86" height="144" rx="2" fill="none"
        stroke="url(#cm_gold)" stroke-width="1.1"/>
  <rect x="11.4" y="10.4" width="77.2" height="135.2" rx="1.2" fill="none"
        stroke="url(#cm_gold)" stroke-width="0.55" opacity="0.85"/>`
      : grade === "jung"
        ? `<rect x="7" y="6" width="86" height="144" rx="2" fill="none"
        stroke="url(#cm_gold)" stroke-width="0.95" opacity="0.9"/>`
        : "";

  const svg = `<svg viewBox="0 0 100 156" class="charm" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cm_paper" x1="0.1" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#ffe98c"/>
      <stop offset="0.35" stop-color="#fbd648"/>
      <stop offset="0.75" stop-color="#f0c227"/>
      <stop offset="1" stop-color="#dda80f"/>
    </linearGradient>
    <!-- 주사(朱砂) — 반드시 userSpaceOnUse.
         기본값(objectBoundingBox)이면 가로·세로 직선은 바운딩 박스가
         납작해 그라디언트가 무너지고 획이 통째로 사라진다. -->
    <linearGradient id="cm_ink" gradientUnits="userSpaceOnUse"
                    x1="20" y1="14" x2="80" y2="146">
      <stop offset="0" stop-color="#c9240f"/>
      <stop offset="0.55" stop-color="#a81a08"/>
      <stop offset="1" stop-color="#7d1204"/>
    </linearGradient>
    <!-- 금 — 테두리는 가로·세로 직선이다. 여기도 반드시 userSpaceOnUse.
         기본값이면 획 하나짜리 바운딩 박스가 납작해져 금테가 사라진다. -->
    <linearGradient id="cm_gold" gradientUnits="userSpaceOnUse"
                    x1="8" y1="4" x2="92" y2="152">
      <stop offset="0" stop-color="#8a6408"/>
      <stop offset="0.3" stop-color="#f0d891"/>
      <stop offset="0.58" stop-color="#b8830e"/>
      <stop offset="1" stop-color="#7a5605"/>
    </linearGradient>
    <filter id="cm_glow" x="-30%" y="-25%" width="160%" height="150%">
      <feGaussianBlur stdDeviation="3.4"/>
    </filter>
    <filter id="cm_grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85 0.6" numOctaves="3" seed="5" result="t"/>
      <feColorMatrix in="t" type="saturate" values="0"/>
    </filter>
    <filter id="cm_brush" x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency="0.055 0.11" numOctaves="3" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="cm_lift" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="1.2" dy="3" stdDeviation="2.6" flood-color="#6b4a00" flood-opacity="0.32"/>
    </filter>
    <clipPath id="cm_clip"><rect x="5" y="4" width="90" height="148" rx="2.5"/></clipPath>
  </defs>

  ${halo}
  <g filter="url(#cm_lift)">
    <rect x="5" y="4" width="90" height="148" rx="2.5" fill="url(#cm_paper)"/>
  </g>
  <g clip-path="url(#cm_clip)">
    <rect x="5" y="4" width="90" height="148" filter="url(#cm_grain)" opacity="0.13"
          style="mix-blend-mode:multiply"/>
    <path d="M5 78 H95" stroke="rgba(150,100,0,0.14)" stroke-width="1.6"/>
  </g>
  <rect x="5" y="4" width="90" height="148" rx="2.5" fill="none"
        stroke="rgba(140,95,0,0.4)" stroke-width="0.9"/>
  <rect x="9" y="8" width="82" height="140" rx="1.5" fill="none"
        stroke="rgba(168,26,8,0.3)" stroke-width="0.8"/>
  ${gilt}

  <g filter="url(#cm_brush)" stroke="url(#cm_ink)" stroke-linecap="round"
     stroke-linejoin="round" fill="none">
    <g stroke-width="2.4">${CROWN[id]}</g>
    <g stroke-width="3.6">${BODY[id]}</g>
  </g>

  <g transform="translate(0 6)">
    <rect x="36" y="112" width="28" height="28" rx="1.5" fill="${sealFill}"
          stroke="url(#cm_ink)" stroke-width="${sealWidth}"/>
    <text x="50" y="131" text-anchor="middle" font-size="12.5" fill="${sealInk}"
          font-family="'Noto Serif KR',serif"${deep ? ' font-weight="600"' : ""}>${seal}</text>
  </g>
</svg>`;
  return uid ? svg.replace(/cm_([a-z]+)/g, `cm_$1_${uid}`) : svg;
}
