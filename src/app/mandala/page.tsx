"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 — 화두를 기다리는 동안의 수행. 두 갈래.
//  ① 색칠하기: 겹겹의 꽃잎·잎·원으로 짜인 정교한 도안을 색으로 채운다.
//     · 좌클릭 = 한 칸  · 드래그 = 연달아  · 우클릭 = 그 칸 비우기
//     · '빈칸' 색을 고르면 눌러서 지울 수 있다.
//  ② 그리기: 손끝으로 그으면 여러 갈래로 대칭 복제.
//     · 웹은 그리기가 기본  · 모바일은 '연달아 그리기' 토글 + 두 손가락 확대
// 만다라는 간직하지 않는다 — 비움도 수행. 비울 때 색이 가루로 흩어져 사라진다.
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
// 뾰족한 꽃잎(렌즈) — 안(r1)에서 바깥(r2)으로, 양옆이 halfW만큼 부푼다
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

// 겹겹의 정교한 도안 다섯 — 이미지처럼 꽃잎·잎·원이 켜켜이 쌓인다
const TEMPLATES: { name: string; layers: Layer[] }[] = [
  {
    name: "겹연꽃",
    layers: [
      { t: "core", r: 8 },
      { t: "petals", n: 8, r1: 0, r2: 27, w: 11 },
      { t: "sectors", n: 16, r1: 27, r2: 34 },
      { t: "petals", n: 16, r1: 30, r2: 53, w: 7 },
      { t: "dots", n: 16, r: 57, rr: 2.4 },
      { t: "petals", n: 24, r1: 59, r2: 81, w: 5, off: 7.5 },
      { t: "sectors", n: 24, r1: 81, r2: 90 },
      { t: "petals", n: 12, r1: 88, r2: 99, w: 6 },
    ],
  },
  {
    name: "수레바퀴",
    layers: [
      { t: "core", r: 9 },
      { t: "dots", n: 6, r: 17, rr: 3 },
      { t: "sectors", n: 12, r1: 22, r2: 42 },
      { t: "petals", n: 12, r1: 24, r2: 45, w: 6, off: 15 },
      { t: "sectors", n: 24, r1: 45, r2: 64 },
      { t: "dots", n: 24, r: 54, rr: 2 },
      { t: "petals", n: 24, r1: 66, r2: 88, w: 5 },
      { t: "sectors", n: 48, r1: 88, r2: 98 },
    ],
  },
  {
    name: "별꽃",
    layers: [
      { t: "core", r: 7 },
      { t: "petals", n: 12, r1: 0, r2: 31, w: 7 },
      { t: "petals", n: 12, r1: 0, r2: 23, w: 12, off: 15 },
      { t: "dots", n: 12, r: 37, rr: 2.5 },
      { t: "petals", n: 24, r1: 41, r2: 67, w: 5 },
      { t: "petals", n: 24, r1: 41, r2: 59, w: 9, off: 7.5 },
      { t: "dots", n: 24, r: 73, rr: 1.8 },
      { t: "petals", n: 36, r1: 77, r2: 98, w: 3.5 },
    ],
  },
  {
    name: "촘촘꽃",
    layers: [
      { t: "core", r: 8 },
      { t: "petals", n: 6, r1: 0, r2: 25, w: 14 },
      { t: "petals", n: 12, r1: 16, r2: 41, w: 7, off: 15 },
      { t: "sectors", n: 18, r1: 41, r2: 52 },
      { t: "petals", n: 18, r1: 43, r2: 65, w: 6 },
      { t: "dots", n: 18, r: 69, rr: 2 },
      { t: "petals", n: 30, r1: 71, r2: 88, w: 4 },
      { t: "petals", n: 30, r1: 84, r2: 99, w: 4, off: 6 },
    ],
  },
  {
    name: "원무늬",
    layers: [
      { t: "core", r: 9 },
      { t: "petals", n: 8, r1: 0, r2: 35, w: 9 },
      { t: "dots", n: 8, r: 45, rr: 6 },
      { t: "petals", n: 8, r1: 51, r2: 81, w: 8, off: 22.5 },
      { t: "dots", n: 16, r: 89, rr: 3 },
      { t: "sectors", n: 32, r1: 92, r2: 99 },
    ],
  },
];

