"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 색칠하기 — 화두를 기다리는 동안의 수행.
// 겹겹이 세밀한 만다라 다섯 폭. 수백 개의 칸을 하나씩 색으로 채운다.
// 다 채운 뒤 '비우기' — 모래 만다라처럼, 색이 모래알로 흩어져 사라진다.
// 채움도 비움도 수행. 모두 브라우저 안에서 — 서버도 저장 비용도 없다.
// ────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

// 다양한 색 — 오방색 + 파스텔·중간톤
const PALETTE = [
  "#D9B45B", // 금
  "#E8A33D", // 주황
  "#C1553B", // 단청 적
  "#E36A6A", // 연분홍 적
  "#D98CA6", // 분홍
  "#7A4B6B", // 자주
  "#5E7FB2", // 오방 청
  "#6FB0C4", // 청록
  "#4E9E86", // 옥빛
  "#8CA36B", // 연둣빛
  "#C9D66B", // 라임
  "#EDE6D4", // 한지
  "#B99A54", // 묵금
  "transparent", // 지움(먹빛)
];

const C = 100; // 중심

const pt = (r: number, aDeg: number): [number, number] => {
  const a = (aDeg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

// 고리 조각
function sector(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

type Region = { id: string; d: string; cx: number; cy: number };

function buildTemplate(kind: number): Region[] {
  const out: Region[] = [];
  const add = (id: string, d: string, r: number, aDeg: number) => {
    const [cx, cy] = pt(r, aDeg);
    out.push({ id, d, cx, cy });
  };

  // 한 겹(ring)을 빈틈없는 조각으로 가득 채운다 — 색칠 안 되는 공간이 없도록
  const fillRing = (
    key: string,
    n: number,
    r1: number,
    r2: number,
    offset = 0
  ) => {
    const step = 360 / n;
    for (let i = 0; i < n; i++) {
      const a1 = step * i - 90 + offset;
      // gap=0 → 조각끼리 딱 붙어 빈틈이 없다 (경계선은 stroke로만 보인다)
      add(`${key}-${i}`, sector(r1, r2, a1, a1 + step), (r1 + r2) / 2, a1 + step / 2);
    }
  };

  // 다섯 폭 — 겹 수와 조각 수만 다르게, 모두 빈틈없이 꽉 찬다
  const LAYOUTS: { n: number; r1: number; r2: number }[][] = [
    // ① 겹연꽃 결
    [
      { n: 1, r1: 0, r2: 8 },
      { n: 8, r1: 8, r2: 22 },
      { n: 12, r1: 22, r2: 38 },
      { n: 16, r1: 38, r2: 54 },
      { n: 24, r1: 54, r2: 70 },
      { n: 32, r1: 70, r2: 84 },
      { n: 40, r1: 84, r2: 98 },
    ],
    // ② 수레바퀴
    [
      { n: 1, r1: 0, r2: 7 },
      { n: 8, r1: 7, r2: 20 },
      { n: 16, r1: 20, r2: 34 },
      { n: 24, r1: 34, r2: 50 },
      { n: 32, r1: 50, r2: 66 },
      { n: 40, r1: 66, r2: 82 },
      { n: 48, r1: 82, r2: 98 },
    ],
    // ③ 별꽃 — 촘촘
    [
      { n: 1, r1: 0, r2: 6 },
      { n: 12, r1: 6, r2: 22 },
      { n: 12, r1: 22, r2: 38 },
      { n: 24, r1: 38, r2: 56 },
      { n: 24, r1: 56, r2: 74 },
      { n: 36, r1: 74, r2: 88 },
      { n: 36, r1: 88, r2: 98 },
    ],
    // ④ 격자
    [
      { n: 1, r1: 0, r2: 8 },
      { n: 6, r1: 8, r2: 24 },
      { n: 12, r1: 24, r2: 40 },
      { n: 18, r1: 40, r2: 56 },
      { n: 24, r1: 56, r2: 72 },
      { n: 30, r1: 72, r2: 86 },
      { n: 36, r1: 86, r2: 98 },
    ],
    // ⑤ 나선 — 겹마다 각도를 살짝 틀어 소용돌이
    [
      { n: 1, r1: 0, r2: 7 },
      { n: 10, r1: 7, r2: 24 },
      { n: 15, r1: 24, r2: 42 },
      { n: 20, r1: 42, r2: 60 },
      { n: 30, r1: 60, r2: 78 },
      { n: 40, r1: 78, r2: 98 },
    ],
  ];

  const layout = LAYOUTS[kind] ?? LAYOUTS[0];
  layout.forEach((ring, ri) => {
    if (ring.n === 1) {
      // 중심 원판
      add(`${kind}-core`, `M${C} ${C} m-${ring.r2} 0 a${ring.r2} ${ring.r2} 0 1 0 ${ring.r2 * 2} 0 a${ring.r2} ${ring.r2} 0 1 0 -${ring.r2 * 2} 0`, 0, 0);
      return;
    }
    // 나선(kind 4)은 겹마다 각도 오프셋, 그 외는 교차 오프셋
    const offset =
      kind === 4
        ? (ri * 360) / ring.n / 3
        : ri % 2
          ? 360 / ring.n / 2
          : 0;
    fillRing(`${kind}-r${ri}`, ring.n, ring.r1, ring.r2, offset);
  });

  return out;
}

const TEMPLATE_NAMES = ["겹연꽃", "수레바퀴", "별꽃", "격자", "나선"];

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
  const done = filledCount >= Math.floor(regions.length * 0.9);

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

  // ── 모래 흩어지는 이펙트 ──────────────────────────────────────
  const runSandEffect = (onDone: () => void) => {
    const wrap = svgWrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) {
      onDone();
      return;
    }
    const size = wrap.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onDone();
      return;
    }
    ctx.scale(dpr, dpr);
    const scale = size / 200; // svg 좌표(200) → 픽셀

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
      life: number;
    };
    const parts: P[] = [];
    for (const reg of regions) {
      const c = fills[reg.id];
      if (!c || c === "transparent") continue;
      const px = reg.cx * scale;
      const py = reg.cy * scale;
      const count = 5 + Math.floor(Math.random() * 4);
      for (let k = 0; k < count; k++) {
        parts.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.4 + Math.random() * 1.2,
          r: 0.8 + Math.random() * 1.6,
          color: c,
          life: 1,
        });
      }
    }

    if (parts.length === 0) {
      onDone();
      return;
    }

    setScattering(true);
    // svg는 즉시 비운다 — 모래만 남아 떨어지도록
    setFills({});

    let raf = 0;
    const start = performance.now();
    const DURATION = 1600;

    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, size, size);
      for (const p of parts) {
        p.vy += 0.05; // 중력
        p.vx += (Math.random() - 0.5) * 0.06; // 바람
        p.x += p.vx;
        p.y += p.vy;
        p.life = Math.max(0, 1 - t / DURATION);
        ctx.globalAlpha = p.life * 0.9;
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
        onDone();
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
      runSandEffect(() => {});
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

      {/* 만다라 캔버스 (SVG) + 모래 오버레이(canvas) */}
      <div ref={svgWrapRef} className="rise rise-d2 relative mt-7 w-full max-w-[460px]">
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
              stroke="rgba(217,180,91,0.32)"
              strokeWidth="0.4"
              style={{ cursor: scattering ? "default" : "pointer", transition: "fill 0.12s" }}
            />
          ))}
        </svg>
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0"
        />
      </div>

      {/* 색 팔레트 */}
      <div className="rise rise-d3 mt-7 flex max-w-[420px] flex-wrap items-center justify-center gap-2.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={c === "transparent" ? "지움" : c}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              color === c ? "scale-110 border-hanji" : "border-transparent hover:scale-105"
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
      <p className="rise rise-d3 mt-6 text-[12px] tracking-wide text-hanji-faint">
        {done ? (
          <span className="text-gold-soft">
            만다라를 다 채우셨습니다 — 이제 비울 때입니다
          </span>
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
