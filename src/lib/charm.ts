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
  | "cheonli" // 천리부 — 절을 다녀오다
  | "yeomsong"; // 염송부 — 경전을 외우다

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
    id: "yeomsong",
    name: "염송부",
    hanja: "念誦符",
    wish: "외운 말이 몸에 남게",
    how: "경전을 외워 치면",
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

// ── 그림 ────────────────────────────────────────────────────
// 실제 그리는 일은 charmArt.ts 가 맡는다 — 관·본문·봉인의 삼단.

import { renderCharm } from "./charmArt";

/** 부적 한 장. 한 화면에 여러 장이면 uid 를 달리 준다. */
export function charmSvg(id: CharmId, uid = ""): string {
  return renderCharm(id, CHARM_BY_ID[id].hanja.slice(0, 1), uid);
}
