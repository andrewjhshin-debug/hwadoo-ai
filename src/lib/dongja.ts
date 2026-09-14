// ─────────────────────────────────────────────────────────────
// 나무(南無) — 화두의 동자승. 화두 캐릭터의 원본은 여기 하나뿐이다.
//
// 왜 동자승인가 —
// 경쟁 캐릭터(@kimbuddhaa)는 "부처", 곧 이미 깨달은 쪽에 서 있다.
// 화두는 반대편에 선다. 아직 답을 못 찾은 사람, 물음을 품고 사는 사람.
// 노란 얼굴·검은 나발은 그쪽 것이라 쓰지 않는다 — 미색 살결에 먹빛 승복.
//
// 입체(3D 렌더) 느낌을 SVG 로 —
// · 구면 그라디언트로 부피를 세우고, 좌상단 한 광원에서 빛이 온다.
// · 그림자 쪽 가장자리에 따뜻한 반사광(rim) — 배경에서 덩이를 떼어 놓는다.
// · 광택은 큰 소프트 하이라이트 + 작고 또렷한 스페큘러 두 겹.
// · 형태가 만나는 자리(귀·목·볼)에 흐린 어둠을 깔아 접합을 만든다.
// · 바닥에 접지 그림자 — 떠 있지 않고 놓여 있게.
//
// 귀여움은 비례에서 (유아 도식) —
// 눈이 크고 얼굴 한가운데보다 아래, 머리는 가로가 살짝 넓고, 몸은 어깨만.
// 24px 에서도 동그란 머리·큰 두 눈·금빛 물음표가 남는지로 검증한다.
// ─────────────────────────────────────────────────────────────

export type Mood = "default" | "tilt" | "bright" | "rest" | "joy" | "oops";

const DEFS = `<defs>
  <radialGradient id="dj_skin" cx="34%" cy="26%" r="76%">
    <stop offset="0" stop-color="#fffcf6"/>
    <stop offset="0.34" stop-color="#faeada"/>
    <stop offset="0.66" stop-color="#f0d5b4"/>
    <stop offset="0.86" stop-color="#d3a97a"/>
    <stop offset="0.97" stop-color="#b9835a"/>
    <stop offset="1" stop-color="#a5714b"/>
  </radialGradient>
  <radialGradient id="dj_ear" cx="34%" cy="28%" r="80%">
    <stop offset="0" stop-color="#f8e6d2"/>
    <stop offset="0.68" stop-color="#e0b78d"/>
    <stop offset="1" stop-color="#a5714b"/>
  </radialGradient>
  <linearGradient id="dj_robe" gradientUnits="userSpaceOnUse" x1="30" y1="98" x2="98" y2="128">
    <stop offset="0" stop-color="#6b6459"/>
    <stop offset="0.45" stop-color="#4a443b"/>
    <stop offset="1" stop-color="#2b2721"/>
  </linearGradient>
  <radialGradient id="dj_eye" cx="34%" cy="30%" r="78%">
    <stop offset="0" stop-color="#4a4038"/>
    <stop offset="0.5" stop-color="#2a231d"/>
    <stop offset="1" stop-color="#171310"/>
  </radialGradient>
  <linearGradient id="dj_gold" gradientUnits="userSpaceOnUse" x1="86" y1="2" x2="112" y2="40">
    <stop offset="0" stop-color="#ffeeb8"/>
    <stop offset="0.42" stop-color="#e5c069"/>
    <stop offset="1" stop-color="#9c6f1f"/>
  </linearGradient>
  <radialGradient id="dj_ground" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="rgba(60,40,20,0.34)"/>
    <stop offset="1" stop-color="rgba(60,40,20,0)"/>
  </radialGradient>
  <filter id="dj_blur" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="3.4"/>
  </filter>
  <filter id="dj_blur2" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="6.5"/>
  </filter>
  <filter id="dj_blur3" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="1.6"/>
  </filter>
  <filter id="dj_drop" x="-40%" y="-40%" width="180%" height="190%">
    <feDropShadow dx="1.6" dy="3" stdDeviation="3.4" flood-color="#7a4f28" flood-opacity="0.34"/>
  </filter>
  <clipPath id="dj_headclip">
    <ellipse cx="64" cy="62" rx="43" ry="40"/>
  </clipPath>
</defs>`;

// 바닥 접지 그림자 — 놓여 있다는 무게
const GROUND = `<ellipse cx="66" cy="124" rx="46" ry="7" fill="url(#dj_ground)" filter="url(#dj_blur2)"/>`;

