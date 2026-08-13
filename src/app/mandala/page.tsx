"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 — 화두를 기다리는 동안의 수행. 두 갈래.
//  ① 색칠하기: lib/mandala 가 꽃잎·아치·구슬·마름모를 겹겹이 쌓아 짠 다섯 폭.
//     눈에 보이는 모든 닫힌 구역이 저마다 한 칸(data-cell)이다 — 꽃잎 속
//     작은 꽃잎이면 테와 속잎이 서로 다른 칸, 구슬 한 알도 제 칸.
//     하나하나 짚어 칠하는 것이 곧 수행이다.
//     한 손가락 드래그 = 연달아 색칠, 우클릭 = 그 칸 비우기.
//     두 손가락 = 확대·이동(1~3배), 더블탭 = 원위치. 확대 중에도 한 손가락은 색칠.
//  ② 그리기: 손끝으로 그으면 여러 갈래로 대칭 복제. 되돌리기 지원.
// 만다라는 간직하지 않는다 — 비움도 수행. 비울 때 색이 가루로 흩어진다.
// 하던 만다라는 자동 임시저장되어, 다른 일 하다 돌아와도 그대로 떠 있다.
// 배치 — 원위치·비우기는 판의 왼쪽 위·오른쪽 위 모서리에 겹쳐 앉는다.
//  색칠: [토글 → 만다라 → N/M칸 → 문양 칩(가운데) → 색판]
//  그리기: [토글 → 만다라 → 갈래·거울·붓 → 색판 → 되돌리기·손으로 옮기기]
// 가 스크롤 없이 한 화면에 들어온다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PALETTE, TEMPLATES, buildMandala } from "@/lib/mandala";
import { useConfirm } from "@/components/Confirm";

const ERASE = "erase";
// v3 — 문양 엔진이 바뀌어 칸 key 가 다르다. 옛 저장(fills)과 섞지 않는다.
const MKEY = "hwadu.mandala.v3";
const OLD_MKEY = "hwadoo-mandala-v1";

// 만다라 판의 한 변 — 화면폭(-16px)과, 화면높이에서 고정 요소(헤더·칩·도구·색판·
// 탭바)를 뺀 값 중 작은 쪽. 데스크톱에선 480px 를 넘지 않고,
// 아주 낮은 가로 화면에서도 240px 아래로는 쪼그라들지 않는다.
const BOARD_W = "max(240px, min(100vw - 16px, 100dvh - 355px, 480px))";

// 조각 테두리 — 밤엔 옅은 금선, 낮엔 짙은 먹선(#3a2c20 계열)이어야 흐리지 않다.
// globals.css 는 다른 손이 만지므로, 여기서 인라인 CSS 변수로만 해결한다.
const THEME_CSS = `
.mandala-board { --m-line: rgba(217,180,91,0.32); --m-frame: rgba(217,180,91,0.16); --m-guide: rgba(217,180,91,0.12); }
html[data-theme="light"] .mandala-board { --m-line: rgba(58,44,32,0.62); --m-frame: rgba(58,44,32,0.4); --m-guide: rgba(58,44,32,0.3); }
`;

// 도구 버튼 눌림 피드백 — 토글이든 단발 버튼이든, 누르는 동안 불이 들어온다
const PRESS = "active:border-gold/60 active:bg-gold/10 active:text-gold";
const PRESS_WARM = "active:border-vermilion/60 active:bg-vermilion/10 active:text-vermilion";

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
    if (raw) return JSON.parse(raw) as Saved;
    // 옛 저장에서 모드·색·그림(캔버스)만 물려받는다 — 칸 key 가 바뀐 fills 는 버린다
    const old = window.localStorage.getItem(OLD_MKEY);
    if (old) {
      const s = JSON.parse(old) as Saved;
      const migrated: Saved = {
        mode: s.mode === "draw" ? "draw" : "color",
        tpl: 0,
        color: typeof s.color === "string" ? s.color : PALETTE[0],
        fills: {},
        drawURL: s.drawURL,
      };
      window.localStorage.setItem(MKEY, JSON.stringify(migrated));
      return migrated;
    }
    return null;
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

