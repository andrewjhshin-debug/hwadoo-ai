// ────────────────────────────────────────────────────────────────
// 만다라 문양 엔진 — 모양 원시도형(꽃잎·아치·구슬·마름모·고리·궁)을
// 회전 대칭으로 겹겹이 쌓아 다섯 폭을 그린다.
//
//  · 눈에 보이는 모든 닫힌 구역이 저마다 한 칸이다. 꽃잎 속 작은 꽃잎이면
//    바깥 테(고리 모양 구역)와 안쪽 꽃잎이 서로 다른 칸이고,
//    구슬 한 알 한 알도 제 칸이다. 묶음 색칠은 없다 — path 하나에 key 하나.
//  · 테(고리) 구역은 겉 윤곽과 속 윤곽을 한 path 에 담아 evenodd 로 구멍을
//    낸다. 구멍 자리는 짚어도 그 칸에 잡히지 않으므로, 위에 얹힌 안쪽 칸이
//    제대로 짚인다. 칠할 수 없는 장식 선은 두지 않는다 — 윤곽선(stroke)만 남는다.
//  · 구슬 등 작은 칸도 지름 4(viewBox 200 기준) 아래로는 만들지 않는다.
//    핀치 확대가 있으니, 확대해서 하나하나 칠하는 것이 곧 수행이다.
//  · nodes 는 그리는 순서 그대로다 — 뒤에 온 것이 위에 겹친다.
//    바깥 겹부터 그려 안쪽 겹이 그 위로 피어나게 한다. 겹침은 의도된 것.
// ────────────────────────────────────────────────────────────────

export const C = 100; // 중심 좌표 (viewBox 200×200)

export type MandalaNode = { key: string; d: string; fillRule?: "evenodd" };

