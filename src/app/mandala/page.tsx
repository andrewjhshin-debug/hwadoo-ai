"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 — 화두를 기다리는 동안의 수행. 두 갈래.
//  ① 색칠하기: 겹겹의 꽃잎·잎·원으로 짜인 정교한 도안. 칠할 칸이 아주 많다.
//     · 좌클릭 = 한 칸  · 드래그 = 연달아  · 우클릭 = 그 칸 비우기
//     · '빈칸' 색으로 지운다.
//  ② 그리기: 손끝으로 그으면 여러 갈래로 대칭 복제. 되돌아가기 지원.
//     · 가이드(갈래선)와 그림은 별개 층 — 갈래·붓을 바꿔도 그림은 그대로.
//     · 웹/모바일 모두 그리기가 기본. 모바일은 두 손가락 확대 + 손으로 옮기기 토글 + 원위치.
// 만다라는 간직하지 않는다 — 비움도 수행. 비울 때 색이 가루로 바람에 흩어진다.
// 하던 만다라는 자동 임시저장되어, 다른 일 하다 돌아와도 그대로 떠 있다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const PALETTE = [
  "#D9B45B", "#E8A33D", "#C1553B", "#E36A6A", "#D98CA6",
  "#B0587F", "#7A4B6B", "#5E7FB2", "#6FB0C4", "#4E9E86",
  "#8CA36B", "#C9D66B", "#EDE6D4", "#F4EBD0", "#9A6BB0",
];
const ERASE = "erase";
const MKEY = "hwadoo-mandala-v1";

