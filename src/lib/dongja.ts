// ─────────────────────────────────────────────────────────────
// 두두(斗頭) — 화두의 동자승. 화두 캐릭터의 원본은 여기 하나뿐이다.
//
// 왜 동자승인가 —
// 경쟁 캐릭터(@kimbuddhaa)는 "부처", 곧 이미 깨달은 쪽에 서 있다.
// 화두는 반대편에 선다. 아직 답을 못 찾은 사람, 물음을 품고 사는 사람.
// "물음은 오래된 것, 답은 나의 것" 이라는 표어와 같은 자리다.
// 노란 얼굴·검은 나발은 그쪽 것이라 쓰지 않는다 — 미색 살결에 먹빛 승복.
//
// 귀여움은 비례에서 나온다(유아 도식) —
// · 머리가 몸의 전부에 가깝다. 가로가 세로보다 살짝 넓어 통통하다.
// · 눈이 아주 크고, 얼굴 한가운데보다 아래에 붙는다. 이게 제일 큰 지렛대.
// · 볼이 도톰하고, 입과 코는 작게 아래로.
// · 밝은 바탕(#f2ead9)에서 살결이 묻히지 않도록 따뜻한 윤곽선을 남긴다.
//
// 작은 크기를 먼저 생각한 형태 —
// 24px 에서도 동그란 머리 · 큰 두 눈 · 금빛 물음표가 남는다.
// ─────────────────────────────────────────────────────────────

export type Mood = "default" | "tilt" | "bright" | "rest" | "joy" | "oops";

const LINE = "#8a6743"; // 따뜻한 윤곽 — 밝은 바탕에서도 형태를 지킨다
const DARK = "#2a231d"; // 눈·입

const DEFS = `<defs>
  <radialGradient id="dj_skin" cx="38%" cy="30%" r="78%">
    <stop offset="0" stop-color="#fdf2e2"/>
    <stop offset="0.62" stop-color="#f6e0c4"/>
    <stop offset="1" stop-color="#e6c49b"/>
  </radialGradient>
  <linearGradient id="dj_robe2" gradientUnits="userSpaceOnUse" x1="36" y1="104" x2="94" y2="128">
    <stop offset="0" stop-color="#615a50"/>
    <stop offset="1" stop-color="#3b352e"/>
  </linearGradient>
  <linearGradient id="dj_gold" gradientUnits="userSpaceOnUse" x1="86" y1="4" x2="112" y2="40">
    <stop offset="0" stop-color="#f2dc9e"/>
    <stop offset="0.55" stop-color="#d9b45b"/>
    <stop offset="1" stop-color="#a87c2e"/>
  </linearGradient>
</defs>`;

