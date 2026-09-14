// ─────────────────────────────────────────────────────────────
// 두두(斗頭) — 화두의 동자승.
//
// 왜 동자승인가 —
// 경쟁 캐릭터(@kimbuddhaa)는 "부처", 곧 이미 깨달은 쪽에 서 있다.
// 화두는 반대편에 선다. 아직 답을 못 찾은 사람, 물음을 품고 사는 사람.
// "물음은 오래된 것, 답은 나의 것" 이라는 표어와 같은 자리다.
// 노란 얼굴·검은 나발은 그쪽 것이라 쓰지 않는다 — 미색 살결에 먹빛 승복.
//
// 작은 크기를 먼저 생각한 형태 —
// 머리가 화면을 크게 차지하고, 눈은 크고 단순하며, 물음표는 떠 있지 않고
// 실루엣 안(오른쪽 위)에 들어와 붙는다. 24px 에서도 "동그란 머리 + 두 눈
// + 금빛 물음표"가 남는다.
// ─────────────────────────────────────────────────────────────

export type Mood = "default" | "tilt" | "bright" | "rest";

const DEFS = `<defs>
  <linearGradient id="dj_skin" gradientUnits="userSpaceOnUse" x1="38" y1="40" x2="92" y2="108">
    <stop offset="0" stop-color="#fceeda"/>
    <stop offset="1" stop-color="#eaca9e"/>
  </linearGradient>
  <linearGradient id="dj_robe" gradientUnits="userSpaceOnUse" x1="34" y1="98" x2="96" y2="128">
    <stop offset="0" stop-color="#5f5850"/>
    <stop offset="1" stop-color="#3a352e"/>
  </linearGradient>
  <linearGradient id="dj_gold" gradientUnits="userSpaceOnUse" x1="84" y1="6" x2="110" y2="44">
    <stop offset="0" stop-color="#f0d896"/>
    <stop offset="0.55" stop-color="#d9b45b"/>
    <stop offset="1" stop-color="#a3762a"/>
  </linearGradient>
</defs>`;

