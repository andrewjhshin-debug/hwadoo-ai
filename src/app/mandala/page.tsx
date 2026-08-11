"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 색칠하기 — 화두를 기다리는 동안의 수행.
// 정교한 만다라 다섯 폭 중 하나를 골라, 칸마다 색을 채운다.
// 다 채운 뒤에는 '비우기' — 모래 만다라처럼, 공들인 것을 쓸어 없앤다.
// 채움도 비움도 모두 수행. 서버도 저장 비용도 없다.
// ────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import Link from "next/link";

// 오방색 + 여백(비우기용 = 배경색)
const PALETTE = [
  { name: "금", color: "#D9B45B" },
  { name: "단청 적", color: "#C1553B" },
  { name: "오방 청", color: "#5E7FB2" },
  { name: "한지", color: "#EDE6D4" },
  { name: "연둣빛", color: "#8CA36B" },
  { name: "자주", color: "#7A4B6B" },
  { name: "먹빛(지움)", color: "transparent" },
];

const CENTER = 100;

// ── 도형 생성 헬퍼 ──────────────────────────────────────────────
const pt = (r: number, aDeg: number) => {
  const a = (aDeg * Math.PI) / 180;
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
};

// 고리 조각(annular sector)
function sector(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

// 뾰족한 꽃잎 (두 점을 곡선으로 이어 마름모/잎 모양)
function petal(rInner: number, rOuter: number, aCenter: number, spread: number): string {
  const [bx1, by1] = pt(rInner, aCenter - spread);
  const [bx2, by2] = pt(rInner, aCenter + spread);
  const [tx, ty] = pt(rOuter, aCenter);
  const [cx1, cy1] = pt((rInner + rOuter) / 2, aCenter - spread * 0.7);
  const [cx2, cy2] = pt((rInner + rOuter) / 2, aCenter + spread * 0.7);
  return `M${bx1} ${by1} Q${cx1} ${cy1} ${tx} ${ty} Q${cx2} ${cy2} ${bx2} ${by2} Z`;
}

type Region = { id: string; d: string };

// ── 다섯 폭의 만다라 ────────────────────────────────────────────
function buildTemplate(kind: number): Region[] {
  const regions: Region[] = [];
  const add = (id: string, d: string) => regions.push({ id, d });

  if (kind === 0) {
    // ① 연꽃 만다라 — 세 겹 꽃잎
    add("core", `M${CENTER} ${CENTER} m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0`);
    const rings = [
      { n: 8, r1: 12, r2: 34, spread: 22 },
      { n: 12, r1: 34, r2: 60, spread: 15 },
      { n: 16, r1: 60, r2: 90, spread: 11 },
    ];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (360 / ring.n) * i - 90 + (ri % 2 ? 360 / ring.n / 2 : 0);
        add(`p${ri}-${i}`, petal(ring.r1, ring.r2, a, ring.spread));
      }
    });
  } else if (kind === 1) {
    // ② 수레바퀴 만다라 — 고리 조각
    const rings = [
      { n: 6, r1: 8, r2: 30 },
      { n: 12, r1: 30, r2: 55 },
      { n: 18, r1: 55, r2: 78 },
      { n: 24, r1: 78, r2: 94 },
    ];
    rings.forEach((ring, ri) => {
      const step = 360 / ring.n;
      for (let i = 0; i < ring.n; i++) {
        const a1 = step * i - 90;
        add(`s${ri}-${i}`, sector(ring.r1, ring.r2, a1 + 1.5, a1 + step - 1.5));
      }
    });
  } else if (kind === 2) {
    // ③ 별 만다라 — 꽃잎과 조각 교차
    add("core", `M${CENTER} ${CENTER} m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0`);
    for (let i = 0; i < 8; i++) {
      const a = 45 * i - 90;
      add(`star-${i}`, petal(8, 46, a, 12));
    }
    const step = 360 / 16;
    for (let i = 0; i < 16; i++) {
      const a1 = step * i - 90;
      add(`ring-${i}`, sector(48, 72, a1 + 1.5, a1 + step - 1.5));
    }
    for (let i = 0; i < 12; i++) {
      const a = (360 / 12) * i - 90;
      add(`tip-${i}`, petal(72, 96, a, 9));
    }
  } else if (kind === 3) {
    // ④ 겹연꽃 만다라 — 촘촘한 꽃잎 네 겹
    add("core", `M${CENTER} ${CENTER} m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0`);
    const rings = [
      { n: 6, r1: 9, r2: 28, spread: 26 },
      { n: 10, r1: 28, r2: 48, spread: 17 },
      { n: 14, r1: 48, r2: 70, spread: 12 },
      { n: 20, r1: 70, r2: 92, spread: 9 },
    ];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (360 / ring.n) * i - 90 + (ri % 2 ? 360 / ring.n / 2 : 0);
        add(`q${ri}-${i}`, petal(ring.r1, ring.r2, a, ring.spread));
      }
    });
  } else {
    // ⑤ 격자 만다라 — 조각과 꽃잎이 규칙적으로
    const rings = [
      { n: 4, r1: 10, r2: 32 },
      { n: 8, r1: 32, r2: 54 },
      { n: 16, r1: 54, r2: 76 },
    ];
    rings.forEach((ring, ri) => {
      const step = 360 / ring.n;
      for (let i = 0; i < ring.n; i++) {
        const a1 = step * i - 90;
        add(`g${ri}-${i}`, sector(ring.r1, ring.r2, a1 + 2, a1 + step - 2));
      }
    });
    for (let i = 0; i < 16; i++) {
      const a = (360 / 16) * i - 90;
      add(`outer-${i}`, petal(76, 96, a, 10));
    }
  }
  return regions;
}

