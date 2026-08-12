"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 — 화두를 기다리는 동안의 사유. 두 갈래로 즐긴다.
//  ① 그리기: 손끝으로 그으면 여러 갈래로 대칭 복제(쉬익쉬익). 확대·이동도.
//  ② 색칠하기: 겹겹이 촘촘한 도안(별꽃·연꽃 등)의 모든 칸을 색으로 채운다.
// 모두 브라우저 안에서 — 서버도 저장 비용도 없다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const PALETTE = [
  "#D9B45B", "#E8A33D", "#C1553B", "#E36A6A", "#D98CA6",
  "#B0587F", "#7A4B6B", "#5E7FB2", "#6FB0C4", "#4E9E86",
  "#8CA36B", "#C9D66B", "#EDE6D4", "#F4EBD0", "#9A6BB0",
];

// ══════════════ 색칠 도안 만들기 ══════════════
const C = 100;
const pt = (r: number, aDeg: number): [number, number] => {
  const a = (aDeg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
// 빈틈없는 부채꼴 조각
function sector(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

type Region = { id: string; d: string };

// 한 겹을 조각으로 빈틈없이 채운다 (모든 칸이 색칠 가능)
function ring(out: Region[], key: string, n: number, r1: number, r2: number, offset = 0) {
  const step = 360 / n;
  for (let i = 0; i < n; i++) {
    const a1 = step * i - 90 + offset;
    out.push({ id: `${key}-${i}`, d: sector(r1, r2, a1, a1 + step) });
  }
}

// 다섯 도안 — 겹 수·조각 수만 다르게, 전부 촘촘하고 빈틈이 없다
const LAYOUTS: { n: number; r1: number; r2: number }[][] = [
  // ① 겹연꽃
  [
    { n: 1, r1: 0, r2: 9 },
    { n: 8, r1: 9, r2: 24 },
    { n: 12, r1: 24, r2: 40 },
    { n: 16, r1: 40, r2: 56 },
    { n: 24, r1: 56, r2: 72 },
    { n: 32, r1: 72, r2: 86 },
    { n: 40, r1: 86, r2: 98 },
  ],
  // ② 수레바퀴
  [
    { n: 1, r1: 0, r2: 8 },
    { n: 8, r1: 8, r2: 22 },
    { n: 16, r1: 22, r2: 38 },
    { n: 24, r1: 38, r2: 54 },
    { n: 32, r1: 54, r2: 70 },
    { n: 40, r1: 70, r2: 85 },
    { n: 48, r1: 85, r2: 98 },
  ],
  // ③ 별꽃
  [
    { n: 1, r1: 0, r2: 7 },
    { n: 12, r1: 7, r2: 24 },
    { n: 12, r1: 24, r2: 40 },
    { n: 24, r1: 40, r2: 58 },
    { n: 24, r1: 58, r2: 76 },
    { n: 36, r1: 76, r2: 88 },
    { n: 36, r1: 88, r2: 98 },
  ],
  // ④ 촘촘꽃
  [
    { n: 1, r1: 0, r2: 8 },
    { n: 6, r1: 8, r2: 22 },
    { n: 12, r1: 22, r2: 36 },
    { n: 18, r1: 36, r2: 52 },
    { n: 24, r1: 52, r2: 68 },
    { n: 30, r1: 68, r2: 84 },
    { n: 36, r1: 84, r2: 98 },
  ],
  // ⑤ 나선
  [
    { n: 1, r1: 0, r2: 7 },
    { n: 10, r1: 7, r2: 24 },
    { n: 15, r1: 24, r2: 42 },
    { n: 20, r1: 42, r2: 60 },
    { n: 30, r1: 60, r2: 78 },
    { n: 40, r1: 78, r2: 98 },
  ],
];
const COLOR_NAMES = ["겹연꽃", "수레바퀴", "별꽃", "촘촘꽃", "나선"];

function buildTemplate(kind: number): Region[] {
  const out: Region[] = [];
  const layout = LAYOUTS[kind] ?? LAYOUTS[0];
  layout.forEach((r, ri) => {
    if (r.n === 1) {
      out.push({
        id: `${kind}-core`,
        d: `M${C} ${C} m-${r.r2} 0 a${r.r2} ${r.r2} 0 1 0 ${r.r2 * 2} 0 a${r.r2} ${r.r2} 0 1 0 -${r.r2 * 2} 0`,
      });
      return;
    }
    const off = kind === 4 ? (ri * 360) / r.n / 3 : ri % 2 ? 360 / r.n / 2 : 0;
    ring(out, `${kind}-r${ri}`, r.n, r.r1, r.r2, off);
  });
  return out;
}

// ══════════════ 페이지 ══════════════
type Mode = "draw" | "color";
const SEGMENTS = [6, 8, 12, 16, 24];

export default function MandalaPage() {
  const [mode, setMode] = useState<Mode>("color");
  const [color, setColor] = useState(PALETTE[0]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-6">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        曼陀羅 · 만다라
      </h1>

      {/* 모드 전환 */}
      <div className="rise rise-d1 mt-4 flex items-center gap-2">
        <button
          onClick={() => setMode("color")}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            mode === "color" ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          🎨 색칠하기
        </button>
        <button
          onClick={() => setMode("draw")}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            mode === "draw" ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          ✍ 그리기
        </button>
      </div>

      {/* 공통 색 팔레트 */}
      <div className="rise rise-d2 mt-5 flex max-w-[420px] flex-wrap items-center justify-center gap-2.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={c}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              color === c ? "scale-110 border-hanji" : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {mode === "color" ? (
        <ColorMode color={color} />
      ) : (
        <DrawMode color={color} />
      )}

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

// ── 색칠 모드 ──────────────────────────────────────────
function ColorMode({ color }: { color: string }) {
  const [tpl, setTpl] = useState(0);
  const [fills, setFills] = useState<Record<string, string>>({});
  const regions = useMemo(() => buildTemplate(tpl), [tpl]);

  const paint = (id: string) => {
    setFills((prev) => {
      const next = { ...prev };
      if (color === "transparent") delete next[id];
      else next[id] = color;
      return next;
    });
  };

  return (
    <>
      <div className="rise rise-d2 mt-5 flex flex-wrap items-center justify-center gap-2">
        {COLOR_NAMES.map((name, i) => (
          <button
            key={name}
            onClick={() => {
              setTpl(i);
              setFills({});
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs tracking-widest transition-colors ${
              tpl === i ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="rise rise-d3 mt-5 w-full max-w-[440px]">
        <svg
          viewBox="0 0 200 200"
          className="h-auto w-full select-none rounded-full border border-ink-3 bg-ink-2/40"
        >
          <circle cx="100" cy="100" r="98" fill="none" stroke="rgba(217,180,91,0.1)" />
          {regions.map((r) => (
            <path
              key={r.id}
              d={r.d}
              onClick={() => paint(r.id)}
              fill={fills[r.id] ?? "transparent"}
              stroke="rgba(217,180,91,0.35)"
              strokeWidth="0.35"
              style={{ cursor: "pointer", transition: "fill 0.1s" }}
            />
          ))}
        </svg>
      </div>

      <p className="rise rise-d3 mt-4 text-[11px] tracking-wide text-hanji-faint">
        칸을 눌러 색을 채우십시오
      </p>
      <div className="rise rise-d3 mt-4">
        <button
          onClick={() => setFills({})}
          className="rounded-[10px] border border-ink-3 px-6 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
        >
          비우기
        </button>
      </div>
    </>
  );
}

// ── 그리기 모드 ──────────────────────────────────────────
function DrawMode({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState(12);
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState(3);
  const [drawing, setDrawing] = useState(true); // true=그리기, false=확대·이동
  const [empty, setEmpty] = useState(true);

  const view = useRef({ scale: 1, x: 0, y: 0 });
  const stroke = useRef({ active: false, last: null as null | { x: number; y: number } });
  const pinch = useRef({ active: false, dist: 0 });
  const pan = useRef({ active: false, x: 0, y: 0 });
  const SIZE = 1000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    guides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const guides = () => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = "rgba(217,180,91,0.1)";
    ctx.lineWidth = 1;
    const c = SIZE / 2;
    for (let r = 70; r < c; r += 80) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < segments; i++) {
      const a = (Math.PI * 2 * i) / segments;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c);
      ctx.stroke();
    }
    ctx.restore();
  };

  const clearAll = () => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    guides();
    setEmpty(true);
  };

  const toCanvas = (cx: number, cy: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((cx - rect.left) / rect.width) * SIZE,
      y: ((cy - rect.top) / rect.height) * SIZE,
    };
  };

  const strokeSym = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = getCtx();
    if (!ctx) return;
    const c = SIZE / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = brush;
    ctx.globalAlpha = 0.92;
    const fx = from.x - c, fy = from.y - c, tx = to.x - c, ty = to.y - c;
    for (let i = 0; i < segments; i++) {
      const ang = (Math.PI * 2 * i) / segments;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const rot = (px: number, py: number) => ({ x: c + px * cos - py * sin, y: c + px * sin + py * cos });
      const a = rot(fx, fy), b = rot(tx, ty);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (mirror) {
        const am = rot(-fx, fy), bm = rot(-tx, ty);
        ctx.beginPath();
        ctx.moveTo(am.x, am.y);
        ctx.lineTo(bm.x, bm.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const applyTransform = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const v = view.current;
    wrap.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (drawing) {
      stroke.current.active = true;
      stroke.current.last = toCanvas(e.clientX, e.clientY);
      if (empty) setEmpty(false);
    } else {
      pan.current = { active: true, x: e.clientX - view.current.x, y: e.clientY - view.current.y };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (drawing && stroke.current.active && stroke.current.last) {
      const p = toCanvas(e.clientX, e.clientY);
      strokeSym(stroke.current.last, p);
      stroke.current.last = p;
    } else if (!drawing && pan.current.active) {
      view.current.x = e.clientX - pan.current.x;
      view.current.y = e.clientY - pan.current.y;
      applyTransform();
    }
  };
  const onUp = () => {
    stroke.current.active = false;
    stroke.current.last = null;
    pan.current.active = false;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (drawing) return;
    const v = view.current;
    v.scale = Math.min(4, Math.max(0.5, v.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
    applyTransform();
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (drawing || e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current = { active: true, dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (drawing || !pinch.current.active || e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    view.current.scale = Math.min(4, Math.max(0.5, view.current.scale * (dist / pinch.current.dist)));
    pinch.current.dist = dist;
    applyTransform();
  };

  const resetView = () => {
    view.current = { scale: 1, x: 0, y: 0 };
    applyTransform();
  };

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0D0B09";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
    const link = document.createElement("a");
    link.download = `mandala-${Date.now()}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
  };

  return (
    <>
      <p className="rise rise-d2 mt-4 text-center text-[12px] leading-6 text-hanji-faint">
        {drawing
          ? "손끝으로 그으면, 여러 갈래로 함께 피어납니다."
          : "손가락으로 늘리고 좁혀 — 확대·축소·이동합니다."}
      </p>

      <div className="rise rise-d2 relative mt-4 aspect-square w-full max-w-[440px] overflow-hidden rounded-full border border-ink-3 bg-ink-2/40">
        <div ref={wrapRef} className="h-full w-full origin-center will-change-transform">
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            className="h-full w-full touch-none"
            style={{ cursor: drawing ? "crosshair" : "grab" }}
          />
        </div>
        {empty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[12px] tracking-wide text-hanji-faint">
            가운데에서 바깥으로
            <br />그어 보십시오
          </p>
        )}
      </div>

      <div className="rise rise-d3 mt-5 flex items-center gap-2">
        <button
          onClick={() => setDrawing(true)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            drawing ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          ✍ 연달아 그리기
        </button>
        <button
          onClick={() => setDrawing(false)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            !drawing ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          🔍 확대·이동
        </button>
        {!drawing && (
          <button
            onClick={resetView}
            className="rounded-full border border-ink-3 px-3 py-2 text-xs text-hanji-faint hover:text-hanji"
          >
            원위치
          </button>
        )}
      </div>

      <div className="rise rise-d3 mt-4 flex flex-wrap items-center justify-center gap-2.5">
        <span className="text-[11px] tracking-[0.2em] text-hanji-faint">갈래</span>
        {SEGMENTS.map((n) => (
          <button
            key={n}
            onClick={() => setSegments(n)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              segments === n ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setMirror((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            mirror ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          거울
        </button>
      </div>
      <div className="rise rise-d3 mt-4 flex w-full max-w-[280px] items-center gap-3">
        <span className="text-[11px] tracking-[0.2em] text-hanji-faint">붓</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
          className="mandala-range flex-1"
        />
      </div>

      <div className="rise rise-d3 mt-6 flex items-center gap-3">
        <button
          onClick={clearAll}
          className="rounded-[10px] border border-ink-3 px-6 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion"
        >
          비우기
        </button>
        <button
          onClick={save}
          disabled={empty}
          className="btn-obang px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji transition-opacity enabled:hover:opacity-90 disabled:opacity-30"
        >
          간직하기
        </button>
      </div>
    </>
  );
}