// 승복 — 어깨만 보이는 상반신. 아래는 화면 밖으로 흘려보낸다.
const ROBE = `<g>
  <path d="M52 97 C36 103 25 115 22 128 L106 128 C103 115 92 103 76 97 Z"
        fill="url(#dj_robe)" stroke="#2f2b25" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M55 99 L64 117 L73 99" fill="none" stroke="#f0e6d2"
        stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;

// 물음표 — 오른쪽 위, 머리에 살짝 겹쳐 실루엣의 일부가 된다
const QMARK = `<g transform="translate(77 5) scale(1.18)">
  <path d="M4 10 A8.4 8.4 0 1 1 12.4 18.4 L12.4 22"
        fill="none" stroke="url(#dj_gold)" stroke-width="6"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12.4" cy="30" r="3.4" fill="url(#dj_gold)"/>
</g>`;

// 민머리 + 귀 — 표정만 갈아 끼운다
function head(face: string, tilt = 0): string {
  const g = tilt ? ` transform="rotate(${tilt} 64 104)"` : "";
  return `<g${g}>
    <ellipse cx="27" cy="76" rx="5.4" ry="7.6" fill="url(#dj_skin)" stroke="#7c5c3f" stroke-width="2.6"/>
    <ellipse cx="101" cy="76" rx="5.4" ry="7.6" fill="url(#dj_skin)" stroke="#7c5c3f" stroke-width="2.6"/>
    <circle cx="64" cy="70" r="35" fill="url(#dj_skin)" stroke="#7c5c3f" stroke-width="2.6"/>
    <ellipse cx="50" cy="47" rx="13" ry="6.5" fill="#ffffff" opacity="0.4" transform="rotate(-24 50 47)"/>
    ${face}
  </g>`;
}

const CHEEKS = (o = 0.42) =>
  `<ellipse cx="40" cy="84" rx="6.6" ry="4.4" fill="#e59a78" opacity="${o}"/>
   <ellipse cx="88" cy="84" rx="6.6" ry="4.4" fill="#e59a78" opacity="${o}"/>`;

// 표정 — 눈은 크고 단순하게, 작은 크기에서 제일 먼저 살아남는 부분이다
const FACES: Record<Mood, string> = {
  // 기본 — 물음을 품고 가만히 있는 얼굴
  default: `${CHEEKS()}
    <circle cx="51" cy="74" r="5.6" fill="#2b241e"/>
    <circle cx="77" cy="74" r="5.6" fill="#2b241e"/>
    <circle cx="53" cy="71.8" r="1.8" fill="#fff" opacity="0.85"/>
    <circle cx="79" cy="71.8" r="1.8" fill="#fff" opacity="0.85"/>
    <path d="M59 88 Q64 91.4 69 88" fill="none" stroke="#2b241e" stroke-width="2.8" stroke-linecap="round"/>`,
  // 갸웃 — 한쪽 눈을 작게, 입은 짧게 옆으로. 모르겠다는 얼굴
  tilt: `${CHEEKS()}
    <circle cx="51" cy="75" r="4.6" fill="#2b241e"/>
    <circle cx="77" cy="73.5" r="5.8" fill="#2b241e"/>
    <circle cx="79" cy="71.3" r="1.8" fill="#fff" opacity="0.85"/>
    <path d="M58.5 89.5 Q62 86.8 65.5 89.2 Q69 91.6 71.5 88.6" fill="none" stroke="#2b241e" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  // 환함 — 뭔가 스친 얼굴. 눈이 커지고 입이 열린다
  bright: `${CHEEKS(0.55)}
    <circle cx="51" cy="73.5" r="6.4" fill="#2b241e"/>
    <circle cx="77" cy="73.5" r="6.4" fill="#2b241e"/>
    <circle cx="53.2" cy="71" r="2.2" fill="#fff" opacity="0.9"/>
    <circle cx="79.2" cy="71" r="2.2" fill="#fff" opacity="0.9"/>
    <path d="M57.5 87 Q64 95.5 70.5 87 Z" fill="#2b241e"/>`,
  // 참선 — 눈을 감고 물음을 품는 얼굴
  rest: `${CHEEKS(0.35)}
    <path d="M45.5 74.5 Q51 79.5 56.5 74.5" fill="none" stroke="#2b241e" stroke-width="2.9" stroke-linecap="round"/>
    <path d="M71.5 74.5 Q77 79.5 82.5 74.5" fill="none" stroke="#2b241e" stroke-width="2.9" stroke-linecap="round"/>
    <path d="M60 88.5 L68 88.5" fill="none" stroke="#2b241e" stroke-width="2.8" stroke-linecap="round"/>`,
};

// 환할 때 머리 둘레로 튀는 빛살
const SPARK = `<g stroke="url(#dj_gold)" stroke-width="3.2" stroke-linecap="round">
  <path d="M31 30 L25 24"/>
  <path d="M20 50 L12 48"/>
  <path d="M46 18 L44 10"/>
</g>`;

/**
 * 두두 한 장 — 표정을 골라 SVG 마크업을 받는다.
 * id 충돌을 막으려면 uid 를 넘겨라(한 화면에 여러 장 놓을 때).
 */
export function dongja(mood: Mood = "default", uid = ""): string {
  const tilt = mood === "tilt" ? -10 : 0;
  const svg = `<svg viewBox="0 0 128 128" class="dongja" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${DEFS}
  ${mood === "bright" ? SPARK : ""}
  ${QMARK}
  ${ROBE}
  ${head(FACES[mood], tilt)}
</svg>`;
  return uid ? svg.replace(/dj_([a-z]+)/g, `dj_$1_${uid}`) : svg;
}

export const DONGJA_NAME = "두두";
