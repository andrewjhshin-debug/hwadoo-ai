"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 그리기 — 화두를 기다리는 동안의 사유.
// 한 획을 그으면 대칭축(기본 12)을 따라 여러 갈래로 복제되어,
// 순식간에 만다라가 피어난다. 손끝의 움직임이 곧 무늬가 된다.
// 모든 것은 브라우저 안에서 — 서버도, 저장 비용도 없다.
// ────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// 오방색 — 금·적·청·한지·먹
const PALETTE = [
  { name: "금", color: "#D9B45B" },
  { name: "단청 적", color: "#C1553B" },
  { name: "오방 청", color: "#5E7FB2" },
  { name: "한지", color: "#EDE6D4" },
  { name: "연둣빛", color: "#8CA36B" },
];

const SYMMETRY_OPTIONS = [6, 8, 12, 16];

export default function MandalaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState(PALETTE[0].color);
  const [symmetry, setSymmetry] = useState(12);
  const [width, setWidth] = useState(2.5);
  const [mirror, setMirror] = useState(true);
  const [empty, setEmpty] = useState(true);

  // 캔버스 초기화 (정사각형, 고해상도)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const size = Math.min(parent.clientWidth, 520);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const cssSize = () => {
    const c = canvasRef.current;
    return c ? c.clientWidth : 0;
  };

  const pointFrom = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // 한 획을 대칭축을 따라 복제해 그린다
  const drawSymmetric = (
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    const ctx = getCtx();
    if (!ctx) return;
    const s = cssSize();
    const cx = s / 2;
    const cy = s / 2;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.9;

    const fx = from.x - cx;
    const fy = from.y - cy;
    const tx = to.x - cx;
    const ty = to.y - cy;

    for (let i = 0; i < symmetry; i++) {
      const ang = (Math.PI * 2 * i) / symmetry;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);

      // 회전 복제
      const rot = (px: number, py: number) => ({
        x: cx + px * cos - py * sin,
        y: cy + px * sin + py * cos,
      });

      const a = rot(fx, fy);
      const b = rot(tx, ty);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // 거울 대칭 (좌우 반전 획도 함께)
      if (mirror) {
        const am = rot(-fx, fy);
        const bm = rot(-tx, ty);
        ctx.beginPath();
        ctx.moveTo(am.x, am.y);
        ctx.lineTo(bm.x, bm.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pointFrom(e);
    if (empty) setEmpty(false);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = pointFrom(e);
    drawSymmetric(last.current, p);
    last.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const ctx = getCtx();
    const c = canvasRef.current;
    if (!ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  // 만다라를 이미지로 저장 (배경 먹빛 깔아서)
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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-6 py-12">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        曼陀羅 · 만다라
      </h1>
      <p className="rise rise-d1 mt-3 text-center text-[12px] leading-6 text-hanji-faint">
        화두를 기다리는 동안, 손끝으로 하나의 원을 그립니다.
        <br />한 획이 여러 갈래로 피어나 무늬가 됩니다.
      </p>

      {/* 캔버스 */}
      <div className="rise rise-d2 mt-8 flex w-full justify-center">
        <div className="relative w-full max-w-[520px]">
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            className="mx-auto touch-none rounded-full border border-ink-3 bg-ink-2/40"
            style={{ aspectRatio: "1 / 1" }}
          />
          {empty && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[12px] tracking-wide text-hanji-faint">
              가운데에서 바깥으로
              <br />손끝을 그어 보십시오
            </p>
          )}
        </div>
      </div>

      {/* 색 */}
      <div className="rise rise-d3 mt-7 flex items-center gap-3">
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
            }`}
            style={{ backgroundColor: p.color }}
          />
        ))}
      </div>

      {/* 대칭 수 */}
      <div className="rise rise-d3 mt-5 flex items-center gap-2.5">
        <span className="mr-1 text-[11px] tracking-[0.2em] text-hanji-faint">
          갈래
        </span>
        {SYMMETRY_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => setSymmetry(n)}
            className={`rounded-full border px-3.5 py-1.5 text-xs tracking-widest transition-colors ${
              symmetry === n
                ? "border-gold/60 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setMirror((v) => !v)}
          className={`ml-1 rounded-full border px-3.5 py-1.5 text-xs tracking-widest transition-colors ${
            mirror
              ? "border-gold/60 text-gold"
              : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          거울
        </button>
      </div>

      {/* 붓 굵기 */}
      <div className="rise rise-d3 mt-5 flex w-full max-w-[280px] items-center gap-3">
        <span className="text-[11px] tracking-[0.2em] text-hanji-faint">붓</span>
        <input
          type="range"
          min={1}
          max={8}
          step={0.5}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="mandala-range flex-1"
        />
      </div>

      {/* 지우기 · 간직하기 */}
      <div className="rise rise-d3 mt-8 flex items-center gap-3">
        <button
          onClick={clear}
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

      <p className="rise rise-d3 mt-10 text-center text-[11px] leading-6 text-hanji-faint">
        정해진 모양은 없습니다. 지금 손이 가는 대로 —
        <br />그 원이 오늘의 마음입니다.
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
