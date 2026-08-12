// ────────────────────────────────────────────────────────────────
// 만다라 도형 — 빈틈 없이 맞물리는 문양 만들기.
//
// 핵심 원리: 이웃한 두 조각은 "같은 함수가 만든 같은 점들"로 경계를 나눈다.
//  · 고리와 고리 사이의 경계(원·물결·별·다각)는 GRID(2.5°)로 나눈 절대 각도
//    위에만 점을 찍는다 — 안쪽 고리와 바깥 고리의 칸 수·회전이 달라도
//    두 폴리라인이 정확히 같은 점을 밟는다.
//  · 조각과 조각 사이의 살(radial edge)은 edgePoints() 하나로만 그린다.
// 그래서 어떤 모양을 쓰든 틈이나 겹침이 생기지 않는다 — 모든 칸이 칠해진다.
//
// 문양을 새로 짤 때의 약속 (어기면 개발 중에 콘솔로 일러 준다)
//  · 칸 수 n 은 144 의 약수(6·8·9·12·16·18·24·36·48·72), 회전 rot 은 2.5° 배수
//    — 칸의 경계 각이 GRID 위에 얹혀야 이음매가 정확히 맞는다
//  · petal 모드는 n 이 짝수여야 마지막 칸과 첫 칸의 살이 이어진다
//  · 경계의 waves 는 그 경계를 맞물고 있는 고리의 n 을 나눠야 꼭짓점이 살에 얹힌다
// ────────────────────────────────────────────────────────────────

export const C = 100; // 중심 좌표 (viewBox 200×200)

const GRID = 2.5; // 경계 점을 찍는 절대 각도 격자 (도)

// 경계의 모양
//  circle  정원
//  sine    부드러운 물결
//  star    삼각파 — 꼭짓점이 뾰족한 별
//  polygon 정다각형 (waves = 변의 수, r = 외접원 반지름)
export type BoundaryShape = "circle" | "sine" | "star" | "polygon";