export type Built = {
  nodes: MandalaNode[];
  cellKeys: string[]; // 칸의 순서 있는 목록 (진행 표시용)
  seeds: Record<string, [number, number][]>; // key → 칸 속의 표본점들 (모래 효과용)
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

// 밧줄 조각 — 겉 호가 skew 만큼 비스듬히 밀린 도넛 조각. 서로 맞물려 밧줄이 된다.
export function ropeSegD(
  a1: number, a2: number, skew: number, r0: number, r1: number
): string {
  return (
    `M${pp(P(r0, a1))} A${f(r0)} ${f(r0)} 0 0 1 ${pp(P(r0, a2))}` +
    ` L${pp(P(r1, a2 + skew))} A${f(r1)} ${f(r1)} 0 0 0 ${pp(P(r1, a1 + skew))} Z`
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

// ── 조립기 ───────────────────────────────────────────────────────

export class Builder {
  nodes: MandalaNode[] = [];
  private seedMap: Record<string, [number, number][]> = {};
  private order: string[] = [];
  private n = 0;
  constructor(private tk: string) {}

  // 닫힌 구역 하나 = 칸 하나. key 는 만들어지는 순서대로 붙는다.
  cell(d: string, seeds: [number, number][], fillRule?: "evenodd") {
    const k = `${this.tk}-${this.n++}`;
    this.nodes.push({ key: k, d, fillRule });
    this.order.push(k);
    this.seedMap[k] = seeds;
  }

  // 고리 띠 — 조각 하나하나가 제 칸
  band(r0: number, r1: number, segs: number, rot = 0) {
    const step = 360 / segs;
    for (let k = 0; k < segs; k++) {
      const a1 = rot + k * step;
      this.cell(ringSegD(a1, a1 + step, r0, r1), [P((r0 + r1) / 2, a1 + step / 2)]);
    }
  }

  // 밧줄 테 — 비스듬한 조각들이 맞물린다. 조각마다 제 칸.
  rope(r0: number, r1: number, segs: number, skew: number, rot = 0) {
    const step = 360 / segs;
    for (let k = 0; k < segs; k++) {
      const a1 = rot + k * step;
      this.cell(
        ropeSegD(a1, a1 + step, skew, r0, r1),
        [P((r0 + r1) / 2, a1 + step / 2 + skew / 2)]
      );
    }
  }

  // 구슬 띠 — 조각(구슬 자리는 구멍)과 구슬 한 알 한 알이 각각 제 칸.
  // 구슬은 조각을 perSeg 등분한 각 자리의 한가운데 앉아, 조각을 벗어나지 않는다.
  beadBand(
    r0: number, r1: number, segs: number,
    beadR: number, beadRingR: number, rot = 0, perSeg = 2
  ) {
    const step = 360 / segs;
    for (let k = 0; k < segs; k++) {
      const a1 = rot + k * step;
      let d = ringSegD(a1, a1 + step, r0, r1);
      const beads: [number, number][] = [];
      for (let j = 0; j < perSeg; j++) {
        const ba = a1 + (step * (2 * j + 1)) / (2 * perSeg);
        const [bx, by] = P(beadRingR, ba);
        d += ` ${circleD(beadR, bx, by)}`;
        beads.push([bx, by]);
      }
      // 조각 칸의 씨앗은 구슬과 구슬 사이 빈 자리에 둔다
      this.cell(d, [P((r0 + r1) / 2, a1 + step / 2)], "evenodd");
      for (const [bx, by] of beads) this.cell(circleD(beadR, bx, by), [[bx, by]]);
    }
  }

  done(): Built {
    return { nodes: this.nodes, cellKeys: this.order, seeds: this.seedMap };
  }
}

// 테+속 두 칸 — 겉 윤곽에 속 윤곽으로 구멍을 내고(evenodd), 속은 제 칸으로 얹는다
function nest(
  b: Builder, dOut: string, dIn: string,
  ringSeeds: [number, number][], innerSeeds: [number, number][]
) {
  b.cell(`${dOut} ${dIn}`, ringSeeds, "evenodd");
  b.cell(dIn, innerSeeds);
}

// n 갈래 회전 반복
function ring(n: number, rot: number, fn: (a: number, k: number) => void) {
  for (let k = 0; k < n; k++) fn(rot + (k * 360) / n, k);
}

// 중심 로제트 — 겹치는 둥근 꽃잎 두 겹 + 심(芯). 다섯 폭이 함께 쓴다.
// 겉잎은 테와 속잎 두 칸으로 갈라지고, 심도 고리와 속원 두 칸이다.
function rosette(
  b: Builder, n: number, r1: number, r2: number, core: number,
  tip: "round" | "sharp" = "round"
) {
  const hwO = (360 / n / 2) * 0.86;
  const hwI = (360 / n / 2) * 0.46;
  ring(n, 0, (a) => {
    const o = petalD(a, core * 0.9, r1, hwO, tip, 1.28);
    const i = petalD(a, core * 0.9 + (r1 - core) * 0.16, r1 - (r1 - core) * 0.18, hwI, tip, 1.2);
    nest(b, o, i, [P(r1 - (r1 - core) * 0.09, a)], [P((core + r1) / 2, a)]);
  });
  ring(n, 180 / n, (a) => {
    b.cell(petalD(a, core * 0.7, r2, (360 / n / 2) * 0.72, tip, 1.28), [P((core + r2) / 2, a)]);
  });
  b.cell(
    `${circleD(core)} ${circleD(core * 0.62)}`,
    [P(core * 0.81, 45), P(core * 0.81, 225)],
    "evenodd"
  );
  b.cell(circleD(core * 0.62), [[C, C]]);
}

// ── 다섯 폭 ──────────────────────────────────────────────────────

// 1. 연화 — 가운데 로제트에서 연꽃잎이 겹겹이 밖으로 펼쳐진다
function buildLotus(b: Builder) {
  // 맨 바깥 — 뾰족한 잎끝 열여섯, 잎마다 테와 속잎
  ring(16, 0, (a) => {
    nest(
      b,
      petalD(a, 71, 97, 10.5, "sharp", 1.2),
      petalD(a, 74.5, 92.5, 5.6, "sharp", 1.15),
      [P(94.75, a)], [P(83.5, a)]
    );
  });
  // 구슬 띠 — 조각 열여섯 + 구슬 서른둘
  b.beadBand(65.5, 71.5, 16, 2.0, 68.5);
  // 뒤 연꽃잎 열둘
  ring(12, 15, (a) => {
    nest(
      b,
      petalD(a, 38, 65.5, 15, "sharp", 1.22),
      petalD(a, 41.5, 61, 8.4, "sharp", 1.18),
      [P(63.25, a)], [P(59, a)]
    );
  });
  // 잎 사이 구슬 열둘
  ring(12, 0, (a) => {
    const [x, y] = P(61.5, a);
    b.cell(circleD(2.1, x, y), [[x, y]]);
  });
  // 앞 연꽃잎 열둘 — 반 칸 돌려 겹친다
  ring(12, 0, (a) => {
    nest(
      b,
      petalD(a, 35, 57, 15, "round", 1.22),
      petalD(a, 38, 52.5, 8.2, "round", 1.18),
      [P(54.75, a)], [P(45.25, a)]
    );
  });
  // 가는 띠 — 조각 열둘
  b.band(32.5, 36.5, 12);
  // 중심 로제트
  rosette(b, 8, 34, 21.5, 9.5);
}

// 2. 법륜 — 여덟 살 수레바퀴, 아치 감실과 밧줄 테
function buildWheel(b: Builder) {
  // 밧줄 테 — 비스듬한 조각 스물넷
  b.rope(90.5, 97, 24, 7);
  // 아치 감실 열여섯 — 테와 속아치
  ring(16, 11.25, (a) => {
    nest(
      b,
      archD(a, 73.5, 90, 10.2),
      archD(a, 76, 86.5, 6.4),
      [P(88.25, a)], [P(81.25, a)]
    );
  });
  // 구슬 띠
  b.beadBand(64.5, 73.5, 16, 2.4, 69);
  // 바퀴 안테 여덟 조각
  b.band(58.5, 64.5, 8, 22.5);
  // 살 사이 — 바탕·꽃잎 테·속잎·구슬, 네 겹이 각각 제 칸
  ring(8, 0, (a) => {
    const ac = a + 22.5;
    const seg = ringSegD(a, a + 45, 25.5, 58.5);
    const p1 = petalD(ac, 27, 56, 14, "round", 1.18);
    const p2 = petalD(ac, 30, 51, 8, "round", 1.14);
    const [jx, jy] = P(43, ac);
    const jd = circleD(2.6, jx, jy);
    b.cell(`${seg} ${p1}`, [P(57.3, ac), P(26.2, ac)], "evenodd");
    b.cell(`${p1} ${p2}`, [P(53.5, ac)], "evenodd");
    b.cell(`${p2} ${jd}`, [P(48, ac)], "evenodd");
    b.cell(jd, [[jx, jy]]);
  });
  // 여덟 바퀴살 — 테와 속마름모
  ring(8, 0, (a) => {
    nest(
      b,
      diamondD(a, 22.5, 60.5, 7.5, 0.45),
      diamondD(a, 26.5, 55.5, 4.2, 0.45),
      [P(58, a)], [P(41, a)]
    );
  });
  // 굴대
  b.band(17.5, 25.5, 8, 22.5);
  rosette(b, 8, 20.5, 13.5, 8);
}

// 3. 백화 — 둥근 꽃잎 로제트가 다중으로 피고 구슬 고리가 감싼다
function buildBloom(b: Builder) {
  // 잔잎 스물넷 — 하나하나 제 칸
  ring(24, 0, (a) => {
    b.cell(petalD(a, 83, 97, 7, "round", 1.2), [P(90, a)]);
  });
  // 큰 둥근 꽃잎 열여섯 — 테와 속잎
  ring(16, 0, (a) => {
    nest(
      b,
      petalD(a, 57, 85.5, 10.8, "round", 1.26),
      petalD(a, 60, 81, 6, "round", 1.2),
      [P(83.25, a)], [P(70.5, a)]
    );
  });
  // 구슬 띠
  b.beadBand(51.5, 57.5, 16, 2.0, 54.5);
  // 가운데 꽃잎 두 겹 — 반 칸씩 어긋나며 겹친다
  ring(12, 15, (a) => {
    nest(
      b,
      petalD(a, 33, 53.5, 14, "round", 1.26),
      petalD(a, 36, 49, 8, "round", 1.2),
      [P(51.25, a)], [P(47.5, a)]
    );
  });
  ring(12, 0, (a) => {
    nest(
      b,
      petalD(a, 27.5, 45, 14, "round", 1.26),
      petalD(a, 30, 41, 7.6, "round", 1.2),
      [P(43, a)], [P(35.5, a)]
    );
  });
  // 가는 띠 — 조각 열둘
  b.band(24, 27.8, 12);
  // 중심 로제트
  rosette(b, 8, 25.5, 17, 8.5);
}

// 4. 금강 — 여덟 갈래 별이 겹으로 서고 사이에 구슬이 박힌다
function buildVajra(b: Builder) {
  // 바깥 테 — 마름모 사슬: 조각(마름모 자리는 구멍)과 마름모가 각각 제 칸
  {
    const step = 22.5;
    for (let k = 0; k < 16; k++) {
      const a1 = k * step;
      const dd = diamondD(a1 + step / 2, 89.5, 96, 4.4);
      b.cell(
        `${ringSegD(a1, a1 + step, 88.5, 97)} ${dd}`,
        [P(92.75, a1 + 2.5), P(92.75, a1 + 20)],
        "evenodd"
      );
      b.cell(dd, [P(92.75, a1 + step / 2)]);
    }
  }
  // 별 사이 바탕 꽃잎 여덟 — 별 뒤에 깔린다
  ring(8, 22.5, (a) => {
    nest(
      b,
      petalD(a, 32, 86, 17, "round", 1.16),
      petalD(a, 36, 81, 11, "round", 1.12),
      [P(84.8, a)], [P(60, a + 7)]
    );
  });
  // 큰 별 여덟 촉 — 테와 속마름모
  ring(8, 0, (a) => {
    nest(
      b,
      diamondD(a, 28, 88, 10.5, 0.42),
      diamondD(a, 34, 80.5, 6, 0.42),
      [P(84.25, a)], [P(55, a)]
    );
  });
  // 버금 별 여덟 촉 — 반 칸 돌림
  ring(8, 22.5, (a) => {
    nest(
      b,
      diamondD(a, 28, 72, 9.5, 0.45),
      diamondD(a, 33, 65.5, 5.2, 0.45),
      [P(68.75, a)], [P(48, a)]
    );
  });
  // 별 사이 구슬 여덟 — 테와 속알
  ring(8, 22.5, (a) => {
    const [x, y] = P(77.5, a);
    nest(b, circleD(6.2, x, y), circleD(3.8, x, y), [P(82.5, a)], [[x, y]]);
  });
  // 구슬 띠
  b.beadBand(33.5, 40, 16, 2.2, 36.7);
  // 안쪽 마름모 고리 — 테와 속마름모
  ring(8, 22.5, (a) => {
    nest(
      b,
      diamondD(a, 17.5, 32.5, 7, 0.5),
      diamondD(a, 20.5, 29.5, 4, 0.5),
      [P(31, a)], [P(25, a)]
    );
  });
  // 중심 — 뾰족한 로제트
  rosette(b, 8, 18, 11.5, 7, "sharp");
}

// 5. 도량 — 티베트식. 연꽃 테 안에 사각 궁이 서고 네 문이 열린다
function buildPalace(b: Builder) {
  // 밧줄 테
  b.rope(91, 97, 24, 7);
  // 구슬 띠
  b.beadBand(84.5, 90.5, 16, 2.0, 87.5);
  // 연꽃잎 고리 열여섯 — 테와 속잎
  ring(16, 11.25, (a) => {
    nest(
      b,
      petalD(a, 57, 84, 10.5, "sharp", 1.2),
      petalD(a, 60.5, 80, 5.6, "sharp", 1.15),
      [P(82, a)], [P(70.25, a)]
    );
  });
  // 네 모서리 부채 — 궁 안 대각선, 테와 속잎
  ring(4, 45, (a) => {
    nest(
      b,
      petalD(a, 40, 60, 17, "round", 1.2),
      petalD(a, 43, 56, 9.5, "round", 1.16),
      [P(58, a)], [P(49.5, a)]
    );
  });
  // 사각 궁 — 변마다 겉단·속단 두 칸 (가운데 금이 두 단의 윤곽선으로 남는다)
  ring(4, 0, (a) => {
    b.cell(gateSideD(a, 54, 49.5), [F(a, 51.75, 0)]);
    b.cell(gateSideD(a, 49.5, 45), [F(a, 47.25, 0)]);
  });
  // 네 문 — 층계 문틀과 속문
  ring(4, 0, (a) => {
    nest(
      b,
      gateD(a, 54, [15, 10.5, 5.5], [6, 5.5, 5]),
      gateD(a, 54.8, [11, 7.2, 3.2], [4.6, 4.4, 4]),
      [F(a, 69.2, 0)], [F(a, 58, 0)]
    );
  });
  // 안뜰 테 — 조각 여덟
  b.band(41, 45, 8);
  // 안의 연꽃 — 테와 속잎
  ring(8, 0, (a) => {
    nest(
      b,
      petalD(a, 12.5, 40.5, 19.5, "round", 1.26),
      petalD(a, 16, 36, 10.5, "round", 1.2),
      [P(38.25, a)], [P(26, a)]
    );
  });
  ring(8, 22.5, (a) => {
    b.cell(petalD(a, 8, 24, 15, "round", 1.26), [P(16, a)]);
  });
  // 심 — 겉고리·속고리·씨알, 세 칸
  b.cell(`${circleD(10)} ${circleD(6.5)}`, [P(8.25, 45), P(8.25, 225)], "evenodd");
  b.cell(`${circleD(6.5)} ${circleD(2.0)}`, [P(4.25, 0), P(4.25, 180)], "evenodd");
  b.cell(circleD(2.0), [[C, C]]);
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