// ══════════════ 기하 ══════════════
const C = 100;
const P = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
function sectorPath(r1: number, r2: number, a1: number, a2: number): string {
  const [x1, y1] = P(r2, a1);
  const [x2, y2] = P(r2, a2);
  const [x3, y3] = P(r1, a2);
  const [x4, y4] = P(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}
function petalPath(r1: number, r2: number, aC: number, halfW: number): string {
  const [ix, iy] = P(r1, aC);
  const [ox, oy] = P(r2, aC);
  const rm = (r1 + r2) / 2;
  const [lx, ly] = P(rm, aC - halfW);
  const [rx, ry] = P(rm, aC + halfW);
  return `M${ix} ${iy} Q${lx} ${ly} ${ox} ${oy} Q${rx} ${ry} ${ix} ${iy} Z`;
}
function circlePath(r: number, a: number, rr: number): string {
  const [cx, cy] = P(r, a);
  return `M${cx - rr} ${cy} a${rr} ${rr} 0 1 0 ${2 * rr} 0 a${rr} ${rr} 0 1 0 ${-2 * rr} 0`;
}

type Cell = { id: string; d: string; cx: number; cy: number };
type Layer =
  | { t: "core"; r: number }
  | { t: "sectors"; n: number; r1: number; r2: number; off?: number }
  | { t: "petals"; n: number; r1: number; r2: number; w: number; off?: number }
  | { t: "dots"; n: number; r: number; rr: number; off?: number };

// 겹을 더 촘촘히 — 칠할 칸을 대폭 늘렸다 (원형 유지)
const TEMPLATES: { name: string; layers: Layer[] }[] = [
  {
    // 중심에 겹꽃, 바깥은 부채꼴 링으로 원 전체를 빈틈없이 채운다.
    name: "겹연꽃",
    layers: [
      { t: "core", r: 10 },
      { t: "petals", n: 8, r1: 8, r2: 28, w: 20 },
      { t: "petals", n: 8, r1: 8, r2: 22, w: 15, off: 22.5 },
      { t: "sectors", n: 12, r1: 28, r2: 42 },
      { t: "sectors", n: 12, r1: 42, r2: 55, off: 15 },
      { t: "sectors", n: 18, r1: 55, r2: 68 },
      { t: "sectors", n: 18, r1: 68, r2: 82, off: 10 },
      { t: "sectors", n: 24, r1: 82, r2: 92 },
      { t: "sectors", n: 24, r1: 92, r2: 99, off: 7.5 },
    ],
  },
  {
    name: "수레바퀴",
    layers: [
      { t: "core", r: 11 },
      { t: "sectors", n: 8, r1: 11, r2: 26 },
      { t: "sectors", n: 8, r1: 26, r2: 42, off: 22.5 },
      { t: "sectors", n: 16, r1: 42, r2: 57 },
      { t: "sectors", n: 16, r1: 57, r2: 72, off: 11.25 },
      { t: "sectors", n: 24, r1: 72, r2: 86 },
      { t: "sectors", n: 24, r1: 86, r2: 99, off: 7.5 },
    ],
  },
  {
    name: "별꽃",
    layers: [
      { t: "core", r: 9 },
      { t: "petals", n: 6, r1: 7, r2: 30, w: 24 },
      { t: "petals", n: 6, r1: 7, r2: 21, w: 16, off: 30 },
      { t: "sectors", n: 12, r1: 30, r2: 44 },
      { t: "sectors", n: 12, r1: 44, r2: 57, off: 15 },
      { t: "petals", n: 12, r1: 57, r2: 74, w: 12 },
      { t: "sectors", n: 18, r1: 74, r2: 88, off: 10 },
      { t: "sectors", n: 24, r1: 88, r2: 99 },
    ],
  },
  {
    name: "촘촘꽃",
    layers: [
      { t: "core", r: 9 },
      { t: "petals", n: 6, r1: 7, r2: 24, w: 26 },
      { t: "petals", n: 12, r1: 12, r2: 36, w: 13, off: 15 },
      { t: "sectors", n: 12, r1: 36, r2: 49 },
      { t: "sectors", n: 18, r1: 49, r2: 62, off: 10 },
      { t: "sectors", n: 18, r1: 62, r2: 76 },
      { t: "sectors", n: 24, r1: 76, r2: 88, off: 7.5 },
      { t: "sectors", n: 30, r1: 88, r2: 99 },
    ],
  },
  {
    name: "원무늬",
    layers: [
      { t: "core", r: 12 },
      { t: "petals", n: 8, r1: 10, r2: 32, w: 18 },
      { t: "sectors", n: 12, r1: 32, r2: 45, off: 15 },
      { t: "sectors", n: 16, r1: 45, r2: 58 },
      { t: "petals", n: 16, r1: 58, r2: 76, w: 10, off: 11.25 },
      { t: "sectors", n: 24, r1: 76, r2: 90 },
      { t: "sectors", n: 24, r1: 90, r2: 99, off: 7.5 },
    ],
  },
];

\nfunction buildTemplate(kind: number): Cell[] {
  const out: Cell[] = [];
  const tpl = TEMPLATES[kind] ?? TEMPLATES[0];
  tpl.layers.forEach((L, li) => {
    if (L.t === "core") {
      out.push({ id: `${kind}-c${li}`, d: circlePath(0, 0, L.r), cx: C, cy: C });
      return;
    }
    const off = L.off ?? 0;
    const step = 360 / L.n;
    for (let i = 0; i < L.n; i++) {
      const aStart = step * i - 90 + off;
      const aC = aStart + step / 2;
      if (L.t === "sectors") {
        const [mx, my] = P((L.r1 + L.r2) / 2, aC);
        out.push({ id: `${kind}-${li}-${i}`, d: sectorPath(L.r1, L.r2, aStart, aStart + step), cx: mx, cy: my });
      } else if (L.t === "petals") {
        const [mx, my] = P((L.r1 + L.r2) / 2, aC);
        out.push({ id: `${kind}-${li}-${i}`, d: petalPath(L.r1, L.r2, aC, L.w), cx: mx, cy: my });
      } else {
        const [cx, cy] = P(L.r, aC);
        out.push({ id: `${kind}-${li}-${i}`, d: circlePath(L.r, aC, L.rr), cx, cy });
      }
    }
  });
  return out;
}

// ══════════════ 저장 형태 ══════════════
type Saved = {
  mode: "color" | "draw";
  tpl: number;
  color: string;
  fills: Record<string, Record<string, string>>;
  drawURL?: string;
};
function loadSaved(): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MKEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function patchSaved(patch: Partial<Saved>) {
  if (typeof window === "undefined") return;
  const s = loadSaved() ?? { mode: "color", tpl: 0, color: PALETTE[0], fills: {} };
  try {
    window.localStorage.setItem(MKEY, JSON.stringify({ ...s, ...patch }));
  } catch {}
}

// ══════════════ 가루 흩날림 (오른쪽→왼쪽 + 난수 바람) ══════════════
type Grain = { x: number; y: number; vx: number; vy: number; r: number; color: string };
function runScatter(ctx: CanvasRenderingContext2D, size: number, parts: Grain[], onDone: () => void) {
  let raf = 0;
  const start = performance.now();
  const DURATION = 2600;
  let gust = 0;
  const tick = (now: number) => {
    const t = now - start;
    gust += (Math.random() - 0.5) * 0.06;
    gust = Math.max(-0.25, Math.min(0.25, gust));
    ctx.clearRect(0, 0, size, size);
    for (const p of parts) {
      p.vx -= 0.03 + Math.random() * 0.02;
      p.vy += gust + (Math.random() - 0.5) * 0.12;
      p.vy *= 0.97;
      p.x += p.vx;
      p.y += p.vy;
      ctx.globalAlpha = Math.max(0, 1 - (t / DURATION) ** 1.7) * 0.92;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (t < DURATION) raf = requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, size, size);
      cancelAnimationFrame(raf);
      onDone();
    }
  };
  raf = requestAnimationFrame(tick);
}