// 승복 — 어깨만 살짝. 머리가 주인공이라 몸은 받침에 가깝다.
const ROBE = `<g>
  <path d="M50 101 C34 106 24 116 21 128 L107 128 C104 116 94 106 78 101 Z"
        fill="url(#dj_robe2)" stroke="#2c2721" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M55 103 L64 118 L73 103" fill="none" stroke="#f2e9d6"
        stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;

// 물음표 — 오른쪽 위에서 머리에 겹쳐 실루엣의 일부가 된다
const QMARK = `<g transform="translate(84 3) scale(1.02)">
  <path d="M4 10 A8.4 8.4 0 1 1 12.4 18.4 L12.4 22"
        fill="none" stroke="url(#dj_gold)" stroke-width="6.4"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12.4" cy="30" r="3.6" fill="url(#dj_gold)"/>
</g>`;

// 민머리 + 귀 — 가로로 살짝 넓은 통통한 얼굴
function head(face: string, tilt = 0): string {
  const g = tilt ? ` transform="rotate(${tilt} 64 106)"` : "";
  return `<g${g}>
    <ellipse cx="18" cy="70" rx="6" ry="8.4" fill="url(#dj_skin)" stroke="${LINE}" stroke-width="2.8"/>
    <ellipse cx="110" cy="70" rx="6" ry="8.4" fill="url(#dj_skin)" stroke="${LINE}" stroke-width="2.8"/>
    <ellipse cx="64" cy="63" rx="44" ry="41" fill="url(#dj_skin)" stroke="${LINE}" stroke-width="2.8"/>
    <ellipse cx="45" cy="36" rx="15" ry="7.5" fill="#ffffff" opacity="0.5" transform="rotate(-22 45 36)"/>
    ${face}
  </g>`;
}

// 볼 — 도톰하게, 눈 바로 바깥에
const CHEEK = (o = 0.5) =>
  `<ellipse cx="30" cy="80" rx="8.4" ry="5.6" fill="#f0a184" opacity="${o}"/>
   <ellipse cx="98" cy="80" rx="8.4" ry="5.6" fill="#f0a184" opacity="${o}"/>`;

// 눈 한 쌍 — 크게, 얼굴 한가운데보다 아래에. 빛점은 왼쪽 위.
const EYES = (r = 9.4, cy = 73) =>
  `<circle cx="45" cy="${cy}" r="${r}" fill="${DARK}"/>
   <circle cx="83" cy="${cy}" r="${r}" fill="${DARK}"/>
   <circle cx="${45 - r * 0.3}" cy="${cy - r * 0.34}" r="${r * 0.33}" fill="#fff" opacity="0.95"/>
   <circle cx="${83 - r * 0.3}" cy="${cy - r * 0.34}" r="${r * 0.33}" fill="#fff" opacity="0.95"/>
   <circle cx="${45 + r * 0.34}" cy="${cy + r * 0.36}" r="${r * 0.16}" fill="#fff" opacity="0.6"/>
   <circle cx="${83 + r * 0.34}" cy="${cy + r * 0.36}" r="${r * 0.16}" fill="#fff" opacity="0.6"/>`;

const FACES: Record<Mood, string> = {
  // 기본 — 물음을 품고 가만히 바라보는 얼굴
  default: `${CHEEK()}
    ${EYES()}
    <path d="M58 90 Q64 94.4 70 90" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>`,
  // 갸웃 — 한쪽 눈이 작아지고 입이 삐죽. 모르겠다는 얼굴
  tilt: `${CHEEK()}
    <circle cx="45" cy="74" r="7.6" fill="${DARK}"/>
    <circle cx="83" cy="72.5" r="9.8" fill="${DARK}"/>
    <circle cx="42.5" cy="71.6" r="2.5" fill="#fff" opacity="0.95"/>
    <circle cx="80" cy="69.2" r="3.2" fill="#fff" opacity="0.95"/>
    <path d="M57 91.5 Q61.5 88.4 65.5 91 Q69.5 93.6 72 90.4" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 환함 — 뭔가 스쳤다. 눈이 커지고 입이 활짝
  bright: `${CHEEK(0.66)}
    ${EYES(10.6, 72)}
    <path d="M55 88 Q64 99 73 88 Z" fill="${DARK}"/>
    <path d="M57.5 90.5 Q64 94.5 70.5 90.5" fill="#f2938c" stroke="none"/>`,
  // 참선 — 눈을 감고 물음을 품는다
  rest: `${CHEEK(0.42)}
    <path d="M36 73 Q45 81.5 54 73" fill="none" stroke="${DARK}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M74 73 Q83 81.5 92 73" fill="none" stroke="${DARK}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M59 90.5 L69 90.5" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>`,
  // 기쁨 — 눈이 반달로 접힌다. 제일 귀여운 얼굴
  joy: `${CHEEK(0.72)}
    <path d="M36 77 Q45 66 54 77" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 77 Q83 66 92 77" fill="none" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M56 88 Q64 97.5 72 88 Z" fill="${DARK}"/>`,
  // 아차 — 눈이 점이 되고 입이 작게 벌어진다
  oops: `${CHEEK(0.6)}
    <circle cx="45" cy="73" r="4.6" fill="${DARK}"/>
    <circle cx="83" cy="73" r="4.6" fill="${DARK}"/>
    <ellipse cx="64" cy="91" rx="5" ry="6" fill="${DARK}"/>`,
};

// 환할 때 머리 둘레로 튀는 빛살
const SPARK = `<g stroke="url(#dj_gold)" stroke-width="3.6" stroke-linecap="round">
  <path d="M22 26 L15 19"/>
  <path d="M9 48 L1 46"/>
  <path d="M42 14 L40 6"/>
</g>`;

/**
 * 두두 한 장 — 표정을 골라 SVG 마크업을 받는다.
 * 한 화면에 여러 장을 놓을 때는 uid 를 달리 넘겨 id 충돌을 막는다.
 */
export function dongja(mood: Mood = "default", uid = ""): string {
  const tilt = mood === "tilt" ? -11 : 0;
  const svg = `<svg viewBox="0 0 128 128" class="dongja" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${DEFS}
  ${mood === "bright" || mood === "joy" ? SPARK : ""}
  ${QMARK}
  ${ROBE}
  ${head(FACES[mood], tilt)}
</svg>`;
  return uid ? svg.replace(/dj_([a-z0-9]+)/g, `dj_$1_${uid}`) : svg;
}

export const DONGJA_NAME = "두두";
