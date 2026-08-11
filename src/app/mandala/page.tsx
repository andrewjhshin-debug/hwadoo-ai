"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 색칠하기 — 화두를 기다리는 동안의 수행.
// 겹겹이 피어난 연꽃잎 만다라 다섯 폭. 곡선 꽃잎을 하나씩 색으로 채운다.
// 주 꽃잎과 사이 꽃잎이 어긋나게 겹쳐, 빈틈없이 꽃처럼 채워진다.
// 다 채운 뒤 '비우기' — 모래 만다라처럼 색이 모래알로 흩어져 사라진다.
// ────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

// 다양한 색 — 오방색 + 파스텔·중간톤
const PALETTE = [
  "#D9B45B", "#E8A33D", "#C1553B", "#E36A6A", "#D98CA6",
  "#B0587F", "#7A4B6B", "#5E7FB2", "#6FB0C4", "#4E9E86",
  "#8CA36B", "#C9D66B", "#EDE6D4", "#B99A54", "transparent",
];

const C = 100;

const pt = (r: number, aDeg: number): [number, number] => {
  const a = (aDeg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

// 곡선 연꽃잎 — 밑동은 안쪽 호(arc), 양옆은 볼록한 곡선, 끝은 뾰족/둥근 팁
function petal(r1: number, r2: number, aC: number, half: number): string {
  const [bx1, by1] = pt(r1, aC - half);
  const [bx2, by2] = pt(r1, aC + half);
  const [tx, ty] = pt(r2, aC);
  const [c1x, c1y] = pt(r1 + (r2 - r1) * 0.62, aC - half * 0.95);
  const [c2x, c2y] = pt(r1 + (r2 - r1) * 0.62, aC + half * 0.95);
  return `M${bx1} ${by1} Q${c1x} ${c1y} ${tx} ${ty} Q${c2x} ${c2y} ${bx2} ${by2} A${r1} ${r1} 0 0 0 ${bx1} ${by1} Z`;
}

type Region = { id: string; d: string; cx: number; cy: number };

// 한 겹을 주 꽃잎 + 사이(반 칸 어긋난) 꽃잎으로 채운다 → 빈틈없이 꽃처럼
function petalRing(
  out: Region[],
  key: string,
  n: number,
  r1: number,
  r2: number,
  baseAngle = 0
) {
  const step = 360 / n;
  const half = step / 2;
  // 사이 꽃잎(뒤층) 먼저 — 반 칸 어긋나고 살짝 짧게
  for (let i = 0; i < n; i++) {
    const a = step * i - 90 + baseAngle + half;
    const [cx, cy] = pt((r1 + r2) / 2, a);
    out.push({ id: `${key}-b${i}`, d: petal(r1, r1 + (r2 - r1) * 0.82, a, half), cx, cy });
  }
  // 주 꽃잎(앞층)
  for (let i = 0; i < n; i++) {
    const a = step * i - 90 + baseAngle;
    const [cx, cy] = pt((r1 + r2) / 2, a);
    out.push({ id: `${key}-f${i}`, d: petal(r1, r2, a, half), cx, cy });
  }
}

function buildTemplate(kind: number): Region[] {
  const out: Region[] = [];
  // 중심 원판
  const coreR = 8;
  out.push({
    id: `${kind}-core`,
    d: `M${C} ${C} m-${coreR} 0 a${coreR} ${coreR} 0 1 0 ${coreR * 2} 0 a${coreR} ${coreR} 0 1 0 -${coreR * 2} 0`,
    cx: C,
    cy: C,
  });

  const LAYOUTS: { n: number; r1: number; r2: number }[][] = [
    // ① 겹연꽃 — 부드럽게 커지는 여섯 겹
    [
      { n: 8, r1: 8, r2: 26 },
      { n: 12, r1: 24, r2: 44 },
      { n: 16, r1: 42, r2: 62 },
      { n: 20, r1: 60, r2: 80 },
      { n: 28, r1: 78, r2: 98 },
    ],
    // ② 큰 꽃 한 송이 — 넓은 꽃잎 중심 + 촘촘한 바깥
    [
      { n: 6, r1: 8, r2: 34 },
      { n: 12, r1: 32, r2: 58 },
      { n: 18, r1: 56, r2: 80 },
      { n: 24, r1: 78, r2: 98 },
    ],
    // ③ 별꽃 — 층마다 방향 어긋나게
    [
      { n: 10, r1: 8, r2: 28 },
      { n: 10, r1: 26, r2: 48 },
      { n: 20, r1: 46, r2: 68 },
      { n: 20, r1: 66, r2: 86 },
      { n: 30, r1: 84, r2: 98 },
    ],
    // ④ 촘촘 연꽃 — 겹 많고 잔잔
    [
      { n: 8, r1: 8, r2: 22 },
      { n: 12, r1: 20, r2: 36 },
      { n: 16, r1: 34, r2: 52 },
      { n: 22, r1: 50, r2: 68 },
      { n: 28, r1: 66, r2: 84 },
      { n: 36, r1: 82, r2: 98 },
    ],
    // ⑤ 나선 연꽃 — 겹마다 각도를 틀어 소용돌이
    [
      { n: 9, r1: 8, r2: 28 },
      { n: 14, r1: 26, r2: 48 },
      { n: 18, r1: 46, r2: 68 },
      { n: 26, r1: 66, r2: 88 },
      { n: 34, r1: 86, r2: 98 },
    ],
  ];

  const layout = LAYOUTS[kind] ?? LAYOUTS[0];
  layout.forEach((ring, ri) => {
    const baseAngle = kind === 4 ? (ri * 14) : ri % 2 ? 360 / ring.n / 2 : 0;
    petalRing(out, `${kind}-r${ri}`, ring.n, ring.r1, ring.r2, baseAngle);
  });

  return out;
}

const TEMPLATE_NAMES = ["겹연꽃", "큰 꽃", "별꽃", "촘촘 연꽃", "나선"];

export default function MandalaPage() {
  const [tpl, setTpl] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [scattering, setScattering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const regions = useMemo(() => buildTemplate(tpl), [tpl]);

  const filledCount = Object.values(fills).filter(
    (c) => c && c !== "transparent"
  ).length;
  const done = filledCount >= Math.floor(regions.length * 0.85);

  const paint = (id: string) => {
    if (scattering) return;
    setFills((prev) => {
      const next = { ...prev };
      if (color === "transparent") delete next[id];
      else next[id] = color;
      return next;
    });
  };

  const chooseTemplate = (i: number) => {
    if (scattering) return;
    setTpl(i);
    setFills({});
  };

  // 모래 흩어지는 이펙트
  const runSandEffect = () => {
    const wrap = svgWrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const size = wrap.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const scale = size / 200;

    type P = { x: number; y: number; vx: number; vy: number; r: number; color: string };
    const parts: P[] = [];
    for (const reg of regions) {
      const c = fills[reg.id];
      if (!c || c === "transparent") continue;
      const px = reg.cx * scale;
      const py = reg.cy * scale;
      const count = 4 + Math.floor(Math.random() * 4);
      for (let k = 0; k < count; k++) {
        parts.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.3 + Math.random() * 1.1,
          r: 0.8 + Math.random() * 1.6,
          color: c,
        });
      }
    }
    if (parts.length === 0) return;

    setScattering(true);
    setFills({});

    let raf = 0;
    const start = performance.now();
    const DURATION = 1700;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, size, size);
      for (const p of parts) {
        p.vy += 0.05;
        p.vx += (Math.random() - 0.5) * 0.06;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - t / DURATION) * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t < DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, size, size);
        cancelAnimationFrame(raf);
        setScattering(false);
      }
    };
    raf = requestAnimationFrame(tick);
  };

  const clear = () => {
    if (scattering) return;
    if (filledCount === 0) {
      setFills({});
      return;
    }
    if (
      window.confirm(
        "공들여 채운 만다라를 비우시겠습니까?\n\n모래 만다라처럼 — 이룬 것을 흩어 없애는 것도 수행입니다."
      )
    ) {
      runSandEffect();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-12">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        曼陀羅 · 만다라 색칠
      </h1>
      <p className="rise rise-d1 mt-3 text-center text-[12px] leading-6 text-hanji-faint">
        화두를 기다리는 동안, 한 잎씩 색을 채웁니다.
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

      {/* 본체 — 만다라(왼쪽) + 색 팔레트(오른쪽) */}
      <div className="rise rise-d2 mt-8 flex w-full flex-col items-center gap-7 sm:flex-row sm:items-start sm:justify-center">
        {/* 만다라 */}
        <div ref={svgWrapRef} className="relative w-full max-w-[440px]">
          <svg
            viewBox="0 0 200 200"
            className="h-auto w-full select-none rounded-full border border-ink-3 bg-ink-2/40"
          >
            <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(217,180,91,0.12)" />
            {regions.map((r) => (
              <path
                key={r.id}
                d={r.d}
                onClick={() => paint(r.id)}
                fill={fills[r.id] ?? "transparent"}
                stroke="rgba(217,180,91,0.4)"
                strokeWidth="0.35"
                style={{
                  cursor: scattering ? "default" : "pointer",
                  transition: "fill 0.12s",
                }}
              />
            ))}
          </svg>
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
        </div>

        {/* 색 팔레트 — 오른쪽 */}
        <div className="flex flex-col items-center sm:pt-2">
          <p className="mb-3 text-[10px] tracking-[0.3em] text-hanji-faint">색</p>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-3">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c === "transparent" ? "지움" : c}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  color === c
                    ? "scale-110 border-hanji"
                    : "border-transparent hover:scale-105"
                }`}
                style={
                  c === "transparent"
                    ? {
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #2a2520 0 4px, #14110d 4px 8px)",
                      }
                    : { backgroundColor: c }
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* 진행 */}
      <p className="rise rise-d3 mt-7 text-[12px] tracking-wide text-hanji-faint">
        {done ? (
          <span className="text-gold-soft">
            만다라를 다 채우셨습니다 — 이제 비울 때입니다
          </span>
        ) : (
          <>
            {filledCount} / {regions.length} 잎 채움
          </>
        )}
      </p>

      {/* 비우기 */}
      <div className="rise rise-d3 mt-6">
        <button
          onClick={clear}
          disabled={scattering}
          className={`rounded-[10px] border px-8 py-3 text-[13px] tracking-[0.2em] transition-colors disabled:opacity-50 ${
            done
              ? "btn-obang text-hanji hover:opacity-90"
              : "border-ink-3 text-hanji-dim hover:border-vermilion/50 hover:text-vermilion"
          }`}
        >
          {scattering ? "흩어지는 중…" : "비우기"}
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