// ══════════════ 먹색·금 그라데이션 확인 팝업 ══════════════
function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "비우기",
  cancelLabel = "머무르기",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(8,6,5,0.72)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-gold/25 text-center shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #14100c 0%, #0d0b09 55%, #1a1510 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(217,180,91,0.12)",
        }}
      >
        <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(217,180,91,0.6), transparent)" }} />
        <div className="px-7 pb-7 pt-6">
          <p className="text-[13px] tracking-[0.25em] text-gold-soft">{title}</p>
          <p className="mt-4 whitespace-pre-line text-[12.5px] leading-6 text-hanji-dim">{body}</p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              onClick={onCancel}
              className="rounded-[10px] border border-ink-3 px-5 py-2.5 text-[12px] tracking-[0.2em] text-hanji-dim transition-colors hover:text-hanji"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="rounded-[10px] border border-gold/50 px-6 py-2.5 text-[12px] tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
              style={{ background: "linear-gradient(160deg, rgba(217,180,91,0.14), rgba(217,180,91,0.04))" }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════ 페이지 ══════════════
export default function MandalaPage() {
  const [mode, setMode] = useState<"color" | "draw">("color");
  const [color, setColor] = useState<string>(PALETTE[0]);

  useEffect(() => {
    const s = loadSaved();
    if (s?.mode) setMode(s.mode);
    if (s?.color) setColor(s.color);
  }, []);

  const changeMode = (m: "color" | "draw") => {
    setMode(m);
    patchSaved({ mode: m });
  };
  const changeColor = (c: string) => {
    setColor(c);
    patchSaved({ color: c });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-6">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">曼陀羅 · 만다라</h1>

      <div className="rise rise-d1 mt-4 flex items-center gap-2">
        <button
          onClick={() => changeMode("color")}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            mode === "color" ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          🎨 색칠하기
        </button>
        <button
          onClick={() => changeMode("draw")}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            mode === "draw" ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          ✍ 그리기
        </button>
      </div>

      <div className="rise rise-d2 mt-5 flex max-w-[440px] flex-wrap items-center justify-center gap-2.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => changeColor(c)}
            aria-label={c}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              color === c ? "scale-110 border-hanji" : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          onClick={() => changeColor(ERASE)}
          aria-label="빈칸"
          title="빈칸 — 칠한 색을 지웁니다"
          className={`relative h-7 w-7 overflow-hidden rounded-full border-2 bg-ink-2 transition-transform ${
            color === ERASE ? "scale-110 border-hanji" : "border-ink-3 hover:scale-105"
          }`}
        >
          <span className="absolute left-1/2 top-1/2 h-[2px] w-[26px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-vermilion/70" />
        </button>
      </div>

      {mode === "color" ? <ColorMode color={color} /> : <DrawMode color={color} />}

      <div className="mt-10 text-center">
        <Link href="/" className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim">
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
  );
}

// ── 색칠 모드 ──────────────────────────────────────────
function ColorMode({ color }: { color: string }) {
  const [tpl, setTpl] = useState(0);
  const [fillsAll, setFillsAll] = useState<Record<string, Record<string, string>>>({});
  const [scattering, setScattering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const painting = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [panMode, setPanMode] = useState(false);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const pinch = useRef({ active: false, dist: 0, cx: 0, cy: 0 });
  const cells = useMemo(() => buildTemplate(tpl), [tpl]);
  const fills = fillsAll[String(tpl)] ?? {};

  const cellById = useMemo(() => {
    const m: Record<string, Cell> = {};
    cells.forEach((c) => (m[c.id] = c));
    return m;
  }, [cells]);

  useEffect(() => {
    const s = loadSaved();
    if (s) {
      if (typeof s.tpl === "number") setTpl(s.tpl);
      if (s.fills) setFillsAll(s.fills);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MKEY || !e.newValue) return;
      try {
        const ns = JSON.parse(e.newValue) as Saved;
        if (ns.fills) setFillsAll(ns.fills);
        if (typeof ns.tpl === "number") setTpl(ns.tpl);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    patchSaved({ mode: "color", tpl, fills: fillsAll });
  }, [fillsAll, tpl]);

  const apply = useCallback(
    (id: string, erase: boolean) => {
      if (scattering) return;
      setFillsAll((prev) => {
        const cur = { ...(prev[String(tpl)] ?? {}) };
        if (erase || color === ERASE) delete cur[id];
        else cur[id] = color;
        return { ...prev, [String(tpl)]: cur };
      });
    },
    [color, tpl, scattering]
  );

  const filledCount = Object.keys(fills).filter((k) => fills[k]).length;

  const applyTransform = () => {
    const inner = innerRef.current;
    if (!inner) return;
    const v = view.current;
    inner.style.transform = "translate(" + v.x + "px, " + v.y + "px) scale(" + v.scale + ")";
  };
  const resetView = () => {
    view.current = { scale: 1, x: 0, y: 0 };
    applyTransform();
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    painting.current = false;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current = {
      active: true,
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      cx: (a.clientX + b.clientX) / 2,
      cy: (a.clientY + b.clientY) / 2,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!pinch.current.active || e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const cx = (a.clientX + b.clientX) / 2;
    const cy = (a.clientY + b.clientY) / 2;
    view.current.scale = Math.min(4, Math.max(0.5, view.current.scale * (dist / pinch.current.dist)));
    view.current.x += cx - pinch.current.cx;
    view.current.y += cy - pinch.current.cy;
    pinch.current.dist = dist;
    pinch.current.cx = cx;
    pinch.current.cy = cy;
    applyTransform();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinch.current.active = false;
  };
  const onPanDown = (e: React.PointerEvent) => {
    if (!panMode) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pinch.current = { ...pinch.current, active: true, cx: e.clientX - view.current.x, cy: e.clientY - view.current.y };
  };
  const onPanMove = (e: React.PointerEvent) => {
    if (!panMode || !pinch.current.active) return;
    view.current.x = e.clientX - pinch.current.cx;
    view.current.y = e.clientY - pinch.current.cy;
    applyTransform();
  };
  const onPanUp = () => {
    if (panMode) pinch.current.active = false;
  };

  const doScatter = () => {
    setConfirmOpen(false);
    const ids = Object.keys(fills).filter((k) => fills[k]);
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (ids.length === 0 || !wrap || !canvas) {
      setFillsAll((p) => ({ ...p, [String(tpl)]: {} }));
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
      setFillsAll((p) => ({ ...p, [String(tpl)]: {} }));
      return;
    }
    ctx.scale(dpr, dpr);
    const scale = size / 200;
    const parts: Grain[] = [];
    for (const id of ids) {
      const cell = cellById[id];
      if (!cell) continue;
      const px = cell.cx * scale;
      const py = cell.cy * scale;
      const count = 9 + Math.floor(Math.random() * 7);
      for (let k = 0; k < count; k++) {
        parts.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: -(0.1 + Math.random() * 0.5),
          vy: (Math.random() - 0.5) * 0.3,
          r: 0.3 + Math.random() * 0.7,
          color: fills[id],
        });
      }
    }
    setScattering(true);
    setFillsAll((p) => ({ ...p, [String(tpl)]: {} }));
    runScatter(ctx, size, parts, () => setScattering(false));
  };

  const askClear = () => {
    if (Object.keys(fills).filter((k) => fills[k]).length === 0) return;
    setConfirmOpen(true);
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.name}
            onClick={() => !scattering && setTpl(i)}
            className={`rounded-full border px-3.5 py-1.5 text-xs tracking-widest transition-colors ${
              tpl === i ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div
        ref={wrapRef}
        className="relative mt-5 aspect-square w-full max-w-[460px] overflow-hidden rounded-full border border-ink-3 bg-ink-2/40"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onPointerDown={onPanDown}
        onPointerMove={onPanMove}
        onPointerUp={() => {
          painting.current = false;
          onPanUp();
        }}
        onPointerLeave={() => {
          painting.current = false;
          onPanUp();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div ref={innerRef} className="h-full w-full origin-center will-change-transform">
        <svg viewBox="0 0 200 200" className="h-full w-full touch-none select-none">
          <circle cx="100" cy="100" r="98.5" fill="none" stroke="rgba(217,180,91,0.14)" />
          {cells.map((c) => (
            <path
              key={c.id}
              d={c.d}
              onPointerDown={(e) => {
                if (panMode) return;
                if (e.button === 2) {
                  apply(c.id, true);
                  return;
                }
                painting.current = true;
                apply(c.id, false);
              }}
              onPointerEnter={() => {
                if (painting.current) apply(c.id, false);
              }}
              fill={fills[c.id] ?? "transparent"}
              stroke="rgba(217,180,91,0.3)"
              strokeWidth="0.24"
              style={{ cursor: scattering ? "default" : "pointer", transition: "fill 0.08s" }}
            />
          ))}
        </svg>
        </div>
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      </div>

      {/* 모바일 전용 — 칠하기 / 손으로 옮기기 / 원위치 (두 손가락 확대는 항상 가능) */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:hidden">
        <button
          onClick={() => setPanMode(false)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            !panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim"
          }`}
        >
          🎨 칠하기
        </button>
        <button
          onClick={() => setPanMode(true)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim"
          }`}
        >
          ✋ 손으로 옮기기
        </button>
        <button
          onClick={resetView}
          className="rounded-full border border-ink-3 px-4 py-2 text-xs tracking-[0.1em] text-hanji-faint transition-colors hover:text-hanji"
        >
          ⊙ 원위치
        </button>
      </div>

      <p className="mt-4 text-[12px] tracking-[0.25em] text-hanji-faint">
        {filledCount} / {cells.length} 칸
      </p>

      <div className="mt-3">
        <button
          onClick={askClear}
          disabled={scattering}
          className="rounded-[10px] border border-ink-3 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50"
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="만다라를 비우시겠습니까"
        body={"만다라는 간직하지 않습니다.\n이렇게 비우는 것 또한 수행입니다."}
        onConfirm={doScatter}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

// ── 그리기 모드 ──────────────────────────────────────────
function DrawMode({ color }: { color: string }) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState(12);
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState(3);
  const [panMode, setPanMode] = useState(false); // 기본: 연달아 그리기
  const [scattering, setScattering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const view = useRef({ scale: 1, x: 0, y: 0 });
  const stroke = useRef({ active: false, last: null as null | { x: number; y: number } });
  const pinch = useRef({ active: false, dist: 0, cx: 0, cy: 0 });
  const pan = useRef({ active: false, x: 0, y: 0 });
  const dirty = useRef(false);
  const undoStack = useRef<ImageData[]>([]); // 되돌아가기 스냅샷
  const SIZE = 1000;

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;
  const getBg = () => bgRef.current?.getContext("2d") ?? null;

  const drawGuides = useCallback(() => {
    const ctx = getBg();
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.strokeStyle = "rgba(217,180,91,0.12)";
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
  }, [segments]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bg = bgRef.current;
    if (!canvas || !bg) return;
    const dpr = window.devicePixelRatio || 1;
    for (const cv of [canvas, bg]) {
      cv.width = SIZE * dpr;
      cv.height = SIZE * dpr;
    }
    const ctx = canvas.getContext("2d");
    const bgc = bg.getContext("2d");
    if (!ctx || !bgc) return;
    ctx.scale(dpr, dpr);
    bgc.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawGuides();
    const s = loadSaved();
    if (s?.drawURL) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        dirty.current = true;
      };
      img.src = s.drawURL;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    drawGuides();
  }, [drawGuides]);

  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      patchSaved({ mode: "draw", drawURL: canvas.toDataURL("image/png") });
    } catch {}
  };

  // 스트로크 시작 전 스냅샷 저장 (되돌아가기용)
  const pushUndo = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    try {
      undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.current.length > 25) undoStack.current.shift();
      setCanUndo(true);
    } catch {}
  };

  const undo = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas || undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // putImageData는 변환 무시하지만 안전하게
    ctx.putImageData(prev, 0, 0);
    ctx.restore();
    setCanUndo(undoStack.current.length > 0);
    dirty.current = undoStack.current.length > 0 || dirty.current;
    persist();
  };

  const toCanvas = (cx: number, cy: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((cx - rect.left) / rect.width) * SIZE, y: ((cy - rect.top) / rect.height) * SIZE };
  };

  const strokeSym = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = getCtx();
    if (!ctx) return;
    const c = SIZE / 2;
    const erasing = color === ERASE;
    ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    ctx.strokeStyle = erasing ? "rgba(0,0,0,1)" : color;
    ctx.lineWidth = erasing ? brush + 4 : brush;
    ctx.globalAlpha = erasing ? 1 : 0.92;
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
    ctx.globalCompositeOperation = "source-over";
    dirty.current = true;
  };

  const applyTransform = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const v = view.current;
    wrap.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
  };
  const resetView = () => {
    view.current = { scale: 1, x: 0, y: 0 };
    applyTransform();
  };

  const onDown = (e: React.PointerEvent) => {
    if (scattering) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (panMode) {
      pan.current = { active: true, x: e.clientX - view.current.x, y: e.clientY - view.current.y };
    } else {
      pushUndo(); // 그리기 시작 전 스냅샷
      stroke.current.active = true;
      stroke.current.last = toCanvas(e.clientX, e.clientY);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!panMode && stroke.current.active && stroke.current.last) {
      const p = toCanvas(e.clientX, e.clientY);
      strokeSym(stroke.current.last, p);
      stroke.current.last = p;
    } else if (panMode && pan.current.active) {
      view.current.x = e.clientX - pan.current.x;
      view.current.y = e.clientY - pan.current.y;
      applyTransform();
    }
  };
  const onUp = () => {
    const wasDrawing = stroke.current.active;
    stroke.current.active = false;
    stroke.current.last = null;
    pan.current.active = false;
    if (wasDrawing && dirty.current) persist();
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    // 두 손가락이 닿으면 — 그리던 획을 즉시 멈추고 확대·이동 모드로
    stroke.current.active = false;
    stroke.current.last = null;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current = {
      active: true,
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      cx: (a.clientX + b.clientX) / 2,
      cy: (a.clientY + b.clientY) / 2,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!pinch.current.active || e.touches.length < 2) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const cx = (a.clientX + b.clientX) / 2;
    const cy = (a.clientY + b.clientY) / 2;
    // 확대
    view.current.scale = Math.min(4, Math.max(0.5, view.current.scale * (dist / pinch.current.dist)));
    // 두 손가락 중심 이동만큼 함께 이동
    view.current.x += cx - pinch.current.cx;
    view.current.y += cy - pinch.current.cy;
    pinch.current.dist = dist;
    pinch.current.cx = cx;
    pinch.current.cy = cy;
    applyTransform();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinch.current.active = false;
  };

  const doScatter = () => {
    setConfirmOpen(false);
    const canvas = canvasRef.current;
    const sc = scatterRef.current;
    const wrap = wrapRef.current;
    const src = getCtx();
    if (!canvas || !sc || !wrap || !src || !dirty.current) return;
    const size = wrap.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    const img = src.getImageData(0, 0, SIZE * dpr, SIZE * dpr);
    const parts: Grain[] = [];
    const step = Math.max(6, Math.floor((SIZE * dpr) / 190));
    for (let y = 0; y < SIZE * dpr; y += step) {
      for (let x = 0; x < SIZE * dpr; x += step) {
        const idx = (y * SIZE * dpr + x) * 4;
        if (img.data[idx + 3] < 40) continue;
        const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
        parts.push({
          x: (x / (SIZE * dpr)) * size,
          y: (y / (SIZE * dpr)) * size,
          vx: -(0.1 + Math.random() * 0.5),
          vy: (Math.random() - 0.5) * 0.3,
          r: 0.3 + Math.random() * 0.7,
          color: `rgb(${r},${g},${b})`,
        });
      }
    }
    // 상한 없이 전체를 담은 뒤, 너무 많으면 그림 전반에서 골고루 무작위로 솎아낸다
    const MAX = 3200;
    if (parts.length > MAX) {
      for (let i = parts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [parts[i], parts[j]] = [parts[j], parts[i]];
      }
      parts.length = MAX;
    }
    src.clearRect(0, 0, SIZE, SIZE);
    dirty.current = false;
    undoStack.current = [];
    setCanUndo(false);
    persist();
    if (parts.length === 0) return;
    sc.width = size * dpr;
    sc.height = size * dpr;
    sc.style.width = `${size}px`;
    sc.style.height = `${size}px`;
    const ctx = sc.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    setScattering(true);
    runScatter(ctx, size, parts, () => setScattering(false));
  };

  return (
    <>
      <p className="mt-4 text-center text-[12px] leading-6 text-hanji-faint">
        손끝으로 그으면, 여러 갈래로 함께 피어납니다.
        <span className="hidden sm:inline"> (모바일에선 두 손가락으로 확대)</span>
      </p>

      <div className="relative mt-4 aspect-square w-full max-w-[460px] overflow-hidden rounded-full border border-ink-3 bg-ink-2/40">
        <div ref={wrapRef} className="relative h-full w-full origin-center will-change-transform">
          <canvas ref={bgRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ cursor: panMode ? "grab" : "crosshair" }}
          />
        </div>
        {/* 흩날림 전용 오버레이 — wrap 변형과 무관하게 화면 전체를 덮는다 */}
        <canvas ref={scatterRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      {/* 되돌아가기 (웹·모바일 공통) */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo || scattering}
          className="rounded-full border border-ink-3 px-4 py-2 text-xs tracking-[0.1em] text-hanji-dim transition-colors enabled:hover:text-hanji disabled:opacity-40"
        >
          ↩ 되돌아가기
        </button>
      </div>

      {/* 모바일 전용 — 연달아 그리기 / 손으로 옮기기 / 원위치 */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:hidden">
        <button
          onClick={() => setPanMode(false)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            !panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim"
          }`}
        >
          ✍ 연달아 그리기
        </button>
        <button
          onClick={() => setPanMode(true)}
          className={`rounded-full border px-4 py-2 text-xs tracking-[0.1em] transition-colors ${
            panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim"
          }`}
        >
          ✋ 손으로 옮기기
        </button>
        <button
          onClick={resetView}
          className="rounded-full border border-ink-3 px-4 py-2 text-xs tracking-[0.1em] text-hanji-faint transition-colors hover:text-hanji"
        >
          ⊙ 원위치
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        <span className="text-[11px] tracking-[0.2em] text-hanji-faint">갈래</span>
        {[6, 8, 12, 16, 24].map((n) => (
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
      <div className="mt-4 flex w-full max-w-[280px] items-center gap-3">
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

      <div className="mt-6">
        <button
          onClick={() => dirty.current && setConfirmOpen(true)}
          disabled={scattering}
          className="rounded-[10px] border border-ink-3 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50"
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="만다라를 비우시겠습니까"
        body={"만다라는 간직하지 않습니다.\n이렇게 비우는 것 또한 수행입니다."}
        onConfirm={doScatter}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