const TEMPLATE_NAMES = ["연꽃", "수레바퀴", "별", "겹연꽃", "격자"];

export default function MandalaPage() {
  const [tpl, setTpl] = useState(0);
  const [color, setColor] = useState(PALETTE[0].color);
  const [fills, setFills] = useState<Record<string, string>>({});

  const regions = useMemo(() => buildTemplate(tpl), [tpl]);

  const filledCount = Object.values(fills).filter((c) => c && c !== "transparent")
    .length;
  const done = filledCount >= regions.length;

  const paint = (id: string) => {
    setFills((prev) => {
      const next = { ...prev };
      if (color === "transparent") delete next[id];
      else next[id] = color;
      return next;
    });
  };

  const chooseTemplate = (i: number) => {
    setTpl(i);
    setFills({});
  };

  // 비우기 — 모래 만다라처럼, 공들인 것을 쓸어 없앤다
  const clear = () => {
    if (filledCount === 0) {
      setFills({});
      return;
    }
    if (
      window.confirm(
        "공들여 채운 만다라를 비우시겠습니까?\n\n모래 만다라처럼 — 이룬 것을 흩어 없애는 것도 수행입니다."
      )
    ) {
      setFills({});
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 py-12">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        曼陀羅 · 만다라 색칠
      </h1>
      <p className="rise rise-d1 mt-3 text-center text-[12px] leading-6 text-hanji-faint">
        화두를 기다리는 동안, 한 칸씩 색을 채웁니다.
        <br />다 채운 뒤에는 — 비웁니다. 채움도 비움도 수행입니다.
      </p>

      {/* 만다라 고르기 */}
      <div className="rise rise-d1 mt-6 flex flex-wrap items-center justify-center gap-2">
        {TEMPLATE_NAMES.map((name, i) => (
          <button
            key={name}
            onClick={() => chooseTemplate(i)}
            className={`rounded-full border px-3.5 py-1.5 text-xs tracking-widest transition-colors ${
              tpl === i
                ? "border-gold/60 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 만다라 캔버스 */}
      <div className="rise rise-d2 mt-7 w-full max-w-[460px]">
        <svg
          viewBox="0 0 200 200"
          className="h-auto w-full select-none rounded-full border border-ink-3 bg-ink-2/40"
        >
          {/* 은은한 안내 원 */}
          <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(217,180,91,0.12)" />
          {regions.map((r) => (
            <path
              key={r.id}
              d={r.d}
              onClick={() => paint(r.id)}
              fill={fills[r.id] ?? "transparent"}
              stroke="rgba(217,180,91,0.35)"
              strokeWidth="0.6"
              style={{ cursor: "pointer", transition: "fill 0.15s" }}
            />
          ))}
        </svg>
      </div>

      {/* 색 */}
      <div className="rise rise-d3 mt-7 flex flex-wrap items-center justify-center gap-3">
        {PALETTE.map((p) => (
          <button
            key={p.color}
            onClick={() => setColor(p.color)}
            title={p.name}
            aria-label={p.name}
            className={`h-8 w-8 rounded-full border-2 transition-transform ${
              color === p.color
                ? "scale-110 border-hanji"
                : "border-transparent hover:scale-105"
            } ${p.color === "transparent" ? "bg-ink-2" : ""}`}
            style={
              p.color === "transparent"
                ? {
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #2a2520 0 4px, #14110d 4px 8px)",
                  }
                : { backgroundColor: p.color }
            }
          />
        ))}
      </div>

      {/* 진행 */}
      <p className="rise rise-d3 mt-6 text-[12px] tracking-wide text-hanji-faint">
        {done ? (
          <span className="text-gold-soft">만다라를 다 채우셨습니다 — 이제 비울 때입니다</span>
        ) : (
          <>
            {filledCount} / {regions.length} 칸 채움
          </>
        )}
      </p>

      {/* 비우기 */}
      <div className="rise rise-d3 mt-6">
        <button
          onClick={clear}
          className={`rounded-[10px] border px-8 py-3 text-[13px] tracking-[0.2em] transition-colors ${
            done
              ? "btn-obang text-hanji hover:opacity-90"
              : "border-ink-3 text-hanji-dim hover:border-vermilion/50 hover:text-vermilion"
          }`}
        >
          비우기
        </button>
      </div>

      <p className="rise rise-d3 mt-10 text-center text-[11px] leading-6 text-hanji-faint">
        모래로 쌓은 만다라는 완성되는 순간 쓸려 나갑니다.
        <br />채움에 매이지 않는 연습 — 그것이 이 놀이의 뜻입니다.
      </p>

      <div className="mt-10 text-center">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
        >
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
  );
}
