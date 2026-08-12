// ────────────────────────────────────────────────────────────────
// 만다라 문양 엔진 — 모양 원시도형(꽃잎·아치·구슬·마름모·고리·궁)을
// 회전 대칭으로 겹겹이 쌓아 다섯 폭을 그린다.
//
//  · cell  = 색칠할 수 있는 닫힌 도형. 같은 key 를 나눠 가진 여러 path 는
//            한 붓에 함께 칠해진다 (구슬 묶음, 갈라진 테 등).
//  · decor = 칠할 수 없는 장식 선 — 꽃잎 속 작은 꽃잎, 잎맥, 점무늬, 밧줄 무늬.
//            cell 위에 얹혀 문양의 밀도를 낸다 (pointerEvents: none).
//  · nodes 는 그리는 순서 그대로다 — 뒤에 온 것이 위에 겹친다.
//    바깥 겹부터 그려 안쪽 겹이 그 위로 피어나게 한다. 겹침은 의도된 것.
// ────────────────────────────────────────────────────────────────

export const C = 100; // 중심 좌표 (viewBox 200×200)

export type MandalaNode =
  | { kind: "cell"; key: string; d: string; fillRule?: "evenodd" }
  | { kind: "decor"; d: string; w: number; fill?: boolean; opacity?: number };

export type Built = {
  nodes: MandalaNode[];
  cellKeys: string[]; // 논리 칸의 순서 있는 목록 (진행 표시용)
  seeds: Record<string, [number, number][]>; // key → 무게중심들 (모래 효과용)
};

export type Template = {
  key: string;
  name: string;
  hanja: string;
  build: (b: Builder) => void;
};

// ── 좌표 ────────────────────────────────────────────────────────

const rad = (d: number) => (d * Math.PI) / 180;
const f = (n: number) => {
  const s = n.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
};

