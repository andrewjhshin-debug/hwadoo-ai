"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 — 화두를 기다리는 동안의 사유.
// · 손가락(마우스): 기본은 확대·축소·이동 (핀치 줌 / 휠 / 드래그 이동)
// · "연달아 그리기" 버튼을 켜면 — 손을 그으면 여러 갈래로 대칭 복제되어
//   순식간에 만다라가 피어난다(쉬익쉬익).
// · 색을 고르고, 갈래 수를 정하고, 다 그리면 비우거나 간직한다.
// 모두 브라우저 안에서 — 서버도 저장 비용도 없다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PALETTE = [
  "#D9B45B", "#E8A33D", "#C1553B", "#E36A6A", "#D98CA6",
  "#B0587F", "#7A4B6B", "#5E7FB2", "#6FB0C4", "#4E9E86",
  "#8CA36B", "#C9D66B", "#EDE6D4", "#F4EBD0", "#9A6BB0",
];

const SEGMENTS = [6, 8, 12, 16, 24];

export default function MandalaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [color, setColor] = useState(PALETTE[0]);
  const [segments, setSegments] = useState(12);
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState(3);
  const [drawMode, setDrawMode] = useState(true); // true=연달아 그리기, false=확대·이동
  const [empty, setEmpty] = useState(true);

  // 뷰 변환(줌/이동)
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const draw = useRef({ active: false, last: null as null | { x: number; y: number } });
  const pinch = useRef({ active: false, dist: 0, cx: 0, cy: 0 });
  const pan = useRef({ active: false, x: 0, y: 0 });

  // 캔버스 초기화 (고정 논리 크기 1000, 화면엔 꽉 차게)
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
    drawGuides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  // 은은한 가이드(동심원 + 방사선) — 어디를 그릴지 안내
  const drawGuides = () => {
    const ctx = getCtx();
    if (!ctx) return;
    // 그림은 지우지 않고 가이드만: 별도 오프스크린이 이상적이나, 최초/비우기 때만 호출
    ctx.save();
    ctx.strokeStyle = "rgba(217,180,91,0.10)";
    ctx.lineWidth = 1;
    const c = SIZE / 2;
    for (let r = 60; r < c; r += 70) {
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
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawGuides();
    setEmpty(true);
  };

  // 화면 좌표 → 캔버스 논리 좌표 (뷰 변환 역산)
  const toCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // 화면상 캔버스는 CSS로 rect 크기, transform(scale/translate)은 wrap에 적용
    const px = ((clientX - rect.left) / rect.width) * SIZE;
    const py = ((clientY - rect.top) / rect.height) * SIZE;
    return { x: px, y: py };
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

  // ── 포인터 이벤트 ──
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (drawMode) {
      draw.current.active = true;
      draw.current.last = toCanvas(e.clientX, e.clientY);
      if (empty) setEmpty(false);
    } else {
      pan.current = { active: true, x: e.clientX - view.current.x, y: e.clientY - view.current.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drawMode && draw.current.active && draw.current.last) {
      const p = toCanvas(e.clientX, e.clientY);
      strokeSym(draw.current.last, p);
      draw.current.last = p;
    } else if (!drawMode && pan.current.active) {
      view.current.x = e.clientX - pan.current.x;
      view.current.y = e.clientY - pan.current.y;
      applyTransform();
    }
  };

  const onPointerUp = () => {
    draw.current.active = false;
    draw.current.last = null;
    pan.current.active = false;
  };

  // 휠 줌 (데스크톱)
  const onWheel = (e: React.WheelEvent) => {
    if (drawMode) return;
    e.preventDefault();
    const v = view.current;
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    v.scale = Math.min(4, Math.max(0.5, v.scale * delta));
    applyTransform();
  };

  // 핀치 줌 (모바일) — 확대·이동 모드일 때
  const onTouchStart = (e: React.TouchEvent) => {
    if (drawMode || e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current.active = true;
    pinch.current.dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (drawMode || !pinch.current.active || e.touches.length < 2) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const v = view.current;
    v.scale = Math.min(4, Math.max(0.5, v.scale * (dist / pinch.current.dist)));
    pinch.current.dist = dist;
    applyTransform();
  };
  const onTouchEnd = () => {
    pinch.current.active = false;
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-6">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        曼陀羅 · 만다라
      </h1>
      <p className="rise rise-d1 mt-2 text-center text-[12px] leading-6 text-hanji-faint">
        {drawMode
          ? "손끝으로 그으면, 여러 갈래로 함께 피어납니다."
          : "손가락으로 늘리고 좁혀 — 확대·축소·이동합니다."}
      </p>

      {/* 캔버스 무대 */}
      <div className="rise rise-d2 mt-5 aspect-square w-full max-w-[460px] overflow-hidden rounded-full border border-ink-3 bg-ink-2/40">
        <div ref={wrapRef} className="h-full w-full origin-center will-change-transform">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="h-full w-full touch-none"
            style={{ cursor: drawMode ? "crosshair" : "grab" }}
          />
        </div>
      </div>
      {empty && (
        <p className="pointer-events-none -mt-[52%] mb-[calc(52%-1rem)] text-center text-[12px] tracking-wide text-hanji-faint">
          가운데에서 바깥으로<br />그어 보십시오
        </p>
      )}

      {/* 모드 전환 — 연달아 그리기 / 확대·이동 */}
      <div className="rise rise-d3 mt-6 flex items-center gap-2">
        <button
          onClick={() => setDrawMode(true)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            drawMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          ✍ 연달아 그리기
        </button>
        <button
          onClick={() => setDrawMode(false)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            !drawMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          🔍 확대·이동
        </button>
        {!drawMode && (
          <button
            onClick={resetView}
            className="rounded-full border border-ink-3 px-3 py-2 text-xs text-hanji-faint hover:text-hanji"
          >
            원위치
          </button>
        )}
      </div>

      {/* 색 */}
      <div className="rise rise-d3 mt-5 flex max-w-[420px] flex-wrap items-center justify-center gap-2.5">
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

      {/* 갈래 + 거울 + 붓 */}
      <div className="rise rise-d3 mt-5 flex flex-wrap items-center justify-center gap-2.5">
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

      {/* 비우기 · 간직하기 */}
      <div className="rise rise-d3 mt-7 flex items-center gap-3">
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
          만다라 간직하기
        </button>
      </div>

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