// 고리 사이의 경계 — 반지름이 각도에 따라 달라질 수 있다
export type Boundary = {
  r: number;
  shape?: BoundaryShape;
  waves?: number; // 물결·꼭짓점 개수
  amp?: number; // 깊이
  phase?: number; // 위상 (도)
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

// 경계의 반지름 — 각도에 따라 물결치거나 뾰족해진다.
// (검증 스크립트가 문양의 빈틈·겹침·칸 크기를 잴 때도 이 함수를 그대로 쓴다)
export function boundaryR(b: Boundary, aDeg: number): number {
  const shape: BoundaryShape = b.shape ?? (b.waves && b.amp ? "sine" : "circle");
  if (shape === "circle") return b.r;

  const n = b.waves && b.waves > 0 ? b.waves : 6;
  const amp = b.amp ?? 0;
  const a = (aDeg * Math.PI) / 180;
  const ph = ((b.phase ?? 0) * Math.PI) / 180;

  if (shape === "sine") return b.r + amp * Math.sin(n * a + ph);
  if (shape === "star") {
    // 삼각파 — sin 과 달리 마루가 뾰족하게 선다
    return b.r + amp * (2 / Math.PI) * Math.asin(Math.sin(n * a + ph));
  }
  // 정n각형의 극좌표식 — b.r 은 꼭짓점까지의 거리
  const seg = (2 * Math.PI) / n;
  const psi = ((((a + ph) % seg) + seg) % seg) - seg / 2;
  return (b.r * Math.cos(Math.PI / n)) / Math.cos(psi);
}

// 경계를 따라 a1 → a2 로 가는 점들.
// 안쪽 고리의 '바깥 경계'와 바깥쪽 고리의 '안쪽 경계'가 이 함수를 함께 쓴다.
// 중간 점은 오직 GRID 배수 각도에만 찍으므로, 두 고리의 칸 폭이 달라도
// 겹치는 구간에서 같은 점 좌표가 나온다.
function boundaryPoints(
  b: Boundary,
  a1: number,
  a2: number
): [number, number][] {
  const out: [number, number][] = [P(boundaryR(b, a1), a1)];
  const first = Math.floor(a1 / GRID) + 1;
  const last = Math.ceil(a2 / GRID) - 1;
  for (let i = first; i <= last; i++) {
    const a = i * GRID;
    if (a <= a1 + 1e-9 || a >= a2 - 1e-9) continue;
    out.push(P(boundaryR(b, a), a));
  }
  out.push(P(boundaryR(b, a2), a2));
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

// 살이 휘는 정도 — 오직 '살의 번호'에만 달려 있어야 이웃과 어긋나지 않는다.
// 휨이 칸 폭에 비해 크면 잎의 허리가 실오라기처럼 가늘어지므로 칸 폭의 1/4로 묶는다.
function bowOf(k: number, ring: Ring): number {
  const raw = ring.bow ?? 0;
  if (!raw) return 0;
  const limit = 360 / ring.n / 4;
  const amount = Math.min(Math.abs(raw), limit) * (raw < 0 ? -1 : 1);
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

const warned = new Set<string>();

// 문양이 위의 '약속'을 지키는지 개발 중에만 짚어 본다 (화면은 멈추지 않는다)
function checkTemplate(tpl: Template) {
  if (process.env.NODE_ENV === "production" || warned.has(tpl.key)) return;
  warned.add(tpl.key);
  const say = (m: string) => console.warn(`[만다라 ${tpl.key}] ${m}`);
  if (tpl.bounds.length !== tpl.rings.length + 1)
    say("경계 수가 고리 수 + 1 이 아닙니다");
  tpl.rings.forEach((ring, ri) => {
    const step = 360 / ring.n;
    const rot = ring.rot ?? 0;
    if (Math.abs(step / GRID - Math.round(step / GRID)) > 1e-9)
      say(`고리${ri}: n=${ring.n} 은 칸 경계가 ${GRID}° 격자에 얹히지 않습니다`);
    if (Math.abs(rot / GRID - Math.round(rot / GRID)) > 1e-9)
      say(`고리${ri}: rot=${rot}° 는 ${GRID}° 배수가 아닙니다`);
    if (ring.bowMode === "petal" && ring.n % 2 !== 0)
      say(`고리${ri}: petal 모드는 n 이 짝수여야 이음매가 맞습니다`);
    for (const b of [tpl.bounds[ri], tpl.bounds[ri + 1]]) {
      if (b?.waves && b.shape !== "circle" && ring.n % b.waves !== 0)
        say(`고리${ri}: 경계의 waves=${b.waves} 가 n=${ring.n} 을 나누지 못합니다`);
    }
  });
}

export function buildRegions(tpl: Template): Region[] {
  checkTemplate(tpl);
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

// ── 여섯 폭의 만다라 ────────────────────────────────────────────
// bounds 는 안에서 밖으로 이어지며, 앞 고리의 바깥 경계가 곧 다음 고리의 안쪽 경계다.
// (그래서 고리 사이에 칠할 수 없는 빈 띠가 생기지 않는다)
//
// 여섯 폭 모두 가운데 원 + 여섯 겹, 도합 일곱 층이다. 안쪽 겹은 6~12칸으로
// 큼직하게, 바깥으로 갈수록 잘게 나눠 최대 48칸까지 촘촘해진다.
// 칸은 손가락으로 짚을 수 있어야 하므로 어느 칸도 폭·두께가 viewBox 기준
// 11 단위(모바일 359px 화면에서 약 20px) 아래로 내려가지 않는다.
//
// 물결 진폭을 과감히 쓰면서도 칸이 실오라기가 되지 않게 하는 두 가지 요령:
//  · 이웃한 두 경계에 같은 waves·phase 를 주면 고리가 물결을 따라 함께 출렁여
//    두께가 거의 일정하다 — 진폭의 차만큼만 변한다.
//  · 물결 수를 두 배로 올려 넘어갈 때는 위상을 맞춰(phase_밖 − 2·phase_안 = −90°)
//    마루가 마루 위에 얹히게 한다 — 골끼리 어긋나 칸이 짓눌리는 일이 없다.

export const TEMPLATES: Template[] = [
  {
    // 겹연꽃 — 가운데 여섯 장의 큰 잎이 펑퍼짐하게 벌고, 물결 경계가
    // 잎끝을 그리며 여섯 겹으로 피어난다. 바깥 두 겹은 잔잎 스물넷.
    key: "lotus",
    name: "연화장",
    hanja: "蓮華藏",
    core: 12,
    bounds: [
      { r: 12 },
      { r: 30, shape: "sine", waves: 6, amp: 4, phase: -90 }, // 잎끝이 칸 한가운데
      { r: 43, shape: "sine", waves: 6, amp: 4, phase: -90 },
      { r: 56, shape: "sine", waves: 6, amp: 2.5, phase: -90 },
      { r: 69.5, shape: "sine", waves: 12, amp: 2, phase: 90 },
      { r: 82, shape: "sine", waves: 12, amp: 2, phase: 90 },
      { r: 95.5, shape: "sine", waves: 24, amp: 2.2, phase: 90 },
    ],
    rings: [
      { n: 6, bow: 11, bowMode: "petal" }, // 큰 잎 — 허리가 넉넉한 곡선
      { n: 12, rot: 15, bow: 4, bowMode: "petal" },
      { n: 12, bow: 6, bowMode: "petal" },
      { n: 24, rot: 7.5 },
      { n: 24, bow: 3, bowMode: "petal" },
      { n: 24, rot: 7.5, bow: 3, bowMode: "petal" },
    ],
  },
  {
    // 법륜 — 여덟 바퀴살의 굴대에서 삼각파 테가 겹겹이 번져 나가고,
    // 바깥 테는 마흔여덟 톱니로 잘게 나뉜다.
    key: "wheel",
    name: "법륜",
    hanja: "法輪",
    core: 13,
    bounds: [
      { r: 13 },
      { r: 28 },
      { r: 42.5, shape: "star", waves: 8, amp: 3, phase: 90 },
      { r: 56, shape: "star", waves: 8, amp: 3.5, phase: 90 },
      { r: 70, shape: "star", waves: 8, amp: 4, phase: 90 },
      { r: 84, shape: "star", waves: 24, amp: 1.5, phase: 90 },
      { r: 96.3, shape: "star", waves: 24, amp: 2, phase: 90 },
    ],
    rings: [
      { n: 8 },
      { n: 8, rot: 22.5 },
      { n: 16 },
      { n: 24, rot: 7.5 },
      { n: 24 },
      { n: 48 },
    ],
  },
  {
    // 육각화 — 정육각이 세 겹, 그 위로 십이각 두 겹, 맨 밖은 물결 테.
    // 안쪽 여섯 잎은 크게 벌어진다.
    key: "hexa",
    name: "육각화",
    hanja: "六角華",
    core: 12,
    bounds: [
      { r: 12 },
      { r: 30, shape: "polygon", waves: 6 },
      { r: 44, shape: "polygon", waves: 6 },
      { r: 58, shape: "polygon", waves: 6 },
      { r: 72, shape: "polygon", waves: 12 },
      { r: 86, shape: "polygon", waves: 12 },
      { r: 96.3, shape: "sine", waves: 12, amp: 2, phase: 90 },
    ],
    rings: [
      { n: 6, bow: 9, bowMode: "petal" },
      { n: 12, bow: 4, bowMode: "petal" },
      { n: 18 },
      { n: 24 },
      { n: 24, rot: 7.5 },
      { n: 36 },
    ],
  },
  {
    // 천불 — 아홉 굽이 물결이 두 배로 갈라지며 번진다. 아홉·아홉·열여덟…
    // 서른여섯까지, 감실이 촘촘히 늘어서는 구품(九品)의 배치.
    key: "thousand",
    name: "천불",
    hanja: "千佛",
    core: 11,
    bounds: [
      { r: 11 },
      { r: 26 },
      { r: 40, shape: "sine", waves: 9, amp: 2.5, phase: -90 },
      { r: 54, shape: "sine", waves: 9, amp: 2.5, phase: -90 },
      { r: 68, shape: "sine", waves: 18, amp: 2, phase: 90 },
      { r: 81, shape: "sine", waves: 18, amp: 2, phase: 90 },
      { r: 94.5, shape: "sine", waves: 18, amp: 2.8, phase: 90 },
    ],
    rings: [
      { n: 9 },
      { n: 9, rot: 20 },
      { n: 18 },
      { n: 18, rot: 10 },
      { n: 36 },
      { n: 36, rot: 5 },
    ],
  },
  {
    // 소용돌이 — 모든 살이 한쪽으로 휘어 도는 물레. 고리마다 시작각을
    // 조금씩 밀어 바람개비처럼 감긴다.
    key: "swirl",
    name: "소용돌이",
    hanja: "渦",
    core: 10,
    bounds: [
      { r: 10 },
      { r: 24 },
      { r: 38, shape: "sine", waves: 12, amp: 2, phase: -90 },
      { r: 52, shape: "sine", waves: 12, amp: 2, phase: -90 },
      { r: 66, shape: "sine", waves: 12, amp: 2.5, phase: -90 },
      { r: 80, shape: "sine", waves: 12, amp: 2.5, phase: -90 },
      { r: 94, shape: "sine", waves: 24, amp: 2.5, phase: 90 },
    ],
    rings: [
      { n: 8, bow: 11, bowMode: "swirl" },
      { n: 12, rot: 5, bow: 7.5, bowMode: "swirl" },
      { n: 12, rot: 12.5, bow: 7.5, bowMode: "swirl" },
      { n: 24, bow: 3.75, bowMode: "swirl" },
      { n: 24, rot: 7.5, bow: 3.75, bowMode: "swirl" },
      { n: 24, rot: 2.5, bow: 3.75, bowMode: "swirl" },
    ],
  },
  {
    // 별 — 여덟 갈래 삼각파 빛살이 여섯 겹으로 포개진다. 진폭을 과감히 줘
    // 뾰족함이 살아 있되, 이웃 경계와 위상을 맞춰 칸 두께는 일정하다.
    // 위상 90° 는 마루를 0°·45°… 에 세워, 꼭짓점이 칸의 살 위에 얹히게 한다.
    key: "star",
    name: "별",
    hanja: "星",
    core: 12,
    bounds: [
      { r: 12 },
      { r: 30, shape: "star", waves: 8, amp: 5, phase: 90 },
      { r: 43, shape: "star", waves: 8, amp: 5, phase: 90 },
      { r: 56, shape: "star", waves: 8, amp: 5.5, phase: 90 },
      { r: 69, shape: "star", waves: 8, amp: 5.5, phase: 90 },
      { r: 82, shape: "star", waves: 8, amp: 5, phase: 90 },
      { r: 93.8, shape: "star", waves: 8, amp: 4.5, phase: 90 },
    ],
    rings: [
      { n: 8, bow: 6, bowMode: "petal" },
      { n: 16 },
      { n: 24, rot: 7.5 },
      { n: 24 },
      { n: 24, rot: 7.5, bow: 2.5, bowMode: "petal" },
      { n: 24 },
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
