// ────────────────────────────────────────────────────────────────
// 만다라 도형 — 빈틈 없이 맞물리는 문양 만들기.
//
// 핵심 원리: 이웃한 두 조각은 "같은 함수가 만든 같은 점들"로 경계를 나눈다.
//  · 고리와 고리 사이의 경계(원/물결)는 boundaryPoints() 하나로만 그린다
//  · 조각과 조각 사이의 살(radial edge)은 edgePoints() 하나로만 그린다
// 그래서 어떤 모양을 쓰든 틈이나 겹침이 생기지 않는다 — 모든 칸이 칠해진다.
// ────────────────────────────────────────────────────────────────

export const C = 100; // 중심 좌표 (viewBox 200×200)

// 고리 사이의 경계 — 반지름에 물결을 줄 수 있다
export type Boundary = {
  r: number;
  waves?: number; // 물결 개수 (0이면 정원)
  amp?: number; // 물결 깊이
  phase?: number; // 물결 위상 (도)
};

// 조각의 살이 휘는 방식
export type BowMode = "straight" | "petal" | "swirl";

export type Ring = {
  n: number; // 조각 수
  rot?: number; // 시작 각도 (도)
  bow?: number; // 살이 휘는 정도 (도)
  bowMode?: BowMode;
};

export type Template = {
  key: string;
  name: string;
  hanja: string;
  core: number; // 한가운데 원의 반지름
  bounds: Boundary[]; // 경계들 (안→밖), 길이 = rings.length + 1
  rings: Ring[];
};

export type Region = {
  id: string;
  d: string;
  cx: number; // 무게중심 (모래 효과용)
  cy: number;
};

// ── 좌표 ────────────────────────────────────────────────────────

function P(r: number, aDeg: number): [number, number] {
  const a = (aDeg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

// 경계의 반지름 — 각도에 따라 물결친다
function boundaryR(b: Boundary, aDeg: number): number {
  if (!b.waves || !b.amp) return b.r;
  return (
    b.r + b.amp * Math.sin(((b.waves * aDeg + (b.phase ?? 0)) * Math.PI) / 180)
  );
}

// 경계를 따라 a1 → a2 로 가는 점들.
// 안쪽 고리의 '바깥 경계'와 바깥쪽 고리의 '안쪽 경계'가 이 함수를 함께 쓴다.
function boundaryPoints(
  b: Boundary,
  a1: number,
  a2: number
): [number, number][] {
  const span = Math.abs(a2 - a1);
  const steps = Math.max(4, Math.ceil(span / 2.5));
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a1 + ((a2 - a1) * i) / steps;
    out.push(P(boundaryR(b, a), a));
  }
  return out;
}

// 살(조각과 조각 사이의 선) — 안쪽 경계에서 바깥 경계로.
// 한 조각의 오른쪽 살과 이웃 조각의 왼쪽 살이 이 함수를 함께 쓴다.
function edgePoints(
  bi: Boundary,
  bo: Boundary,
  aDeg: number,
  bow: number
): [number, number][] {
  const r1 = boundaryR(bi, aDeg);
  const r2 = boundaryR(bo, aDeg);
  const steps = bow === 0 ? 1 : 10;
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = r1 + (r2 - r1) * t;
    // 가운데가 가장 많이 휘고, 양 끝은 정확히 경계에 닿는다
    const da = bow * Math.sin(Math.PI * t);
    out.push(P(r, aDeg + da));
  }
  return out;
}

function toPath(points: [number, number][]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
}

// 살이 휘는 정도 — 오직 '살의 번호'에만 달려 있어야 이웃과 어긋나지 않는다
function bowOf(k: number, ring: Ring): number {
  const amount = ring.bow ?? 0;
  if (!amount) return 0;
  switch (ring.bowMode ?? "straight") {
    case "petal":
      return k % 2 === 0 ? amount : -amount; // 뾰족잎·둥근잎이 번갈아
    case "swirl":
      return amount; // 모두 한쪽으로 — 소용돌이
    default:
      return 0;
  }
}

// ── 문양 만들기 ──────────────────────────────────────────────────

export function buildRegions(tpl: Template): Region[] {
  const out: Region[] = [];

  // 한가운데 원
  const cr = tpl.core;
  out.push({
    id: `${tpl.key}-core`,
    d: `M${C - cr} ${C} a${cr} ${cr} 0 1 0 ${cr * 2} 0 a${cr} ${cr} 0 1 0 ${-cr * 2} 0 Z`,
    cx: C,
    cy: C,
  });

  tpl.rings.forEach((ring, ri) => {
    const bi = tpl.bounds[ri];
    const bo = tpl.bounds[ri + 1];
    const step = 360 / ring.n;
    const rot = ring.rot ?? 0;

    for (let k = 0; k < ring.n; k++) {
      const a1 = rot + step * k;
      const a2 = rot + step * (k + 1);
      // 이웃과 공유하는 살 — k번 살과 k+1번 살
      const e1 = edgePoints(bi, bo, a1, bowOf(k, ring));
      const e2 = edgePoints(bi, bo, a2, bowOf(k + 1, ring));
      const inner = boundaryPoints(bi, a1, a2);
      const outer = boundaryPoints(bo, a1, a2);

      // 안쪽 시작점 → 살1 타고 바깥 → 바깥 경계 → 살2 타고 안쪽 → 안쪽 경계로 돌아옴
      const ring1 = [...e1, ...outer.slice(1), ...[...e2].reverse().slice(1)];
      const back = [...inner].reverse().slice(1);
      const d = `${toPath([...ring1, ...back])} Z`;

      const [mx, my] = P(
        (boundaryR(bi, (a1 + a2) / 2) + boundaryR(bo, (a1 + a2) / 2)) / 2,
        (a1 + a2) / 2
      );
      out.push({ id: `${tpl.key}-r${ri}-${k}`, d, cx: mx, cy: my });
    }
  });

  return out;
}