function buildTemplate(kind: number): Cell[] {
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
  fills: Record<string, Record<string, string>>; // tplIndex -> {cellId: color}
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

// ══════════════ 페이지 ══════════════
export default function MandalaPage() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"color" | "draw">("color");
  const [color, setColor] = useState<string>(PALETTE[0]);

  useEffect(() => {
    const s = loadSaved();
    if (s) {
      if (s.mode) setMode(s.mode);
      if (s.color) setColor(s.color);
    }
    setReady(true);
  }, []);

  // mode/color 변경 저장
  useEffect(() => {
    if (!ready) return;
    const s = loadSaved() ?? { mode, tpl: 0, color, fills: {} };
    try {
      window.localStorage.setItem(MKEY, JSON.stringify({ ...s, mode, color }));
    } catch {}
  }, [mode, color, ready]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 py-6">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">曼陀羅 · 만다라</h1>

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

      {/* 색 팔레트 (+ 빈칸) */}
      <div className="rise rise-d2 mt-5 flex max-w-[440px] flex-wrap items-center justify-center gap-2.5">
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
        {/* 빈칸(지우개) */}
        <button
          onClick={() => setColor(ERASE)}
          aria-label="빈칸"
          title="빈칸 — 칠한 색을 지웁니다"
          className={`relative h-7 w-7 overflow-hidden rounded-full border-2 bg-ink-2 transition-transform ${
            color === ERASE ? "scale-110 border-hanji" : "border-ink-3 hover:scale-105"
          }`}
        >
          <span className="absolute left-1/2 top-1/2 h-[2px] w-[26px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-vermilion/70" />
        </button>
      </div>

      {ready &&
        (mode === "color" ? <ColorMode color={color} /> : <DrawMode color={color} />)}

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
  const painting = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cells = useMemo(() => buildTemplate(tpl), [tpl]);
  const fills = fillsAll[String(tpl)] ?? {};

  const cellById = useMemo(() => {
    const m: Record<string, Cell> = {};
    cells.forEach((c) => (m[c.id] = c));
    return m;
  }, [cells]);

  // 최초 로드 + 다른 탭과 실시간 연동
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

  // 변경 저장 (임시저장)
  useEffect(() => {
    const s = loadSaved() ?? { mode: "color", tpl, color, fills: {} };
    try {
      window.localStorage.setItem(MKEY, JSON.stringify({ ...s, mode: "color", tpl, fills: fillsAll }));
    } catch {}
  }, [fillsAll, tpl, color]);

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

  const chooseTpl = (i: number) => {
    if (scattering) return;
    setTpl(i);
  };

  const filledCount = Object.keys(fills).filter((k) => fills[k]).length;

  // 미세한 가루로 흩어지며 비우기
  const scatterClear = () => {
    const ids = Object.keys(fills).filter((k) => fills[k]);
    if (ids.length === 0) return;
    if (!window.confirm("만다라를 비우시겠습니까?\n\n만다라는 간직하지 않습니다 — 이렇게 비우는 것도 수행입니다.")) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) {
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
    type Pt = { x: number; y: number; vx: number; vy: number; r: number; color: string };
    const parts: Pt[] = [];
    for (const id of ids) {
      const cell = cellById[id];
      if (!cell) continue;
      const px = cell.cx * scale;
      const py = cell.cy * scale;
      const count = 10 + Math.floor(Math.random() * 8);
      for (let k = 0; k < count; k++) {
        parts.push({
          x: px + (Math.random() - 0.5) * 6,
          y: py + (Math.random() - 0.5) * 6,
          vx: -(0.15 + Math.random() * 0.7),
          vy: (Math.random() - 0.5) * 0.35,
          r: 0.3 + Math.random() * 0.75,
          color: fills[id],
        });
      }
    }
    setScattering(true);
    setFillsAll((p) => ({ ...p, [String(tpl)]: {} }));
    let raf = 0;
    const start = performance.now();
    const DURATION = 2400;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, size, size);
      for (const p of parts) {
        p.vx -= 0.025;
        p.vy += (Math.random() - 0.5) * 0.08;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - (t / DURATION) ** 1.6) * 0.9;
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
        setScattering(false);
      }
    };
    raf = requestAnimationFrame(tick);
  };

  return (
    <>
      <div className="rise rise-d2 mt-5 flex flex-wrap items-center justify-center gap-2">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.name}
            onClick={() => chooseTpl(i)}
            className={`rounded-full border px-3.5 py-1.5 text-xs tracking-widest transition-colors ${
              tpl === i ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="rise rise-d3 relative mt-5 w-full max-w-[460px]">
        <svg
          viewBox="0 0 200 200"
          className="h-auto w-full touch-none select-none rounded-full border border-ink-3 bg-ink-2/40"
          onPointerUp={() => (painting.current = false)}
          onPointerLeave={() => (painting.current = false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <circle cx="100" cy="100" r="98.5" fill="none" stroke="rgba(217,180,91,0.14)" />
          {cells.map((c) => (
            <path
              key={c.id}
              d={c.d}
              onPointerDown={(e) => {
                if (e.button === 2) {
                  apply(c.id, true); // 우클릭 = 비우기
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
              strokeWidth="0.28"
              style={{ cursor: scattering ? "default" : "pointer", transition: "fill 0.08s" }}
            />
          ))}
        </svg>
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
      </div>

      {/* 진행 카운터 (안내 문구 없음) */}
      <p className="rise rise-d3 mt-4 text-[12px] tracking-[0.25em] text-hanji-faint">
        {filledCount} / {cells.length} 칸
      </p>

      <div className="rise rise-d3 mt-3">
        <button
          onClick={scatterClear}
          disabled={scattering}
          className="rounded-[10px] border border-ink-3 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50"
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>
    </>
  );
}

// ── 그리기 모드 ──────────────────────────────────────────
function DrawMode({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState(12);
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState(3);
  const [panMode, setPanMode] = useState(false);
  const [scattering, setScattering] = useState(false);

  const view = useRef({ scale: 1, x: 0, y: 0 });
  const stroke = useRef({ active: false, last: null as null | { x: number; y: number } });
  const pinch = useRef({ active: false, dist: 0 });
  const pan = useRef({ active: false, x: 0, y: 0 });
  const dirty = useRef(false);
  const restored = useRef(false);
  const SIZE = 1000;

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const guides = useCallback(() => {
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
  }, [segments]);

  // 캔버스 준비 + 저장분 복원
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
    if (!restored.current) {
      restored.current = true;
      const s = loadSaved();
      if (s?.drawURL) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          dirty.current = true;
        };
        img.src = s.drawURL;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/png");
      const s = loadSaved() ?? { mode: "draw", tpl: 0, color, fills: {} };
      window.localStorage.setItem(MKEY, JSON.stringify({ ...s, mode: "draw", drawURL: url }));
    } catch {}
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
    ctx.strokeStyle = color === ERASE ? "#0D0B09" : color;
    ctx.lineWidth = brush;
    ctx.globalAlpha = color === ERASE ? 1 : 0.92;
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
    dirty.current = true;
  };

  const applyTransform = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const v = view.current;
    wrap.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
  };

  const onDown = (e: React.PointerEvent) => {
    if (scattering) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (panMode) {
      pan.current = { active: true, x: e.clientX - view.current.x, y: e.clientY - view.current.y };
    } else {
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
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current = { active: true, dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!pinch.current.active || e.touches.length < 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    view.current.scale = Math.min(4, Math.max(0.5, view.current.scale * (dist / pinch.current.dist)));
    pinch.current.dist = dist;
    applyTransform();
  };
  const onTouchEnd = () => {
    pinch.current.active = false;
  };

  const scatterClear = () => {
    const canvas = canvasRef.current;
    const sc = scatterRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !sc || !wrap) return;
    if (!dirty.current) {
      const ctx = getCtx();
      if (ctx) {
        ctx.clearRect(0, 0, SIZE, SIZE);
        guides();
      }
      return;
    }
    if (!window.confirm("만다라를 비우시겠습니까?\n\n만다라는 간직하지 않습니다 — 이렇게 비우는 것도 수행입니다.")) return;
    const size = wrap.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    const src = getCtx();
    if (!src) return;
    const img = src.getImageData(0, 0, SIZE * dpr, SIZE * dpr);
    type Pt = { x: number; y: number; vx: number; vy: number; r: number; color: string };
    const parts: Pt[] = [];
    const step = Math.max(6, Math.floor((SIZE * dpr) / 180));
    for (let y = 0; y < SIZE * dpr; y += step) {
      for (let x = 0; x < SIZE * dpr; x += step) {
        const idx = (y * SIZE * dpr + x) * 4;
        const alpha = img.data[idx + 3];
        if (alpha < 40) continue;
        const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
        // 가이드선(옅은 금)만 있는 배경은 대충 건너뛴다
        if (r > 40 && r < 90 && g > 30 && g < 70 && b < 45) continue;
        parts.push({
          x: (x / (SIZE * dpr)) * size,
          y: (y / (SIZE * dpr)) * size,
          vx: -(0.15 + Math.random() * 0.7),
          vy: (Math.random() - 0.5) * 0.35,
          r: 0.3 + Math.random() * 0.75,
          color: `rgb(${r},${g},${b})`,
        });
        if (parts.length > 2600) break;
      }
      if (parts.length > 2600) break;
    }
    src.clearRect(0, 0, SIZE, SIZE);
    guides();
    dirty.current = false;
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
    let raf = 0;
    const start = performance.now();
    const DURATION = 2400;
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, size, size);
      for (const p of parts) {
        p.vx -= 0.025;
        p.vy += (Math.random() - 0.5) * 0.08;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - (t / DURATION) ** 1.6) * 0.9;
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
        setScattering(false);
      }
    };
    raf = requestAnimationFrame(tick);
  };

  return (
    <>
      <p className="rise rise-d2 mt-4 text-center text-[12px] leading-6 text-hanji-faint">
        손끝으로 그으면, 여러 갈래로 함께 피어납니다.
        <span className="hidden sm:inline"> (모바일에선 두 손가락으로 확대)</span>
      </p>

      <div className="rise rise-d2 relative mt-4 aspect-square w-full max-w-[460px] overflow-hidden rounded-full border border-ink-3 bg-ink-2/40">
        <div ref={wrapRef} className="h-full w-full origin-center will-change-transform">
          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="h-full w-full touch-none"
            style={{ cursor: panMode ? "grab" : "crosshair" }}
          />
        </div>
        <canvas ref={scatterRef} className="pointer-events-none absolute inset-0" />
      </div>

      <div className="rise rise-d3 mt-5 flex items-center gap-2 sm:hidden">
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
      </div>

      <div className="rise rise-d3 mt-4 flex flex-wrap items-center justify-center gap-2.5">
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

      <div className="rise rise-d3 mt-6">
        <button
          onClick={scatterClear}
          disabled={scattering}
          className="rounded-[10px] border border-ink-3 px-7 py-2.5 text-[13px] tracking-[0.2em] text-hanji-dim transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50"
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>
    </>
  );
}
