"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 색칠하기 — 화두를 기다리는 동안의 수행.
// 겹겹이 피어난 연꽃잎 만다라 다섯 폭. 곡선 꽃잎을 하나씩 색으로 채운다.
// 주 꽃잎과 사이 꽃잎이 어긋나게 겹쳐, 빈틈없이 꽃처럼 채워진다.
// 다 채운 뒤 '비우기' — 모래 만다라처럼 색이 모래알로 흩어져 사라진다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
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

type Region = { id: string; d: string; cx: number; cy: number };

// ── 문양 조각들 ────────────────────────────────────────────────
// 고리 조각 (부채꼴)
function sector(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

// 마름모 (다이아)
function diamond(r1: number, r2: number, aC: number, half: number): string {
  const [ox, oy] = pt(r1, aC);
  const [tx, ty] = pt(r2, aC);
  const [lx, ly] = pt((r1 + r2) / 2, aC - half);
  const [rx, ry] = pt((r1 + r2) / 2, aC + half);
  return `M${ox} ${oy} L${lx} ${ly} L${tx} ${ty} L${rx} ${ry} Z`;
}

// 삼각 톱니 (바깥으로 뾰족)
function triangle(r1: number, r2: number, aC: number, half: number): string {
  const [b1x, b1y] = pt(r1, aC - half);
  const [b2x, b2y] = pt(r1, aC + half);
  const [tx, ty] = pt(r2, aC);
  return `M${b1x} ${b1y} L${tx} ${ty} L${b2x} ${b2y} Z`;
}

// 곡선 연꽃잎
function petal(r1: number, r2: number, aC: number, half: number): string {
  const [bx1, by1] = pt(r1, aC - half);
  const [bx2, by2] = pt(r1, aC + half);
  const [tx, ty] = pt(r2, aC);
  const [c1x, c1y] = pt(r1 + (r2 - r1) * 0.62, aC - half * 0.95);
  const [c2x, c2y] = pt(r1 + (r2 - r1) * 0.62, aC + half * 0.95);
  return `M${bx1} ${by1} Q${c1x} ${c1y} ${tx} ${ty} Q${c2x} ${c2y} ${bx2} ${by2} A${r1} ${r1} 0 0 0 ${bx1} ${by1} Z`;
}

type RingKind = "petal" | "sector" | "diamond" | "triangle" | "dots";

// 한 겹을 지정한 문양으로 채운다 (빈틈없이)
function fillRing(
  out: Region[],
  key: string,
  n: number,
  r1: number,
  r2: number,
  ringKind: RingKind,
  baseAngle = 0
) {
  const step = 360 / n;
  const half = step / 2;
  for (let i = 0; i < n; i++) {
    const a = step * i - 90 + baseAngle;
    const [cx, cy] = pt((r1 + r2) / 2, a);
    // 어떤 문양이든, 그 칸 전체(부채꼴)를 빈틈없이 채운다 — 색칠 안 되는 공간이 없도록.
    // 모양은 조금씩 다르게 하되 서로 맞물려 원판을 가득 메운다.
    let d: string;
    if (ringKind === "diamond") {
      // 마름모 — 밑변을 칸 폭만큼 넓혀 옆칸과 맞물리게
      d = diamond(r1, r2, a, half);
    } else if (ringKind === "triangle") {
      // 톱니 — 밑변을 칸 폭만큼 (교대로 안/밖 방향이면 지그재그로 꽉 참)
      d = i % 2 === 0 ? triangle(r1, r2, a, half) : triangle(r2, r1, a, half);
    } else if (ringKind === "petal") {
      // 연꽃잎 — 밑동을 칸 폭만큼 넓혀 옆 잎과 맞물리게
      d = petal(r1, r2, a, half);
    } else {
      // 기본 — 꽉 찬 부채꼴 (sector, dots 대체)
      d = sector(r1, r2, a - half, a + half);
    }
    out.push({ id: `${key}-f${i}`, d, cx, cy });
  }
}

function buildTemplate(kind: number): Region[] {
  const out: Region[] = [];
  const coreR = 8;
  out.push({
    id: `${kind}-core`,
    d: `M${C} ${C} m-${coreR} 0 a${coreR} ${coreR} 0 1 0 ${coreR * 2} 0 a${coreR} ${coreR} 0 1 0 -${coreR * 2} 0`,
    cx: C,
    cy: C,
  });

  // 각 폭은 문양을 섞어 촘촘하게 — 꽃잎만이 아니라 조각·마름모·톱니·구슬을 층층이
  const LAYOUTS: { n: number; r1: number; r2: number; kind: RingKind }[][] = [
    // ① 연꽃 + 고리 + 구슬 + 톱니
    [
      { n: 8, r1: 8, r2: 26, kind: "petal" },
      { n: 16, r1: 25, r2: 36, kind: "sector" },
      { n: 16, r1: 36, r2: 40, kind: "dots" },
      { n: 14, r1: 40, r2: 62, kind: "petal" },
      { n: 28, r1: 61, r2: 74, kind: "diamond" },
      { n: 36, r1: 73, r2: 88, kind: "sector" },
      { n: 44, r1: 88, r2: 98, kind: "triangle" },
    ],
    // ② 큰 꽃 + 마름모 띠 + 고리
    [
      { n: 6, r1: 8, r2: 36, kind: "petal" },
      { n: 24, r1: 35, r2: 46, kind: "diamond" },
      { n: 18, r1: 46, r2: 68, kind: "petal" },
      { n: 30, r1: 67, r2: 80, kind: "sector" },
      { n: 30, r1: 80, r2: 84, kind: "dots" },
      { n: 40, r1: 84, r2: 98, kind: "triangle" },
    ],
    // ③ 별(톱니) 중심 + 고리 + 마름모
    [
      { n: 12, r1: 8, r2: 30, kind: "triangle" },
      { n: 12, r1: 29, r2: 34, kind: "dots" },
      { n: 20, r1: 34, r2: 54, kind: "petal" },
      { n: 30, r1: 53, r2: 66, kind: "diamond" },
      { n: 30, r1: 66, r2: 82, kind: "sector" },
      { n: 40, r1: 82, r2: 98, kind: "triangle" },
    ],
    // ④ 촘촘 — 겹 많고 문양 교차
    [
      { n: 8, r1: 8, r2: 22, kind: "petal" },
      { n: 16, r1: 21, r2: 30, kind: "sector" },
      { n: 16, r1: 30, r2: 34, kind: "dots" },
      { n: 16, r1: 34, r2: 52, kind: "petal" },
      { n: 24, r1: 51, r2: 62, kind: "diamond" },
      { n: 28, r1: 62, r2: 76, kind: "sector" },
      { n: 36, r1: 76, r2: 88, kind: "petal" },
      { n: 48, r1: 88, r2: 98, kind: "triangle" },
    ],
    // ⑤ 나선 — 각도를 틀며 문양 교차
    [
      { n: 9, r1: 8, r2: 28, kind: "petal" },
      { n: 18, r1: 27, r2: 40, kind: "diamond" },
      { n: 18, r1: 46, r2: 60, kind: "petal" },
      { n: 30, r1: 59, r2: 72, kind: "sector" },
      { n: 30, r1: 72, r2: 76, kind: "dots" },
      { n: 40, r1: 76, r2: 98, kind: "triangle" },
    ],
  ];

  const layout = LAYOUTS[kind] ?? LAYOUTS[0];
  layout.forEach((ring, ri) => {
    const baseAngle = kind === 4 ? ri * 11 : ri % 2 ? 360 / ring.n / 2 : 0;
    fillRing(out, `${kind}-r${ri}`, ring.n, ring.r1, ring.r2, ring.kind, baseAngle);
  });

  return out;
}

const TEMPLATE_NAMES = ["겹연꽃", "큰 꽃", "별꽃", "촘촘 연꽃", "나선"];

export default function MandalaPage() {
  const [tpl, setTpl] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  // 탭별 색칠을 따로 보관 — { 만다라번호: { 조각id: 색 } }
  const [allFills, setAllFills] = useState<Record<number, Record<string, string>>>({});
  const [scattering, setScattering] = useState(false);
  const [restored, setRestored] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const STORAGE_KEY = "hwadu.mandala.v1";

  // 새로고침·탭이동에도 유지되도록 임시저장 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          tpl?: number;
          allFills?: Record<number, Record<string, string>>;
        };
        if (saved.allFills) setAllFills(saved.allFills);
        if (typeof saved.tpl === "number") setTpl(saved.tpl);
      }
    } catch {
      /* 저장된 값이 깨졌으면 무시 */
    }
    setRestored(true);
  }, []);

  // 색칠이 바뀔 때마다 자동 임시저장
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tpl, allFills }));
    } catch {
      /* 용량 초과 등은 무시 */
    }
  }, [tpl, allFills, restored]);

  // 현재 탭의 색칠 (파생값)
  const fills = allFills[tpl] ?? {};

  // 기존 코드가 쓰던 setFills 인터페이스 유지 — 현재 탭에만 반영
  const setFills = (
    updater:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>)
  ) => {
    setAllFills((prev) => {
      const cur = prev[tpl] ?? {};
      const nextForTpl =
        typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [tpl]: nextForTpl };
    });
  };

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

  // 탭 이동 — 지우지 않고 그 탭에 저장된 색칠을 그대로 보여줌
  const chooseTemplate = (i: number) => {
    if (scattering) return;
    setTpl(i);
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
      const count = 14 + Math.floor(Math.random() * 10);
      for (let k = 0; k < count; k++) {
        parts.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: -(0.15 + Math.random() * 0.7),
          vy: (Math.random() - 0.5) * 0.35,
          r: 0.3 + Math.random() * 0.75,
          color: c,
        });
      }
    }
    if (parts.length === 0) return;

    setScattering(true);
    setFills({});

    let raf = 0;
    const start = performance.now();
    const DURATION = 2400;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, size, size);
      for (const p of parts) {
        // 왼쪽으로 계속 밀리고(바람), 위아래로 잔잔히 떨린다 — 가루가 옆으로 흩날리듯
        // 왼쪽으로 서서히 가속(바람이 실리듯), 위아래로 잔잔히 부유
        p.vx -= 0.025;
        p.vy += (Math.random() - 0.5) * 0.08;
        p.vy *= 0.98; // 세로 흔들림은 금세 잦아든다
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - (t / DURATION) ** 1.6) * 0.92;
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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 py-6">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        曼陀羅 · 만다라 색칠
      </h1>
      <p className="rise rise-d1 mt-2 text-center text-[11px] leading-5 text-hanji-faint">
        화두를 기다리는 동안, 한 잎씩 색을 채웁니다. 다 채운 뒤에는 — 비웁니다.
      </p>

      {/* 만다라 고르기 */}
      <div className="rise rise-d1 mt-4 flex flex-wrap items-center justify-center gap-2">
        {TEMPLATE_NAMES.map((name, i) => (
          <button
            key={name}
            onClick={() => chooseTemplate(i)}
            className={`rounded-full border px-3 py-1 text-xs tracking-widest transition-colors ${
              tpl === i
                ? "border-gold/60 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 본체 — 만다라(왼쪽) + 조작부(오른쪽). 한 화면에 다 담기도록 */}
      <div className="rise rise-d2 mt-5 flex w-full flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
        {/* 만다라 */}
        <div ref={svgWrapRef} className="relative w-full max-w-[min(58vh,440px)]">
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

        {/* 조작부 — 색 → 진행 → 비우기, 세로로. 오른쪽 배치 */}
        <div className="flex w-full max-w-[220px] flex-col items-center">
          <p className="mb-2 text-[10px] tracking-[0.3em] text-hanji-faint">색</p>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-5">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c === "transparent" ? "지움" : c}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
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

          {/* 진행 */}
          <p className="mt-5 text-center text-[11px] tracking-wide text-hanji-faint">
            {done ? (
              <span className="text-gold-soft">다 채우셨습니다 — 이제 비울 때</span>
            ) : (
              <>
                {filledCount} / {regions.length} 잎 채움
              </>
            )}
          </p>

          {/* 비우기 — 색 바로 밑 */}
          <button
            onClick={clear}
            disabled={scattering}
            className={`mt-3 w-full rounded-[10px] border px-6 py-2.5 text-[13px] tracking-[0.2em] transition-colors disabled:opacity-50 ${
              done
                ? "btn-obang text-hanji hover:opacity-90"
                : "border-ink-3 text-hanji-dim hover:border-vermilion/50 hover:text-vermilion"
            }`}
          >
            {scattering ? "흩어지는 중…" : "비우기"}
          </button>

          <p className="mt-4 text-center text-[10px] leading-5 text-hanji-faint">
            모래로 쌓은 만다라는 완성되는 순간 쓸려 나갑니다.
            <br />채움에 매이지 않는 연습.
          </p>

          <Link
            href="/"
            className="mt-4 text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
          >
            ← 화두로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}