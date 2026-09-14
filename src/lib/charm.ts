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

// ── 등급 ────────────────────────────────────────────────────
// 아미타 구품(九品)에서 셋만 빌린다. 같은 부적이라도 어떻게 해냈느냐가
// 종이에 남는다 — 그래야 한 번 얻고 끝내지 않고 다시 한다.

export type CharmGrade = "ha" | "jung" | "sang";

export type Grade = {
  key: CharmGrade;
  name: string; // 하품
  hanja: string; // 下品
  say: string; // 화면에 그대로 놓는 한 마디
};

export const GRADE: Record<CharmGrade, Grade> = {
  ha: { key: "ha", name: "하품", hanja: "下品", say: "해냈어요" },
  jung: { key: "jung", name: "중품", hanja: "中品", say: "잘 해냈어요" },
  sang: { key: "sang", name: "상품", hanja: "上品", say: "흠 없이 해냈어요" },
};

/** 낮은 것부터 — 훑어 그릴 때 쓴다 */
export const GRADES: Grade[] = [GRADE.ha, GRADE.jung, GRADE.sang];

// 오르는 순서. 내려가는 일은 없다.
const RANK: Record<CharmGrade, number> = { ha: 0, jung: 1, sang: 2 };

/** 둘 가운데 높은 쪽 */
export function higherGrade(a: CharmGrade, b: CharmGrade): CharmGrade {
  return RANK[b] > RANK[a] ? b : a;
}

function isGrade(v: unknown): v is CharmGrade {
  return v === "ha" || v === "jung" || v === "sang";
}

// ── 장부 ────────────────────────────────────────────────────

/** 서랍에 담기는 한 칸 — 처음 얻은 시각과 지금 등급 */
export type CharmEntry = { at: number; grade: CharmGrade };

/**
 * 얻은 시각만 보는 장부. 이름과 꼴을 옛 그대로 둔다 —
 * 화면 여러 곳이 값을 number 로 받고 있어서, 여기를 넓히면 그쪽이 깨진다.
 * 등급까지 보려면 loadCharmBook() 을 쓴다.
 */
export type CharmLedger = Partial<Record<CharmId, number>>;

/** 등급까지 담은 장부 */
export type CharmBook = Partial<Record<CharmId, CharmEntry>>;

/**
 * 서랍 한 칸을 읽는다.
 * 옛 장부는 값이 number(얻은 시각) 하나뿐이었다 — 그건 하품으로 읽는다.
 * 그래야 이미 쌓인 장부가 등급을 얹는 순간 통째로 날아가지 않는다.
 */
function readEntry(v: unknown): CharmEntry | null {
  if (typeof v === "number" && Number.isFinite(v)) return { at: v, grade: "ha" };
  if (v && typeof v === "object") {
    const o = v as { at?: unknown; grade?: unknown };
    if (typeof o.at === "number" && Number.isFinite(o.at)) {
      return { at: o.at, grade: isGrade(o.grade) ? o.grade : "ha" };
    }
  }
  return null;
}

/** 가진 부적 — 등급까지 */
export function loadCharmBook(): CharmBook {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHARMS_KEY);
    const p = raw ? (JSON.parse(raw) as unknown) : null;
    if (!p || typeof p !== "object") return {};
    const valid = new Set<string>(CHARMS.map((c) => c.id));
    const out: CharmBook = {};
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      if (!valid.has(k)) continue;
      const e = readEntry(v);
      if (e) out[k as CharmId] = e;
    }
    return out;
  } catch {
    return {};
  }
}

/** 가진 부적 — 얻은 시각만. 옛 호출부가 이 꼴로 읽는다. */
export function loadCharms(): CharmLedger {
  const out: CharmLedger = {};
  for (const [k, e] of Object.entries(loadCharmBook())) {
    if (e) out[k as CharmId] = e.at;
  }
  return out;
}

/**
 * 부적을 얻는다. 인자 하나로 부르면 하품 — 옛 호출부가 그대로 돈다.
 * 이미 가진 것이라도 더 높은 등급이면 종이를 올려 준다.
 * 새로 얻었거나 등급이 올랐을 때만 true — 화면이 "새로 얻었다"를 띄울 수 있게.
 */
export function grantCharm(id: CharmId, grade: CharmGrade = "ha"): boolean {
  if (typeof window === "undefined") return false;
  const book = loadCharmBook();
  const had = book[id];
  if (had && RANK[grade] <= RANK[had.grade]) return false;
  // 등급이 올라도 처음 얻은 시각은 그대로 둔다 — 그날이 기록이다.
  book[id] = { at: had?.at ?? Date.now(), grade };
  try {
    window.localStorage.setItem(CHARMS_KEY, JSON.stringify(book));
    window.dispatchEvent(new CustomEvent(CHARMS_EVENT, { detail: id }));
  } catch {
    return false;
  }
  return true;
}

export function hasCharm(id: CharmId): boolean {
  return !!loadCharmBook()[id];
}

/** 가진 등급. 아직 없으면 하품으로 친다 — 가졌는지는 hasCharm 으로 가른다. */
export function gradeOf(id: CharmId): CharmGrade {
  return loadCharmBook()[id]?.grade ?? "ha";
}

// ── 그림 ────────────────────────────────────────────────────
// 실제 그리는 일은 charmArt.ts 가 맡는다 — 관·본문·봉인의 삼단.

import { renderCharm } from "./charmArt";

/**
 * 부적 한 장. 한 화면에 여러 장이면 uid 를 달리 준다.
 * 등급은 받은 대로만 그린다 — 여기서 서랍을 뒤지면 서버가 그린 첫 그림과
 * 어긋나 하이드레이션이 깨진다. 가진 등급을 그리려면 붙고 난 뒤(useEffect)
 * gradeOf 로 꺼내 넘겨라.
 */
export function charmSvg(id: CharmId, uid = "", grade: CharmGrade = "ha"): string {
  return renderCharm(id, CHARM_BY_ID[id].hanja.slice(0, 1), uid, grade);
}