// ══════════════ 가루 흩날림 ══════════════
// 입자마다 난수 방향으로 파르르 — 어느 한쪽으로도 쓸리지 않는다.
const SCATTER_MS = 2600;
type Grain = { x: number; y: number; vx: number; vy: number; r: number; color: string };

// 흩어지는 첫 숨 — 입자마다 제 방향, 제 빠르기
function grainVel(): { vx: number; vy: number } {
  const a = Math.random() * Math.PI * 2;
  const s = 0.12 + Math.random() * 0.5;
  return { vx: Math.cos(a) * s, vy: Math.sin(a) * s };
}

function runScatter(ctx: CanvasRenderingContext2D, size: number, parts: Grain[], onDone: () => void) {
  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    const alpha = Math.max(0, 1 - (t / SCATTER_MS) ** 1.7) * 0.9;
    ctx.clearRect(0, 0, size, size);
    ctx.globalAlpha = alpha;
    for (const p of parts) {
      // 잔떨림 + 옅은 중력 — 과하지 않게, 가라앉듯이
      p.vx += (Math.random() - 0.5) * 0.11;
      p.vy += 0.008 + (Math.random() - 0.5) * 0.11;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (t < SCATTER_MS) raf = requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, size, size);
      cancelAnimationFrame(raf);
      onDone();
    }
  };
  raf = requestAnimationFrame(tick);
}