// ── 다섯 폭의 만다라 ────────────────────────────────────────────
// bounds 는 안에서 밖으로 이어지며, 앞 고리의 바깥 경계가 곧 다음 고리의 안쪽 경계다.
// (그래서 고리 사이에 칠할 수 없는 빈 띠가 생기지 않는다)

export const TEMPLATES: Template[] = [
  {
    key: "lotus",
    name: "연화장",
    hanja: "蓮華藏",
    core: 11,
    bounds: [
      { r: 11 },
      { r: 27 },
      { r: 38 },
      { r: 56 },
      { r: 68 },
      { r: 82 },
      { r: 96, waves: 24, amp: 3 },
    ],
    rings: [
      { n: 8, bow: 7, bowMode: "petal" },
      { n: 16, rot: 11.25 },
      { n: 12, bow: 8, bowMode: "petal" },
      { n: 24, rot: 7.5 },
      { n: 24, bow: 5, bowMode: "petal" },
      { n: 48, rot: 3.75 },
    ],
  },
  {
    key: "wheel",
    name: "법륜",
    hanja: "法輪",
    core: 9,
    bounds: [
      { r: 9 },
      { r: 20 },
      { r: 30 },
      { r: 44 },
      { r: 58 },
      { r: 70 },
      { r: 84 },
      { r: 96 },
    ],
    rings: [
      { n: 8 },
      { n: 8, rot: 22.5 },
      { n: 16 },
      { n: 16, rot: 11.25 },
      { n: 32 },
      { n: 32, rot: 5.625 },
      { n: 64 },
    ],
  },
  {
    key: "hexa",
    name: "육각화",
    hanja: "六角華",
    core: 12,
    bounds: [
      { r: 12 },
      { r: 30, waves: 6, amp: 2.5 },
      { r: 46 },
      { r: 60, waves: 12, amp: 2 },
      { r: 76 },
      { r: 96, waves: 6, amp: 4 },
    ],
    rings: [
      { n: 6, bow: 9, bowMode: "petal" },
      { n: 12, rot: 15 },
      { n: 18, bow: 6, bowMode: "petal" },
      { n: 36, rot: 5 },
      { n: 36, bow: 4, bowMode: "petal" },
    ],
  },
  {
    key: "thousand",
    name: "천불",
    hanja: "千佛",
    core: 7,
    bounds: [
      { r: 7 },
      { r: 17 },
      { r: 26 },
      { r: 36 },
      { r: 47 },
      { r: 58 },
      { r: 69 },
      { r: 80 },
      { r: 89 },
      { r: 97 },
    ],
    rings: [
      { n: 10 },
      { n: 20, rot: 9 },
      { n: 20 },
      { n: 30, rot: 6 },
      { n: 30 },
      { n: 40, rot: 4.5 },
      { n: 40 },
      { n: 60, rot: 3 },
      { n: 60 },
    ],
  },
  {
    key: "swirl",
    name: "소용돌이",
    hanja: "渦",
    core: 10,
    bounds: [
      { r: 10 },
      { r: 26 },
      { r: 42 },
      { r: 58 },
      { r: 74 },
      { r: 96, waves: 18, amp: 3 },
    ],
    rings: [
      { n: 12, bow: 10, bowMode: "swirl" },
      { n: 12, rot: 12, bow: 10, bowMode: "swirl" },
      { n: 18, rot: 6, bow: 8, bowMode: "swirl" },
      { n: 24, rot: 4, bow: 7, bowMode: "swirl" },
      { n: 36, rot: 2, bow: 5, bowMode: "swirl" },
    ],
  },
];

// ── 색 ──────────────────────────────────────────────────────────
// 오방색을 뿌리로, 단청과 자연의 빛깔을 더해 넓게 폈다.

export const PALETTE_GROUPS: { name: string; colors: string[] }[] = [
  {
    name: "오방",
    colors: ["#C1553B", "#5E7FB2", "#D9B45B", "#EDE6D4", "#2A2520"],
  },
  {
    name: "단청",
    colors: [
      "#8E2118",
      "#B0512F",
      "#E08A3C",
      "#E8C46A",
      "#3F6B4F",
      "#2D5D6B",
      "#3A4C82",
      "#6B4A7A",
    ],
  },
  {
    name: "꽃빛",
    colors: [
      "#E36A6A",
      "#D98CA6",
      "#C77BB0",
      "#F0A8C0",
      "#F3C8A0",
      "#F6E0A8",
      "#CFE3A0",
      "#A8D8C8",
    ],
  },
  {
    name: "물빛",
    colors: [
      "#6FB0C4",
      "#4E9E86",
      "#8CA36B",
      "#C9D66B",
      "#9AB8D9",
      "#B7A8D9",
      "#8A7E6B",
      "#5C5344",
    ],
  },
];

export const PALETTE: string[] = PALETTE_GROUPS.flatMap((g) => g.colors);