// 극좌표 → 화면 좌표
function P(r: number, aDeg: number): [number, number] {
  const a = rad(aDeg);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

// 방사 좌표계 — aDeg 방향을 '바깥', 그 수직을 '옆'으로 삼는다 (궁·문에 씀)
function F(aDeg: number, out: number, side: number): [number, number] {
  const a = rad(aDeg);
  const ux = Math.cos(a), uy = Math.sin(a);
  return [C + ux * out - uy * side, C + uy * out + ux * side];
}

const pp = (p: [number, number]) => `${f(p[0])} ${f(p[1])}`;

function poly(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${pp(p)}`).join(" ") + " Z";
}

// ── 원시도형 ─────────────────────────────────────────────────────

// 꽃잎 — 밑동(r0, ±hw)에서 두 베지어가 끝점(r1)에서 만나는 진짜 꽃잎.
// tip: round = 둥근 잎, sharp = 연꽃처럼 뾰족한 잎. bulge = 허리의 살집.
export function petalD(
  a: number, r0: number, r1: number, hw: number,
  tip: "round" | "sharp" = "round", bulge = 1.18
): string {
  const L = r1 - r0;
  const b1 = P(r0, a - hw), b2 = P(r0, a + hw), t = P(r1, a);
  const mR = r0 + L * 0.32, mA = hw * bulge;
  const tR = tip === "round" ? r1 - L * 0.06 : r1 - L * 0.3;
  const tA = tip === "round" ? hw * 0.6 : hw * 0.22;
  const c1 = P(mR, a - mA), c2 = P(tR, a - tA);
  const c3 = P(tR, a + tA), c4 = P(mR, a + mA);
  return (
    `M${pp(b1)} C${pp(c1)} ${pp(c2)} ${pp(t)}` +
    ` C${pp(c3)} ${pp(c4)} ${pp(b2)}` +
    ` A${f(r0)} ${f(r0)} 0 0 0 ${pp(b1)} Z`
  );
}

// 아치(부채) — 안쪽 호 위에 반달처럼 부푼 지붕
export function archD(a: number, r0: number, r1: number, hw: number): string {
  const L = r1 - r0;
  const s1 = P(r0, a - hw), s2 = P(r0, a + hw), t = P(r1, a);
  const c1 = P(r0 + L * 0.55, a + hw * 1.02), c2 = P(r1, a + hw * 0.55);
  const c3 = P(r1, a - hw * 0.55), c4 = P(r0 + L * 0.55, a - hw * 1.02);
  return (
    `M${pp(s1)} A${f(r0)} ${f(r0)} 0 0 1 ${pp(s2)}` +
    ` C${pp(c1)} ${pp(c2)} ${pp(t)} C${pp(c3)} ${pp(c4)} ${pp(s1)} Z`
  );
}

// 마름모 — 안끝(r0)·바깥끝(r1)·양옆(rm, ±hw) 네 꼭짓점
export function diamondD(
  a: number, r0: number, r1: number, hw: number, mid = 0.5
): string {
  const rm = r0 + (r1 - r0) * mid;
  return poly([P(r0, a), P(rm, a - hw), P(r1, a), P(rm, a + hw)]);
}

// 고리 조각 — a1→a2, r0→r1 의 도넛 조각 (a2-a1 ≤ 180)
export function ringSegD(a1: number, a2: number, r0: number, r1: number): string {
  const la = a2 - a1 > 180 ? 1 : 0;
  return (
    `M${pp(P(r0, a1))} A${f(r0)} ${f(r0)} 0 ${la} 1 ${pp(P(r0, a2))}` +
    ` L${pp(P(r1, a2))} A${f(r1)} ${f(r1)} 0 ${la} 0 ${pp(P(r1, a1))} Z`
  );
}

// 원
export function circleD(r: number, cx = C, cy = C): string {
  return (
    `M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 1 ${f(cx + r)} ${f(cy)}` +
    ` A${f(r)} ${f(r)} 0 1 1 ${f(cx - r)} ${f(cy)} Z`
  );
}

// 사각 궁의 한 변 — 바깥 반변 so, 안쪽 반변 si 의 사다리꼴 (45° 이음)
export function gateSideD(a: number, so: number, si: number): string {
  return poly([F(a, so, -so), F(a, so, so), F(a, si, si), F(a, si, -si)]);
}

// 층계문(門) — 변의 한가운데서 밖으로 좁아지며 솟는 계단 문
export function gateD(a: number, rb: number, hws: number[], hs: number[]): string {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let r = rb;
  for (let i = 0; i < hws.length; i++) {
    left.push(F(a, r, -hws[i]));
    right.push(F(a, r, hws[i]));
    r += hs[i];
    left.push(F(a, r, -hws[i]));
    right.push(F(a, r, hws[i]));
  }
  return poly([...left, ...right.reverse()]);
}

// 선분 (decor 용)
function lineD(p1: [number, number], p2: [number, number]): string {
  return `M${pp(p1)} L${pp(p2)}`;
}

// ── 조립기 ───────────────────────────────────────────────────────

export class Builder {
  nodes: MandalaNode[] = [];
  private seedMap: Record<string, [number, number][]> = {};
  private order: string[] = [];
  constructor(private tk: string) {}

  cell(key: string, d: string, seed: [number, number], fillRule?: "evenodd") {
    const k = `${this.tk}-${key}`;
    this.nodes.push({ kind: "cell", key: k, d, fillRule });
    if (!this.seedMap[k]) {
      this.seedMap[k] = [];
      this.order.push(k);
    }
    this.seedMap[k].push(seed);
  }

  decor(d: string, w = 0.3, fill = false, opacity?: number) {
    this.nodes.push({ kind: "decor", d, w, fill, opacity });
  }

  // 구슬 무늬 — 윤곽 원 + 가운데 점 (decor)
  bead(x: number, y: number, r: number, dot = true) {
    this.decor(circleD(r, x, y), 0.28);
    if (dot) this.decor(circleD(Math.max(0.5, r * 0.32), x, y), 0, true);
  }

  // 고리 띠 — segs 조각을 group 개씩 한 칸으로 묶는다
  band(
    keyBase: string, r0: number, r1: number,
    segs: number, group: number, rot = 0
  ) {
    const step = 360 / segs;
    for (let k = 0; k < segs; k++) {
      const a1 = rot + k * step;
      this.cell(
        `${keyBase}${Math.floor(k / group)}`,
        ringSegD(a1, a1 + step, r0, r1),
        P((r0 + r1) / 2, a1 + step / 2)
      );
    }
  }

  // 구슬 점무늬 고리 (decor)
  beadRing(n: number, r: number, size: number, rot = 0, dot = true) {
    for (let k = 0; k < n; k++) {
      const [x, y] = P(r, rot + (k * 360) / n);
      this.bead(x, y, size, dot);
    }
  }

  done(): Built {
    return { nodes: this.nodes, cellKeys: this.order, seeds: this.seedMap };
  }
}

// n 갈래 회전 반복
function ring(n: number, rot: number, fn: (a: number, k: number) => void) {
  for (let k = 0; k < n; k++) fn(rot + (k * 360) / n, k);
}

// 중심 로제트 — 겹치는 둥근 꽃잎 두 겹 + 심(芯). 다섯 폭이 함께 쓴다.
function rosette(
  b: Builder, n: number, r1: number, r2: number, core: number,
  tip: "round" | "sharp" = "round"
) {
  ring(n, 0, (a, k) => {
    b.cell(`ro${k}`, petalD(a, core * 0.9, r1, 360 / n / 2 * 0.86, tip, 1.28), P((core + r1) / 2, a));
    b.decor(petalD(a, core * 0.9 + (r1 - core) * 0.16, r1 - (r1 - core) * 0.18, 360 / n / 2 * 0.46, tip, 1.2), 0.26);
  });
  ring(n, 180 / n, (a, k) => {
    b.cell(`ri${k}`, petalD(a, core * 0.7, r2, 360 / n / 2 * 0.72, tip, 1.28), P((core + r2) / 2, a));
  });
  b.cell("core", circleD(core), [C, C]);
  b.decor(circleD(core * 0.62), 0.3);
  b.decor(circleD(core * 0.2), 0, true);
}

// ── 다섯 폭 ──────────────────────────────────────────────────────

// 1. 연화 — 가운데 로제트에서 연꽃잎이 겹겹이 밖으로 펼쳐진다
function buildLotus(b: Builder) {
  // 맨 바깥 — 뾰족한 잎끝 열여섯
  ring(16, 0, (a, k) => {
    b.cell(`o${k}`, petalD(a, 71, 97, 10.5, "sharp", 1.2), P(84, a));
    b.decor(petalD(a, 74.5, 92.5, 5.6, "sharp", 1.15), 0.26);
    b.decor(lineD(P(76, a), P(88.5, a)), 0.24);
  });
  // 구슬 띠
  b.band("b", 65.5, 71.5, 16, 2);
  b.decor(circleD(65.5), 0.3);
  b.decor(circleD(71.5), 0.3);
  b.beadRing(32, 68.5, 2.0);
  // 뒤 연꽃잎 열둘
  ring(12, 15, (a, k) => {
    b.cell(`p${k}`, petalD(a, 38, 65.5, 15, "sharp", 1.22), P(53, a));
    b.decor(petalD(a, 41.5, 61, 8.4, "sharp", 1.18), 0.26);
    b.decor(lineD(P(43.5, a), P(57, a)), 0.24);
  });
  // 잎 사이 구슬
  ring(12, 0, (a) => {
    const [x, y] = P(61.5, a);
    b.decor(circleD(2.1, x, y), 0.26);
    b.decor(circleD(0.8, x, y), 0, true);
  });
  // 앞 연꽃잎 열둘 — 반 칸 돌려 겹친다
  ring(12, 0, (a, k) => {
    b.cell(`q${k}`, petalD(a, 35, 57, 15, "round", 1.22), P(46, a));
    b.decor(petalD(a, 38, 52.5, 8.2, "round", 1.18), 0.26);
    b.decor(circleD(1.0, ...P(50.5, a)), 0, true);
  });
  // 가는 점무늬 띠
  b.band("t", 32.5, 36.5, 12, 3);
  b.beadRing(24, 34.5, 0.75, 7.5, false);
  // 중심 로제트
  rosette(b, 8, 34, 21.5, 9.5);
}

// 2. 법륜 — 여덟 살 수레바퀴, 아치 감실과 밧줄 테
function buildWheel(b: Builder) {
  // 밧줄 테
  b.band("r", 90.5, 97, 24, 3);
  ring(24, 0, (a) => b.decor(lineD(P(90.5, a), P(97, a + 7)), 0.3));
  // 아치 감실 열여섯
  ring(16, 11.25, (a, k) => {
    b.cell(`a${k}`, archD(a, 73.5, 90, 10.2), P(81, a));
    b.decor(archD(a, 76, 86.5, 6.4), 0.26);
    b.decor(circleD(0.9, ...P(80, a)), 0, true);
  });
  // 구슬 띠
  b.band("b", 64.5, 73.5, 16, 2);
  b.decor(circleD(64.5), 0.3);
  b.beadRing(32, 69, 2.4);
  // 바퀴 안테
  b.band("i", 58.5, 64.5, 8, 1, 22.5);
  // 살 사이 바탕 — 그림자 꽃잎과 구슬로 메운다
  ring(8, 0, (a, k) => {
    b.cell(`s${k}`, ringSegD(a, a + 45, 25.5, 58.5), P(43, a + 22.5));
  });
  ring(8, 22.5, (a) => {
    b.decor(petalD(a, 27, 56, 14, "round", 1.18), 0.26);
    b.decor(petalD(a, 30, 51, 8, "round", 1.14), 0.24);
    b.decor(circleD(2.6, ...P(43, a)), 0.26);
    b.decor(circleD(0.9, ...P(43, a)), 0, true);
  });
  // 여덟 바퀴살
  ring(8, 0, (a, k) => {
    b.cell(`k${k}`, diamondD(a, 22.5, 60.5, 7.5, 0.45), P(40, a));
    b.decor(diamondD(a, 26.5, 55.5, 4.2, 0.45), 0.26);
    b.decor(lineD(P(29, a), P(52, a)), 0.24);
  });
  // 굴대와 심
  b.band("h", 17.5, 25.5, 8, 1, 22.5);
  b.beadRing(16, 21.5, 0.7, 0, false);
  rosette(b, 8, 20.5, 13.5, 8);
}

// 3. 백화 — 둥근 꽃잎 로제트가 다중으로 피고 점무늬 고리가 감싼다
function buildBloom(b: Builder) {
  // 잔잎 스물넷
  ring(24, 0, (a, k) => {
    b.cell(`o${Math.floor(k / 3)}`, petalD(a, 83, 97, 7, "round", 1.2), P(90, a));
    b.decor(circleD(0.8, ...P(91.5, a)), 0, true);
  });
  // 큰 둥근 꽃잎 열여섯
  ring(16, 0, (a, k) => {
    b.cell(`p${k}`, petalD(a, 57, 85.5, 10.8, "round", 1.26), P(72, a));
    b.decor(petalD(a, 60, 81, 6, "round", 1.2), 0.26);
    b.decor(lineD(P(62, a), P(75, a)), 0.24);
    b.decor(circleD(1.1, ...P(78.5, a)), 0, true);
  });
  // 구슬 띠
  b.band("b", 51.5, 57.5, 16, 2);
  b.decor(circleD(51.5), 0.3);
  b.decor(circleD(57.5), 0.3);
  b.beadRing(32, 54.5, 1.9);
  // 가운데 꽃잎 두 겹 — 반 칸씩 어긋나며 겹친다
  ring(12, 15, (a, k) => {
    b.cell(`m${k}`, petalD(a, 33, 53.5, 14, "round", 1.26), P(44, a));
    b.decor(petalD(a, 36, 49, 8, "round", 1.2), 0.26);
  });
  ring(12, 0, (a, k) => {
    b.cell(`n${k}`, petalD(a, 27.5, 45, 14, "round", 1.26), P(36, a));
    b.decor(petalD(a, 30, 41, 7.6, "round", 1.2), 0.26);
    b.decor(circleD(0.9, ...P(38.5, a)), 0, true);
  });
  // 점무늬 띠
  b.band("t", 24, 27.8, 12, 3);
  b.beadRing(24, 25.9, 0.75, 7.5, false);
  // 중심 로제트
  rosette(b, 8, 25.5, 17, 8.5);
}

// 4. 금강 — 여덟 갈래 별이 겹으로 서고 사이에 구슬이 박힌다
function buildVajra(b: Builder) {
  // 바깥 테 — 마름모 사슬
  b.band("r", 88.5, 97, 16, 2);
  ring(16, 11.25, (a) => b.decor(diamondD(a, 89.5, 96, 4.4), 0.26));
  // 별 사이 바탕 꽃잎 여덟 — 별 뒤에 깔린다
  ring(8, 22.5, (a, k) => {
    b.cell(`f${k}`, petalD(a, 32, 86, 17, "round", 1.16), P(62, a));
    b.decor(petalD(a, 36, 81, 11, "round", 1.12), 0.26);
  });
  // 큰 별 여덟 촉
  ring(8, 0, (a, k) => {
    b.cell(`s${k}`, diamondD(a, 28, 88, 10.5, 0.42), P(55, a));
    b.decor(diamondD(a, 34, 80.5, 6, 0.42), 0.26);
    b.decor(lineD(P(37, a), P(74, a)), 0.24);
  });
  // 버금 별 여덟 촉 — 반 칸 돌림
  ring(8, 22.5, (a, k) => {
    b.cell(`t${k}`, diamondD(a, 28, 72, 9.5, 0.45), P(48, a));
    b.decor(diamondD(a, 33, 65.5, 5.2, 0.45), 0.26);
  });
  // 별 사이 구슬 여덟
  ring(8, 22.5, (a, k) => {
    const [x, y] = P(77.5, a);
    b.cell(`j${k}`, circleD(6.2, x, y), [x, y]);
    b.decor(circleD(3.8, x, y), 0.26);
    b.decor(circleD(1.2, x, y), 0, true);
  });
  // 구슬 띠
  b.band("b", 33.5, 40, 16, 2);
  b.beadRing(24, 36.7, 2.2);
  // 안쪽 마름모 고리
  ring(8, 22.5, (a, k) => {
    b.cell(`d${k}`, diamondD(a, 17.5, 32.5, 7, 0.5), P(25, a));
    b.decor(diamondD(a, 20.5, 29.5, 4, 0.5), 0.26);
  });
  // 중심 — 뾰족한 로제트
  rosette(b, 8, 18, 11.5, 7, "sharp");
}

// 5. 도량 — 티베트식. 연꽃 테 안에 사각 궁이 서고 네 문이 열린다
function buildPalace(b: Builder) {
  // 밧줄 테
  b.band("r", 91, 97, 24, 3);
  ring(24, 0, (a) => b.decor(lineD(P(91, a), P(97, a + 7)), 0.3));
  // 구슬 띠
  b.band("b", 84.5, 90.5, 16, 2);
  b.beadRing(36, 87.5, 1.9);
  // 연꽃잎 고리 열여섯
  ring(16, 11.25, (a, k) => {
    b.cell(`l${k}`, petalD(a, 57, 84, 10.5, "sharp", 1.2), P(71, a));
    b.decor(petalD(a, 60.5, 80, 5.6, "sharp", 1.15), 0.26);
    b.decor(lineD(P(62.5, a), P(77, a)), 0.24);
  });
  // 네 모서리 부채 — 궁 안 대각선
  ring(4, 45, (a, k) => {
    b.cell(`f${k}`, petalD(a, 40, 60, 17, "round", 1.2), P(50, a));
    b.decor(petalD(a, 43, 56, 9.5, "round", 1.16), 0.26);
  });
  // 사각 궁 — 네 변
  ring(4, 0, (a, k) => {
    b.cell(`w${k}`, gateSideD(a, 54, 45), F(a, 49.5, 0));
  });
  {
    const hs = 49.5;
    const sq = [P(hs * Math.SQRT2, 45), P(hs * Math.SQRT2, 135), P(hs * Math.SQRT2, 225), P(hs * Math.SQRT2, 315)];
    b.decor(poly(sq), 0.26);
  }
  // 네 문 — 층계로 솟는다
  ring(4, 0, (a, k) => {
    b.cell(`g${k}`, gateD(a, 54, [15, 10.5, 5.5], [6, 5.5, 5]), F(a, 61, 0));
    b.decor(gateD(a, 54.8, [11, 7.2, 3.2], [4.6, 4.4, 4]), 0.24);
  });
  // 안뜰 테
  b.band("c", 41, 45, 8, 2);
  b.beadRing(16, 43, 0.7, 11.25, false);
  // 안의 연꽃
  ring(8, 0, (a, k) => {
    b.cell(`p${k}`, petalD(a, 12.5, 40.5, 19.5, "round", 1.26), P(27, a));
    b.decor(petalD(a, 16, 36, 10.5, "round", 1.2), 0.26);
    b.decor(lineD(P(19, a), P(31, a)), 0.24);
  });
  ring(8, 22.5, (a, k) => {
    b.cell(`q${k}`, petalD(a, 8, 24, 15, "round", 1.26), P(16, a));
  });
  b.cell("core", circleD(10), [C, C]);
  b.decor(circleD(6.5), 0.3);
  b.decor(circleD(2.0), 0, true);
}

export const TEMPLATES: Template[] = [
  { key: "lotus", name: "연화", hanja: "蓮華", build: buildLotus },
  { key: "wheel", name: "법륜", hanja: "法輪", build: buildWheel },
  { key: "bloom", name: "백화", hanja: "百華", build: buildBloom },
  { key: "vajra", name: "금강", hanja: "金剛", build: buildVajra },
  { key: "palace", name: "도량", hanja: "道場", build: buildPalace },
];

export function buildMandala(tpl: Template): Built {
  const b = new Builder(tpl.key);
  tpl.build(b);
  return b.done();
}

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