// ══════════════ 색판 — 모바일은 두 줄 가로 스크롤 ══════════════
function PaletteBar({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  return (
    <div className="mt-3 w-full max-w-[480px]">
      <div
        className="grid grid-flow-col grid-rows-2 justify-start gap-1.5 overflow-x-auto px-1 pb-1 sm:flex sm:flex-wrap sm:justify-center sm:overflow-visible"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          onClick={() => onPick(ERASE)}
          aria-label="빈칸"
          title="빈칸 — 칠한 색을 지웁니다"
          className={`relative h-6 w-6 shrink-0 overflow-hidden rounded-full border-2 bg-ink-2 transition-transform active:scale-95 sm:h-7 sm:w-7 ${
            color === ERASE ? "scale-110 border-hanji" : "border-ink-3 hover:scale-105"
          }`}
        >
          <span className="absolute left-1/2 top-1/2 h-[2px] w-[24px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-vermilion/70" />
        </button>
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            aria-label={c}
            className={`h-6 w-6 shrink-0 rounded-full border-2 transition-transform active:scale-95 sm:h-7 sm:w-7 ${
              color === c ? "scale-110 border-hanji" : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-2 py-3 sm:px-4 sm:py-6">
      <style>{THEME_CSS}</style>

      {/* 상단 — 모바일은 색칠/그리기 토글만, 한자 장식과 제목은 데스크톱에서만 */}
      <div className="rise flex items-center gap-4">
        <h1 className="hidden text-xs tracking-[0.4em] text-gold-soft sm:block">
          曼陀羅 · 만다라
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => changeMode("color")}
            className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.1em] transition-colors ${PRESS} ${
              mode === "color" ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            🎨 색칠
          </button>
          <button
            onClick={() => changeMode("draw")}
            className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.1em] transition-colors ${PRESS} ${
              mode === "draw" ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            ✍ 그리기
          </button>
        </div>
      </div>

      {mode === "color" ? (
        <ColorMode color={color} onPick={changeColor} />
      ) : (
        <DrawMode color={color} onPick={changeColor} />
      )}

      <div className="mt-6 hidden text-center md:block">
        <Link href="/" className="text-xs tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim">
          ← 화두로 돌아가기
        </Link>
      </div>
    </div>
  );
}

// ── 색칠 모드 ──────────────────────────────────────────
function ColorMode({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const [tplIdx, setTplIdx] = useState(0);
  const [fillsAll, setFillsAll] = useState<Record<string, Record<string, string>>>({});
  const [scattering, setScattering] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const confirm = useConfirm();

  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 포인터 살림 — 손가락별 위치, 핀치 기준, 확대·이동 상태
  const painting = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  // 핀치 직전에 얼떨결에 칠해진 칸을 되돌리기 위한 기억
  const justPainted = useRef<{ id: string; prev: string | undefined; t: number } | null>(null);
  const scatterSeq = useRef(0);

  const tpl = TEMPLATES[tplIdx] ?? TEMPLATES[0];
  const built = useMemo(() => buildMandala(tpl), [tpl]);
  const fills = useMemo(() => fillsAll[String(tplIdx)] ?? {}, [fillsAll, tplIdx]);

  useEffect(() => {
    const s = loadSaved();
    if (s) {
      if (typeof s.tpl === "number" && s.tpl >= 0 && s.tpl < TEMPLATES.length) setTplIdx(s.tpl);
      if (s.fills) setFillsAll(s.fills);
    }
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MKEY || !e.newValue) return;
      try {
        const ns = JSON.parse(e.newValue) as Saved;
        if (ns.fills) setFillsAll(ns.fills);
        if (typeof ns.tpl === "number" && ns.tpl >= 0 && ns.tpl < TEMPLATES.length) setTplIdx(ns.tpl);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // 불러오기 전의 빈 상태로 저장본을 덮어쓰지 않는다.
    // mode 는 토글 버튼만이 쓴다 — 여기서 함께 쓰면 다른 모드를 덮는다.
    if (!hydrated) return;
    patchSaved({ tpl: tplIdx, fills: fillsAll });
  }, [fillsAll, tplIdx, hydrated]);

  const apply = useCallback(
    (id: string, erase: boolean) => {
      if (scattering) return;
      setFillsAll((prev) => {
        const cur = { ...(prev[String(tplIdx)] ?? {}) };
        if (erase || color === ERASE) {
          if (!(id in cur)) return prev;
          delete cur[id];
        } else {
          if (cur[id] === color) return prev;
          cur[id] = color;
        }
        return { ...prev, [String(tplIdx)]: cur };
      });
    },
    [color, tplIdx, scattering]
  );

  const filledCount = useMemo(
    () => built.cellKeys.reduce((n, k) => n + (fills[k] ? 1 : 0), 0),
    [built, fills]
  );

  // ── 확대·이동 ──
  const applyView = () => {
    const inner = innerRef.current;
    const wrap = wrapRef.current;
    if (!inner) return;
    const v = view.current;
    if (wrap) {
      // 판이 화면 밖으로 달아나지 않게 묶는다
      const lim = (wrap.clientWidth * (v.scale - 1)) / 2;
      v.x = Math.max(-lim, Math.min(lim, v.x));
      v.y = Math.max(-lim, Math.min(lim, v.y));
    }
    inner.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`;
    setZoomed(v.scale > 1.01);
  };
  const resetView = () => {
    view.current = { scale: 1, x: 0, y: 0 };
    applyView();
  };

  // 화면 좌표 → 칸 id (확대·이동이 걸려 있어도 그대로 맞는다)
  const cellAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const hit = el ? el.closest("[data-cell]") : null;
    return hit ? hit.getAttribute("data-cell") : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scattering) return;
    try {
      wrapRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 두 번째 손가락 — 색칠을 멈추고 확대·이동 모드로
    if (pointers.current.size === 2) {
      painting.current = false;
      const jp = justPainted.current;
      if (jp && performance.now() - jp.t < 250) {
        // 핀치의 첫 손가락이 얼떨결에 칠한 칸을 되돌린다
        setFillsAll((prev) => {
          const cur = { ...(prev[String(tplIdx)] ?? {}) };
          if (jp.prev === undefined) delete cur[jp.id];
          else cur[jp.id] = jp.prev;
          return { ...prev, [String(tplIdx)]: cur };
        });
      }
      justPainted.current = null;
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      return;
    }
    if (pointers.current.size > 2) return;

    // 더블탭 = 원위치 (확대 중일 때만)
    const now = performance.now();
    const lt = lastTap.current;
    if (
      now - lt.t < 300 &&
      Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30 &&
      view.current.scale > 1.01
    ) {
      lastTap.current = { t: 0, x: 0, y: 0 };
      resetView();
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };

    // 한 손가락 = 색칠 (확대 중에도 그대로)
    const id = cellAt(e.clientX, e.clientY);
    if (!id) return;
    if (e.button === 2) {
      apply(id, true); // 우클릭 = 그 칸 비우기
      return;
    }
    painting.current = true;
    justPainted.current = { id, prev: fills[id], t: now };
    apply(id, false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const v = view.current;
      const rect = wrapRef.current?.getBoundingClientRect();
      const ns = Math.min(3, Math.max(1, v.scale * (pinch.current.dist > 0 ? dist / pinch.current.dist : 1)));
      if (rect) {
        // 두 손가락의 중점을 붙들고 확대하고, 중점이 움직인 만큼 함께 옮긴다
        const mx = cx - rect.left - rect.width / 2;
        const my = cy - rect.top - rect.height / 2;
        const k = v.scale > 0 ? ns / v.scale : 1;
        v.x = mx - (mx - v.x) * k + (cx - pinch.current.cx);
        v.y = my - (my - v.y) * k + (cy - pinch.current.cy);
      }
      v.scale = ns;
      pinch.current = { dist, cx, cy };
      applyView();
      return;
    }

    if (painting.current) {
      const id = cellAt(e.clientX, e.clientY);
      if (id) apply(id, false);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null; // 배율은 그대로 남는다
    if (pointers.current.size === 0) painting.current = false;
  };

  // ── 비우기(모래 흩어짐) ──
  const doScatter = () => {
    // 포인터 살림을 말끔히 정리 — 흩어진 뒤 그리기가 막히는 일이 없도록
    painting.current = false;
    pointers.current.clear();
    pinch.current = null;
    justPainted.current = null;
    resetView();

    const ids = built.cellKeys.filter((k) => fills[k] && built.seeds[k]?.length);
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (ids.length === 0 || !wrap || !canvas) {
      setFillsAll((p) => ({ ...p, [String(tplIdx)]: {} }));
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
      setFillsAll((p) => ({ ...p, [String(tplIdx)]: {} }));
      return;
    }
    ctx.scale(dpr, dpr);
    const scale = size / 200;
    const parts: Grain[] = [];
    for (const id of ids) {
      // 칸의 표본점마다 잘고 미세한 가루를 뿌린다
      for (const [sx, sy] of built.seeds[id]) {
        const px = sx * scale;
        const py = sy * scale;
        const count = 12 + Math.floor(Math.random() * 9);
        for (let k = 0; k < count; k++) {
          parts.push({
            x: px + (Math.random() - 0.5) * 6,
            y: py + (Math.random() - 0.5) * 6,
            ...grainVel(),
            r: 0.2 + Math.random() * 0.45,
            color: fills[id],
          });
        }
      }
    }
    const seq = ++scatterSeq.current;
    setScattering(true);
    setFillsAll((p) => ({ ...p, [String(tplIdx)]: {} }));
    runScatter(ctx, size, parts, () => {
      if (scatterSeq.current === seq) setScattering(false);
    });
    // rAF 가 멈추는 경우(탭 전환 등)에도 반드시 풀리게 하는 안전핀
    window.setTimeout(() => {
      if (scatterSeq.current === seq) setScattering(false);
    }, SCATTER_MS + 800);
  };

  const askClear = async () => {
    if (filledCount === 0 || scattering) return;
    const ok = await confirm(
      "만다라를 비우시겠습니까?",
      "모래 만다라처럼, 흩어짐도 수행입니다.",
      { confirm: "비우기", cancel: "머무르기" }
    );
    if (ok) doScatter();
  };

  return (
    <>
      {/* 만다라 판 — 화면폭과 남은 높이 중 작은 쪽에 맞춘다.
          모서리 버튼이 판 위에 겹치도록, 바깥 틀은 overflow 를 자르지 않는다 */}
      <div className="relative mt-3 w-full max-w-[480px] sm:mt-5" style={{ width: BOARD_W }}>
        <div
          ref={wrapRef}
          className="mandala-board relative aspect-square w-full touch-none select-none overflow-hidden rounded-full border border-ink-3 bg-ink-2/40"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={innerRef} className="h-full w-full origin-center will-change-transform">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <circle cx="100" cy="100" r="98.5" fill="none" stroke="var(--m-frame)" strokeWidth="0.6" />
              {/* 모든 path 가 칸이다 — 테(evenodd 구멍) 위에 안쪽 칸이 얹힌다 */}
              {built.nodes.map((n) => (
                <path
                  key={n.key}
                  d={n.d}
                  data-cell={n.key}
                  fill={fills[n.key] ?? "transparent"}
                  fillRule={n.fillRule}
                  stroke="var(--m-line)"
                  strokeWidth="0.3"
                  strokeLinejoin="round"
                  style={{
                    pointerEvents: "all", // 빈칸은 진짜 투명이되, 짚는 건 잡힌다
                    transition: "fill 0.08s",
                    cursor: scattering ? "default" : "pointer",
                  }}
                />
              ))}
            </svg>
          </div>
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
        </div>
        {/* 판 왼쪽 위 — 원위치 (확대 중이면 금빛으로 살아난다) */}
        <button
          onClick={resetView}
          aria-label="원위치"
          className={`absolute left-0 top-0 z-10 rounded-full border bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] backdrop-blur-sm transition-colors ${PRESS} ${
            zoomed ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-faint hover:text-hanji"
          }`}
        >
          ⊙ 원위치
        </button>
        {/* 판 오른쪽 위 — 비우기 */}
        <button
          onClick={askClear}
          disabled={scattering}
          aria-label="비우기"
          className={`absolute right-0 top-0 z-10 rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50 ${PRESS_WARM}`}
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>

      {/* 판 바로 아래 — 진행 표시 */}
      <p className="mt-2 text-[11px] tracking-[0.2em] text-hanji-faint">
        {filledCount} / {built.cellKeys.length} 칸
      </p>

      {/* 문양 칩 — 가운데 정렬, 폭을 넘치면 가로 스크롤 */}
      <div className="mt-2 w-full max-w-[480px] overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        <div className="flex w-max min-w-full items-center justify-center gap-1.5 px-1">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.key}
              title={t.hanja}
              onClick={() => !scattering && setTplIdx(i)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] tracking-widest transition-colors ${PRESS} ${
                tplIdx === i ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <PaletteBar color={color} onPick={onPick} />
    </>
  );
}

// ── 그리기 모드 ──────────────────────────────────────────
function DrawMode({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scatterRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState(12);
  const [mirror, setMirror] = useState(true);
  const [brush, setBrush] = useState(3);
  const [panMode, setPanMode] = useState(false); // 기본: 연달아 그리기
  const [scattering, setScattering] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const confirm = useConfirm();

  const view = useRef({ scale: 1, x: 0, y: 0 });
  const stroke = useRef({ active: false, last: null as null | { x: number; y: number } });
  const pinch = useRef({ active: false, dist: 0, cx: 0, cy: 0 });
  const pan = useRef({ active: false, x: 0, y: 0 });
  const dirty = useRef(false);
  const undoStack = useRef<ImageData[]>([]); // 되돌리기 스냅샷
  const scatterSeq = useRef(0);
  const SIZE = 1000;

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;
  const getBg = () => bgRef.current?.getContext("2d") ?? null;

  const drawGuides = useCallback(() => {
    const ctx = getBg();
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    // 가이드 선 — 낮 모드에선 짙은 먹선 (인라인 CSS 변수에서 읽는다)
    const g = boardRef.current
      ? getComputedStyle(boardRef.current).getPropertyValue("--m-guide").trim()
      : "";
    ctx.strokeStyle = g || "rgba(217,180,91,0.12)";
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

  // 낮·밤이 바뀌면 가이드 선 색을 다시 칠한다
  useEffect(() => {
    const obs = new MutationObserver(() => drawGuides());
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [drawGuides]);

  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      patchSaved({ drawURL: canvas.toDataURL("image/png") });
    } catch {}
  };

  // 스트로크 시작 전 스냅샷 저장 (되돌리기용)
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
    // 획·이동 상태를 말끔히 정리 — 흩어진 뒤 그리기가 막히지 않도록
    stroke.current.active = false;
    stroke.current.last = null;
    pan.current.active = false;
    pinch.current.active = false;
    const canvas = canvasRef.current;
    const sc = scatterRef.current;
    const wrap = wrapRef.current;
    const src = getCtx();
    if (!canvas || !sc || !wrap || !src || !dirty.current) return;
    const size = wrap.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    const img = src.getImageData(0, 0, SIZE * dpr, SIZE * dpr);
    const parts: Grain[] = [];
    // 잘고 미세한 가루 — 촘촘히 긁어 모은다
    const step = Math.max(4, Math.floor((SIZE * dpr) / 260));
    for (let y = 0; y < SIZE * dpr; y += step) {
      for (let x = 0; x < SIZE * dpr; x += step) {
        const idx = (y * SIZE * dpr + x) * 4;
        if (img.data[idx + 3] < 40) continue;
        const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2];
        parts.push({
          x: (x / (SIZE * dpr)) * size,
          y: (y / (SIZE * dpr)) * size,
          ...grainVel(),
          r: 0.2 + Math.random() * 0.45,
          color: `rgb(${r},${g},${b})`,
        });
      }
    }
    // 상한 없이 전체를 담은 뒤, 너무 많으면 그림 전반에서 골고루 무작위로 솎아낸다
    const MAX = 5200;
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
    const seq = ++scatterSeq.current;
    setScattering(true);
    runScatter(ctx, size, parts, () => {
      if (scatterSeq.current === seq) setScattering(false);
    });
    // rAF 가 멈추는 경우(탭 전환 등)에도 반드시 풀리게 하는 안전핀
    window.setTimeout(() => {
      if (scatterSeq.current === seq) setScattering(false);
    }, SCATTER_MS + 800);
  };

  const askClear = async () => {
    if (!dirty.current || scattering) return;
    const ok = await confirm(
      "만다라를 비우시겠습니까?",
      "모래 만다라처럼, 흩어짐도 수행입니다.",
      { confirm: "비우기", cancel: "머무르기" }
    );
    if (ok) doScatter();
  };

  return (
    <>
      {/* 안내는 데스크톱에만 — 모바일은 한 화면에 다 들어오도록 아낀다 */}
      <p className="mt-2 hidden text-center text-[11px] leading-5 text-hanji-faint sm:block">
        손끝으로 그으면, 여러 갈래로 함께 피어납니다.
      </p>

      {/* 만다라 판 — 색칠 모드와 같은 자리에 모서리 버튼 */}
      <div className="relative mt-3 w-full max-w-[480px]" style={{ width: BOARD_W }}>
        <div
          ref={boardRef}
          className="mandala-board relative aspect-square w-full overflow-hidden rounded-full border border-ink-3 bg-ink-2/40"
        >
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
        {/* 판 왼쪽 위 — 원위치 */}
        <button
          onClick={resetView}
          aria-label="원위치"
          className={`absolute left-0 top-0 z-10 rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors hover:text-hanji ${PRESS}`}
        >
          ⊙ 원위치
        </button>
        {/* 판 오른쪽 위 — 비우기 */}
        <button
          onClick={askClear}
          disabled={scattering}
          aria-label="비우기"
          className={`absolute right-0 top-0 z-10 rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50 ${PRESS_WARM}`}
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>

      {/* 갈래·거울·붓 — 문양 칩 자리(판 바로 아래)로 조용히 올린다 */}
      <div className="mt-2 flex w-full max-w-[480px] flex-wrap items-center justify-center gap-2 px-1">
        <span className="text-[11px] tracking-[0.2em] text-hanji-faint">갈래</span>
        {[6, 8, 12, 16, 24].map((n) => (
          <button
            key={n}
            onClick={() => setSegments(n)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${PRESS} ${
              segments === n ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setMirror((v) => !v)}
          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${PRESS} ${
            mirror ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim hover:text-hanji"
          }`}
        >
          거울
        </button>
        <span className="ml-2 text-[11px] tracking-[0.2em] text-hanji-faint">붓</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
          className="mandala-range w-[120px]"
        />
      </div>

      <PaletteBar color={color} onPick={onPick} />

      {/* 색판 밑 — 되돌리기 · 손으로 옮기기, 이 둘만 */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo || scattering}
          className={`rounded-full border border-ink-3 px-3.5 py-1.5 text-[11px] tracking-[0.1em] text-hanji-dim transition-colors enabled:hover:text-hanji disabled:opacity-40 ${PRESS}`}
        >
          ↩ 되돌리기
        </button>
        <button
          onClick={() => setPanMode((v) => !v)}
          className={`rounded-full border px-3.5 py-1.5 text-[11px] tracking-[0.1em] transition-colors ${PRESS} ${
            panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-dim"
          }`}
        >
          ✋ 손으로 옮기기
        </button>
      </div>
    </>
  );
}