// 물음표 — 오른쪽 위, 머리에 겹쳐 실루엣의 일부가 된다. 금속 광택 한 점.
const QMARK = `<g transform="translate(84 2) scale(1.04)">
  <path d="M4 10 A8.4 8.4 0 1 1 12.4 18.4 L12.4 22"
        fill="none" stroke="rgba(90,60,10,0.3)" stroke-width="7.6"
        stroke-linecap="round" stroke-linejoin="round" filter="url(#dj_blur3)"/>
  <path d="M4 10 A8.4 8.4 0 1 1 12.4 18.4 L12.4 22"
        fill="none" stroke="url(#dj_gold)" stroke-width="6.4"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6.4 6.6 A8 8 0 0 1 13.6 3.4"
        fill="none" stroke="rgba(255,252,235,0.75)" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12.4" cy="30" r="3.6" fill="url(#dj_gold)"/>
  <circle cx="11.2" cy="28.8" r="1.15" fill="rgba(255,252,235,0.8)"/>
</g>`;

// 승복 — 어깨만. 부피가 있는 덩이로.
const ROBE = `<g>
  <path d="M50 99 C33 105 23 116 20 128 L108 128 C105 116 95 105 78 99 Z"
        fill="url(#dj_robe)"/>
  <path d="M50 99 C33 105 23 116 20 128 L108 128 C105 116 95 105 78 99 Z"
        fill="none" stroke="rgba(255,240,215,0.16)" stroke-width="1.6"/>
  <path d="M55 101 L64 117 L73 101" fill="none" stroke="#f6efe0"
        stroke-width="6.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M52 100 C42 104 33 112 29 121" fill="none"
        stroke="rgba(255,240,215,0.2)" stroke-width="2.4" stroke-linecap="round" filter="url(#dj_blur3)"/>
</g>`;

// 머리 — 구(球). 귀는 뒤에 두고 접합에 그늘을 깐다.
function head(face: string, tilt = 0): string {
  const g = tilt ? ` transform="rotate(${tilt} 64 104)"` : "";
  return `<g${g}>
    <g filter="url(#dj_drop)">
      <ellipse cx="20" cy="68" rx="6.4" ry="8.8" fill="url(#dj_ear)"/>
      <ellipse cx="108" cy="68" rx="6.4" ry="8.8" fill="url(#dj_ear)"/>
      <ellipse cx="64" cy="62" rx="43" ry="40" fill="url(#dj_skin)"/>
    </g>
    <ellipse cx="64" cy="62" rx="43" ry="40" fill="none"
             stroke="rgba(150,100,60,0.42)" stroke-width="1.5"/>
    <g clip-path="url(#dj_headclip)">
      <ellipse cx="24" cy="68" rx="7" ry="9" fill="rgba(120,80,45,0.35)" filter="url(#dj_blur)"/>
      <ellipse cx="104" cy="68" rx="7" ry="9" fill="rgba(120,80,45,0.35)" filter="url(#dj_blur)"/>
      <path d="M96 84 C90 96 78 102 64 102" fill="none"
            stroke="rgba(255,214,160,0.5)" stroke-width="6" stroke-linecap="round" filter="url(#dj_blur)"/>
      <ellipse cx="46" cy="34" rx="19" ry="10" fill="rgba(255,255,255,0.62)"
               transform="rotate(-20 46 34)" filter="url(#dj_blur)"/>
      <ellipse cx="40" cy="30" rx="7" ry="3.6" fill="rgba(255,255,255,0.9)"
               transform="rotate(-20 40 30)" filter="url(#dj_blur3)"/>
    </g>
    ${face}
  </g>`;
}

// 볼 — 도톰하게, 흐리게 얹는다
const CHEEK = (o = 0.55) =>
  `<ellipse cx="31" cy="79" rx="9" ry="5.8" fill="#f09877" opacity="${o}" filter="url(#dj_blur)"/>
   <ellipse cx="97" cy="79" rx="9" ry="5.8" fill="#f09877" opacity="${o}" filter="url(#dj_blur)"/>`;

