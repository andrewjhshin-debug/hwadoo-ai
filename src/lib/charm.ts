// ─────────────────────────────────────────────────────────────
// 부적(符籍) — 수행하다 얻는 노란 종이. 도량 벽에 건다.
//
// 파는 물건이 아니다. 무언가를 해내면 그 자리에서 주어진다 —
// 백팔배를 마치면 정진부, 첫 회향에 회향부, 인연에 글을 올리면 인연부.
// 사고파는 순간 기복(祈福) 장사가 되므로, 얻는 것으로만 둔다.
//
// 그림은 SVG 로 그린다 — 황지(黃紙)에 주사(朱砂) 붉은 글씨.
// 실제 부적의 전서체를 흉내 내되 뜻이 있는 글자는 쓰지 않는다.
// ─────────────────────────────────────────────────────────────

export const CHARMS_KEY = "hwadu.charms.v1";
export const CHARMS_EVENT = "hwadu-charms-updated";

export type CharmId =
  | "jeongjin" // 정진부 — 백팔배를 마치다
  | "hoehyang" // 회향부 — 공덕을 남에게 돌리다
  | "inyeon" // 인연부 — 인연에 글을 올리다
  | "ansim" // 안심부 — 호흡 명상을 마치다
  | "unryeok" // 운력부 — 울력·봉사에 나서다
  | "cheonli"; // 천리부 — 절을 다녀오다

export type Charm = {
  id: CharmId;
  name: string; // 정진부
  hanja: string; // 精進符
  wish: string; // 이 부적이 비는 것
  how: string; // 어떻게 얻는가
};

export const CHARMS: Charm[] = [
  {
    id: "jeongjin",
    name: "정진부",
    hanja: "精進符",
    wish: "게으름을 물리치고 끝까지 가게",
    how: "백팔배를 한 번 마치면",
  },
  {
    id: "hoehyang",
    name: "회향부",
    hanja: "廻向符",
    wish: "쌓은 것이 남에게 흘러가게",
    how: "공덕을 처음 회향하면",
  },
  {
    id: "inyeon",
    name: "인연부",
    hanja: "因緣符",
    wish: "닿을 사람과 닿게",
    how: "인연에 글을 올리면",
  },
  {
    id: "ansim",
    name: "안심부",
    hanja: "安心符",
    wish: "마음이 흔들리지 않게",
    how: "호흡 명상을 한 판 마치면",
  },
  {
    id: "unryeok",
    name: "운력부",
    hanja: "運力符",
    wish: "몸으로 짓는 복이 쌓이게",
    how: "울력·봉사에 나서면",
  },
  {
    id: "cheonli",
    name: "천리부",
    hanja: "千里符",
    wish: "가는 길이 무탈하게",
    how: "절을 다녀오면",
  },
];

export const CHARM_BY_ID: Record<CharmId, Charm> = Object.fromEntries(
  CHARMS.map((c) => [c.id, c])
) as Record<CharmId, Charm>;

/** 가진 부적 — 얻은 시각을 함께 적는다 */
export type CharmLedger = Partial<Record<CharmId, number>>;

export function loadCharms(): CharmLedger {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHARMS_KEY);
    const p = raw ? (JSON.parse(raw) as unknown) : null;
    if (!p || typeof p !== "object") return {};
    const valid = new Set(CHARMS.map((c) => c.id));
    const out: CharmLedger = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (valid.has(k as CharmId) && typeof v === "number") out[k as CharmId] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * 부적을 얻는다. 이미 가진 것이면 아무 일도 없다(true 를 돌려주지 않는다) —
 * 화면이 "새로 얻었다"를 띄울지 판단할 수 있게.
 */
export function grantCharm(id: CharmId): boolean {
  if (typeof window === "undefined") return false;
  const l = loadCharms();
  if (l[id]) return false;
  l[id] = Date.now();
  try {
    window.localStorage.setItem(CHARMS_KEY, JSON.stringify(l));
    window.dispatchEvent(new CustomEvent(CHARMS_EVENT, { detail: id }));
  } catch {
    return false;
  }
  return true;
}

export function hasCharm(id: CharmId): boolean {
  return !!loadCharms()[id];
}

// ── 그림 — 황지에 주사 ─────────────────────────────────────────
// 부적마다 획이 달라야 하므로 id 로 붓질을 갈라 그린다.
// 뜻이 있는 글자는 쓰지 않는다 — 부적 특유의 전서체 느낌만 낸다.

const GLYPH: Record<CharmId, string> = {
  // 곧게 뻗는 획 — 멈추지 않는 걸음
  jeongjin: `<path d="M34 30 H66"/><path d="M50 30 V74"/>
    <path d="M36 50 H64"/><path d="M40 88 L50 74 L60 88"/>
    <path d="M38 104 H62"/>`,
  // 돌아 나가는 획 — 안에서 밖으로
  hoehyang: `<path d="M50 28 C30 40 30 62 50 62 C70 62 70 84 50 96"/>
    <path d="M34 32 H66"/><path d="M36 100 H64"/>
    <circle cx="50" cy="62" r="6" fill="none"/>`,
  // 두 획이 만나 매듭 — 닿음
  inyeon: `<path d="M36 30 C36 56 64 56 64 30"/>
    <path d="M36 100 C36 74 64 74 64 100"/>
    <path d="M50 52 V78"/><path d="M40 65 H60"/>`,
  // 가라앉는 획 — 고요
  ansim: `<path d="M32 34 H68"/><path d="M50 34 V70"/>
    <path d="M38 70 C44 82 56 82 62 70"/>
    <path d="M42 96 H58"/>`,
  // 벌린 획 — 몸으로 짓는 힘
  unryeok: `<path d="M50 26 V60"/><path d="M30 44 L50 60 L70 44"/>
    <path d="M34 74 H66"/><path d="M40 74 L34 102"/><path d="M60 74 L66 102"/>`,
  // 길게 뻗는 획 — 먼 길
  cheonli: `<path d="M34 32 H66"/><path d="M50 32 V102"/>
    <path d="M34 56 C42 68 58 68 66 56"/>
    <path d="M38 86 H62"/>`,
};

/** 부적 한 장 — 노란 종이에 붉은 획. uid 로 id 충돌을 막는다. */
export function charmSvg(id: CharmId, uid = ""): string {
  const c = CHARM_BY_ID[id];
  const svg = `<svg viewBox="0 0 100 150" class="charm" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cm_paper" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#ffe14f"/>
      <stop offset="0.5" stop-color="#f5cf2c"/>
      <stop offset="1" stop-color="#e0b41c"/>
    </linearGradient>
    <filter id="cm_ink" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6"/>
    </filter>
    <filter id="cm_shadow" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="1" dy="2.5" stdDeviation="2.4" flood-color="#7a5a00" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g filter="url(#cm_shadow)">
    <rect x="6" y="4" width="88" height="142" rx="3" fill="url(#cm_paper)"/>
    <rect x="6" y="4" width="88" height="142" rx="3" fill="none" stroke="rgba(160,110,0,0.35)" stroke-width="1"/>
  </g>
  <g filter="url(#cm_ink)" stroke="#b3200f" stroke-width="3.4" stroke-linecap="round"
     stroke-linejoin="round" fill="none">
    ${GLYPH[id]}
  </g>
  <text x="50" y="130" text-anchor="middle" font-size="13" fill="#b3200f"
        font-family="'Noto Serif KR',serif" letter-spacing="1">${c.hanja.slice(0, 2)}</text>
</svg>`;
  return uid ? svg.replace(/cm_([a-z]+)/g, `cm_$1_${uid}`) : svg;
}