// 눈 — 반질한 검은 구슬. 소켓 그늘 + 큰 광점 + 작은 반사.
const EYES = (r = 9.6, cy = 72) => {
  const one = (cx: number) => `
    <ellipse cx="${cx}" cy="${cy + 1.4}" rx="${r * 1.06}" ry="${r * 0.96}" fill="rgba(150,105,65,0.3)" filter="url(#dj_blur)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dj_eye)"/>
    <circle cx="${cx - r * 0.31}" cy="${cy - r * 0.35}" r="${r * 0.34}" fill="#fff"/>
    <circle cx="${cx + r * 0.36}" cy="${cy + r * 0.38}" r="${r * 0.17}" fill="rgba(255,255,255,0.7)"/>
    <path d="M${cx - r * 0.72} ${cy + r * 0.52} A ${r} ${r} 0 0 0 ${cx + r * 0.5} ${cy + r * 0.82}"
          fill="none" stroke="rgba(255,225,190,0.42)" stroke-width="${r * 0.14}" stroke-linecap="round"/>`;
  return one(45) + one(83);
};

const FACES: Record<Mood, string> = {
  default: `${CHEEK()}
    ${EYES()}
    <path d="M58 89 Q64 93.6 70 89" fill="none" stroke="#2a231d" stroke-width="3" stroke-linecap="round"/>`,
  tilt: `${CHEEK()}
    <ellipse cx="45" cy="74.4" rx="8.2" ry="7.6" fill="rgba(150,105,65,0.28)" filter="url(#dj_blur)"/>
    <circle cx="45" cy="73" r="7.6" fill="url(#dj_eye)"/>
    <circle cx="42.6" cy="70.4" r="2.5" fill="#fff"/>
    <ellipse cx="83" cy="73.4" rx="10.4" ry="9.6" fill="rgba(150,105,65,0.28)" filter="url(#dj_blur)"/>
    <circle cx="83" cy="72" r="9.9" fill="url(#dj_eye)"/>
    <circle cx="79.9" cy="68.5" r="3.3" fill="#fff"/>
    <path d="M57 90.5 Q61.5 87.4 65.5 90 Q69.5 92.6 72 89.4" fill="none" stroke="#2a231d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  bright: `${CHEEK(0.7)}
    ${EYES(10.8, 71)}
    <path d="M55 87 Q64 98 73 87 Z" fill="#2a231d"/>
    <path d="M58 89.5 Q64 93.6 70 89.5" fill="#e8867e"/>`,
  rest: `${CHEEK(0.46)}
    <path d="M36 72 Q45 80.5 54 72" fill="none" stroke="#2a231d" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M74 72 Q83 80.5 92 72" fill="none" stroke="#2a231d" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M59 89.5 L69 89.5" fill="none" stroke="#2a231d" stroke-width="3" stroke-linecap="round"/>`,
  joy: `${CHEEK(0.76)}
    <path d="M36 76 Q45 65 54 76" fill="none" stroke="#2a231d" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 76 Q83 65 92 76" fill="none" stroke="#2a231d" stroke-width="4" stroke-linecap="round"/>
    <path d="M56 87 Q64 96.5 72 87 Z" fill="#2a231d"/>`,
  oops: `${CHEEK(0.64)}
    <circle cx="45" cy="72" r="4.8" fill="url(#dj_eye)"/>
    <circle cx="83" cy="72" r="4.8" fill="url(#dj_eye)"/>
    <circle cx="43.6" cy="70.6" r="1.5" fill="#fff"/>
    <circle cx="81.6" cy="70.6" r="1.5" fill="#fff"/>
    <ellipse cx="64" cy="90" rx="5" ry="6.2" fill="#2a231d"/>`,
};

// 환할 때 머리 둘레로 튀는 빛살
const SPARK = `<g stroke="url(#dj_gold)" stroke-width="3.6" stroke-linecap="round">
  <path d="M22 24 L15 17"/>
  <path d="M8 46 L0 44"/>
  <path d="M42 12 L40 4"/>
</g>`;

/**
 * 나무 한 장 — 표정을 골라 SVG 마크업을 받는다.
 * 한 화면에 여러 장을 놓을 때는 uid 를 달리 넘겨 id 충돌을 막는다.
 */
export function dongja(mood: Mood = "default", uid = ""): string {
  const tilt = mood === "tilt" ? -11 : 0;
  const svg = `<svg viewBox="0 0 128 128" class="dongja" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${DEFS}
  ${GROUND}
  ${mood === "bright" || mood === "joy" ? SPARK : ""}
  ${QMARK}
  ${ROBE}
  ${head(FACES[mood], tilt)}
</svg>`;
  return uid ? svg.replace(/dj_([a-z0-9]+)/g, `dj_$1_${uid}`) : svg;
}

/** 캐릭터 이름 — 南無(귀의한다) 이자 나무(木). 보리수 아래서 깨달았다. */
export const DONGJA_NAME = "나무";
