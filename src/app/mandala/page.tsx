"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 — 화두를 기다리는 동안의 수행. 두 갈래.
//  ① 색칠하기: lib/mandala 가 꽃잎·아치·구슬·마름모를 겹겹이 쌓아 짠 다섯 폭.
//     눈에 보이는 모든 닫힌 구역이 저마다 한 칸(data-cell)이다 — 꽃잎 속
//     작은 꽃잎이면 테와 속잎이 서로 다른 칸, 구슬 한 알도 제 칸.
//     하나하나 짚어 칠하는 것이 곧 수행이다.
//     한 손가락 탭 = 그 칸 하나 색칠, 우클릭 = 그 칸 비우기.
//     꾹 누르기(한 자리 500ms, 이동 8px 미만) = 그 칸 비우기 — 떼도 칠하지 않는다.
//     한 손가락 드래그(문턱 8px) = 판 이동(팬) — 긁어서 연달아 칠하지 않는다.
//     두 손가락 = 핀치 확대(1~3배), 더블탭 = 원위치. 되돌리기 = 마지막 한 칸.
//  ② 그리기: 손끝으로 그으면 여러 갈래로 대칭 복제. 되돌리기·붓 굵기 지원.
// 만다라는 간직하지 않는다 — 비움도 수행. 비울 때 색이 가루로 흩어진다.
// 하던 만다라는 자동 임시저장되어, 다른 일 하다 돌아와도 그대로 떠 있다.
// 배치 — 판 위에는 아무 버튼도 겹치지 않는다. 캡처하면 만다라만 나온다.
//  모바일: 토글 바로 아래 얇은 도구줄에 [원위치 · 되돌리기 · (그리기만) 옮기기 ·
//  비우기 · 내려받기 · (그리기만) 붓]이 작게 나란히 앉는다.
//  데스크톱(sm+): 좌우에 자리가 넉넉하니 원위치·되돌리기·옮기기는 판 왼쪽 바깥
//  세로 스택, 비우기는 판 오른쪽 바깥(둘 다 16px 간격) — 도구줄에는 내려받기(와
//  그리기의 붓)만 남는다. 데스크톱 마우스: 휠 = 커서 자리 기준
//  확대/축소(1~3배, 핀치와 같은 클램프), 꾹 눌러 끌면 팬 — 로직은 터치와 한 몸.
//  색칠: [토글 → 도구줄 → 만다라 → N/M칸 → 문양 칩(가운데) → 색판]
//  그리기: [토글 → 도구줄 → 만다라 → 갈래·거울 → 색판]
// 가 스크롤 없이 한 화면에 들어온다.
//  내려받기 — 색칠은 SVG 를 XMLSerializer → Image → canvas(1024²)로 굽고,
//  그리기는 가이드+그림 캔버스를 합성한다. 배경은 늘 먹빛(#0d0b09)이라
//  테마와 무관하게 밤 금선으로 굽는다. 실패는 조용히 삼킨다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PALETTE, TEMPLATES, buildMandala } from "@/lib/mandala";
import { useConfirm } from "@/components/Confirm";

const ERASE = "erase";
// v3 — 문양 엔진이 바뀌어 칸 key 가 다르다. 옛 저장(fills)과 섞지 않는다.
const MKEY = "hwadu.mandala.v3";
const OLD_MKEY = "hwadoo-mandala-v1";

// 만다라 판의 한 변 — 화면폭(-16px)과, 화면높이에서 고정 요소(헤더·토글·도구줄·
// 칩·색판·탭바)를 뺀 값 중 작은 쪽. 데스크톱에선 480px 를 넘지 않고,
// 아주 낮은 가로 화면에서도 240px 아래로는 쪼그라들지 않는다.
const BOARD_W = "max(240px, min(100vw - 16px, 100dvh - 390px, 480px))";

// 조각 테두리 — 밤엔 옅은 금선, 낮엔 짙은 먹선(#3a2c20 계열)이어야 흐리지 않다.
// globals.css 는 다른 손이 만지므로, 여기서 인라인 CSS 변수로만 해결한다.
const THEME_CSS = `
.mandala-board { --m-line: rgba(217,180,91,0.32); --m-frame: rgba(217,180,91,0.16); --m-guide: rgba(217,180,91,0.12); }
html[data-theme="light"] .mandala-board { --m-line: rgba(58,44,32,0.62); --m-frame: rgba(58,44,32,0.4); --m-guide: rgba(58,44,32,0.3); }
`;

// 도구 버튼 눌림 피드백 — 토글이든 단발 버튼이든, 누르는 동안 불이 들어온다
const PRESS = "active:border-gold/60 active:bg-gold/10 active:text-gold";
const PRESS_WARM = "active:border-vermilion/60 active:bg-vermilion/10 active:text-vermilion";

// 도구줄 버튼 — 모바일은 토글 아래 얇게 나란히(판 위에는 아무것도 얹지 않는다),
// 데스크톱(sm+)은 여백이 넉넉하니 조금 넓게 앉는다
const TOOL =
  "rounded-full border bg-ink-2/70 px-1.5 py-1 text-[10px] tracking-[0.1em] backdrop-blur-sm transition-colors sm:px-2.5";

// ══════════════ 내려받기 ══════════════
// 배경은 늘 먹빛 — 테마와 무관하게 밤 금선으로 굽는다 (파일 머리 주석의 약속)
const DL_SIZE = 1024;
const DL_BG = "#0d0b09";
const DL_LINE = "rgba(217,180,91,0.32)";
const DL_FRAME = "rgba(217,180,91,0.16)";
const DL_GUIDE = "rgba(217,180,91,0.12)";

// 구운 canvas 를 hwadu-mandala.png 로 내린다 — 실패는 조용히 삼킨다
function savePng(canvas: HTMLCanvasElement) {
  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hwadu-mandala.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  } catch {}
}

// 가이드 선(동심원·방사선) — 화면 배경 캔버스와 내려받기 합성이 같은 그림을 쓴다
function paintGuides(
  ctx: CanvasRenderingContext2D,
  size: number,
  strokeStyle: string,
  segments: number
) {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = size / 1000;
  const c = size / 2;
  const k = size / 1000;
  for (let r = 70 * k; r < c; r += 80 * k) {
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
  const svgRef = useRef<SVGSVGElement>(null);

  // 포인터 살림 — 손가락별 위치, 핀치 기준, 확대·이동 상태
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  // 한 손가락 — 탭인지 팬인지 문턱(8px)을 넘기 전엔 모른다.
  // held = 꾹 눌러 이미 그 칸을 비웠다 — 떼도 칠하지 않는다.
  const gesture = useRef<null | {
    mode: "pending" | "pan" | "held";
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    button: number;
  }>(null);
  // 꾹 누르기(500ms) 재개 타이머 — 팬·핀치·떼기가 끼어들면 곧장 무른다
  const holdTimer = useRef<number | null>(null);
  const clearHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);
  useEffect(() => clearHold, [clearHold]);
  // 되돌리기 더미 — 칠하기 직전의 칸 상태를 쌓는다
  const undoStack = useRef<{ tpl: string; id: string; prev: string | undefined }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
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

  // 탭 한 번 = 칸 하나 — 바뀔 때만 되돌리기 더미에 이전 상태를 쌓는다
  const paintCell = (id: string, erase: boolean) => {
    if (scattering) return;
    const prev = fills[id];
    const next = erase || color === ERASE ? undefined : color;
    if (prev === next) return;
    undoStack.current.push({ tpl: String(tplIdx), id, prev });
    if (undoStack.current.length > 200) undoStack.current.shift();
    setCanUndo(true);
    setFillsAll((all) => {
      const cur = { ...(all[String(tplIdx)] ?? {}) };
      if (next === undefined) delete cur[id];
      else cur[id] = next;
      return { ...all, [String(tplIdx)]: cur };
    });
  };

  const undo = () => {
    const last = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!last) return;
    setFillsAll((all) => {
      const cur = { ...(all[last.tpl] ?? {}) };
      if (last.prev === undefined) delete cur[last.id];
      else cur[last.id] = last.prev;
      return { ...all, [last.tpl]: cur };
    });
  };

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

  // 데스크톱 — 마우스 휠 줌: 커서 자리를 붙들고 확대/축소, 핀치와 같은 1~3 클램프.
  // React 의 onWheel 은 passive 라 preventDefault 가 안 먹는다 —
  // ref 에 { passive: false } 로 직접 붙여 페이지 스크롤과 충돌하지 않게 한다.
  const scatteringRef = useRef(false);
  useEffect(() => {
    scatteringRef.current = scattering;
  }, [scattering]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // 판 위에선 페이지를 굴리지 않는다
      if (scatteringRef.current) return;
      const v = view.current;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1; // 줄·쪽 단위 휠도 픽셀로
      const ns = Math.min(3, Math.max(1, v.scale * Math.exp(-e.deltaY * unit * 0.0015)));
      const rect = wrap.getBoundingClientRect();
      // 커서가 짚은 문양 자리가 확대 후에도 커서 밑에 남도록 이동을 함께 푼다
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const k = v.scale > 0 ? ns / v.scale : 1;
      v.x = mx - (mx - v.x) * k;
      v.y = my - (my - v.y) * k;
      v.scale = ns;
      applyView(); // 핀치와 같은 위치 클램프 — 배율은 그대로 남는다
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    return () => wrap.removeEventListener("wheel", onWheel);
    // applyView 는 ref 와 안정된 setState 만 만진다 — 첫 렌더의 것을 붙들어도 안전
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면 좌표 → 칸 id (확대·이동이 걸려 있어도 그대로 맞는다)
  const cellAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const hit = el ? el.closest("[data-cell]") : null;
    return hit ? hit.getAttribute("data-cell") : null;
  };

  const TAP_SLOP = 8; // px — 이 안에서 떼면 탭(색칠), 넘으면 팬(판 이동)
  const HOLD_MS = 500; // ms — 한 자리에서 이만큼 누르고 있으면 그 칸 비우기

  const onPointerDown = (e: React.PointerEvent) => {
    if (scattering) return;
    clearHold();
    try {
      wrapRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 두 번째 손가락 — 탭·팬을 접고 핀치 확대·이동 모드로
    if (pointers.current.size === 2) {
      gesture.current = null;
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

    // 아직 탭인지 팬인지 모른다 — 여기서는 칠하지 않는다 (떼는 순간 판정)
    gesture.current = {
      mode: "pending",
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      button: e.button,
    };
    // 꾹 누르기 — 500ms 동안 문턱(8px)을 안 넘고 버티면 그 칸을 비운다
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      const g = gesture.current;
      if (!g || g.mode !== "pending") return;
      g.mode = "held"; // 떼도 칠하지 않는다
      const id = cellAt(g.lastX, g.lastY);
      if (id) paintCell(id, true);
    }, HOLD_MS);
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

    // 한 손가락 — 문턱을 넘는 순간 팬으로 확정, 그 뒤로는 판만 옮긴다
    const g = gesture.current;
    if (!g || pointers.current.size !== 1) return;
    if (g.mode === "pending" && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > TAP_SLOP) {
      g.mode = "pan";
      clearHold(); // 문턱을 넘었다 — 꾹 누르기가 아니라 팬이다
    }
    if (g.mode === "pan") {
      view.current.x += e.clientX - g.lastX;
      view.current.y += e.clientY - g.lastY;
      applyView(); // 배율 1이면 클램프가 0이라 제자리 — 그래도 된다
    }
    g.lastX = e.clientX;
    g.lastY = e.clientY;
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null; // 배율은 그대로 남는다
  };

  const onPointerUp = (e: React.PointerEvent) => {
    clearHold();
    const g = gesture.current;
    // 문턱 안에서 뗐다 — 탭 = 그 칸 하나 색칠 (우클릭이면 그 칸 비우기)
    // held(꾹 눌러 이미 비운 칸)면 여기서는 아무것도 하지 않는다
    if (g && g.mode === "pending" && pointers.current.has(e.pointerId) && pointers.current.size === 1) {
      const id = cellAt(e.clientX, e.clientY);
      if (id) paintCell(id, g.button === 2);
    }
    gesture.current = null;
    endPointer(e);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    clearHold();
    gesture.current = null;
    endPointer(e);
  };

  // ── 비우기(모래 흩어짐) ──
  const doScatter = () => {
    // 포인터 살림을 말끔히 정리 — 흩어진 뒤 그리기가 막히는 일이 없도록
    clearHold();
    gesture.current = null;
    pointers.current.clear();
    pinch.current = null;
    undoStack.current = []; // 비움은 되돌리지 않는다 — 그리기 모드와 같은 결
    setCanUndo(false);
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

  // ── 내려받기 — SVG → XMLSerializer → Image → canvas(1024²) → PNG ──
  // CSS 변수는 판 밖에서 풀리지 않으니, 밤 금선 값으로 바꿔 굽는다.
  const download = () => {
    try {
      const svg = svgRef.current;
      if (!svg) return;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(DL_SIZE));
      clone.setAttribute("height", String(DL_SIZE));
      const xml = new XMLSerializer()
        .serializeToString(clone)
        .replace(/var\(--m-line\)/g, DL_LINE)
        .replace(/var\(--m-frame\)/g, DL_FRAME);
      const url = URL.createObjectURL(
        new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
      );
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const out = document.createElement("canvas");
        out.width = DL_SIZE;
        out.height = DL_SIZE;
        const ctx = out.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = DL_BG;
        ctx.fillRect(0, 0, DL_SIZE, DL_SIZE);
        ctx.drawImage(img, 0, 0, DL_SIZE, DL_SIZE);
        savePng(out);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    } catch {}
  };

  return (
    <>
      {/* 도구줄 — 토글 바로 아래. 판 위에는 아무것도 얹지 않는다 — 캡처하면 만다라만.
          원위치·되돌리기·비우기는 모바일 전용, 데스크톱(sm+)에선 판 바깥에 있다 */}
      <div className="mt-2 flex w-full max-w-[480px] flex-wrap items-center justify-center gap-1">
        <button
          onClick={resetView}
          aria-label="원위치(더블탭)"
          className={`${TOOL} ${PRESS} sm:hidden ${
            zoomed ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-faint"
          }`}
        >
          원위치
        </button>
        <button
          onClick={undo}
          disabled={!canUndo || scattering}
          aria-label="되돌리기"
          className={`${TOOL} ${PRESS} border-ink-3 text-hanji-faint disabled:opacity-40 sm:hidden`}
        >
          되돌리기
        </button>
        <button
          onClick={askClear}
          disabled={scattering}
          aria-label="비우기"
          className={`${TOOL} ${PRESS_WARM} border-ink-3 text-hanji-faint disabled:opacity-50 sm:hidden`}
        >
          비우기
        </button>
        <button
          onClick={download}
          aria-label="내려받기"
          className={`${TOOL} ${PRESS} border-ink-3 text-hanji-faint hover:text-hanji`}
        >
          <span className="hidden sm:inline">⤓ </span>내려받기
        </button>
      </div>

      {/* 만다라 판 — 화면폭과 남은 높이 중 작은 쪽에 맞춘다.
          판 위에는 아무 버튼도 없다 — 바깥 틀은 데스크톱 바깥 버튼을 위해 overflow 를 자르지 않는다 */}
      <div className="relative mt-3 w-full max-w-[480px] sm:mt-5" style={{ width: BOARD_W }}>
        <div
          ref={wrapRef}
          className="mandala-board relative aspect-square w-full touch-none select-none overflow-hidden rounded-full border border-ink-3 bg-ink-2/40"
          // 꾹 누르기 동안 iOS 말풍선·선택이 끼어들지 않게 — contextmenu 는 아래서 막는다
          style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={innerRef} className="h-full w-full origin-center will-change-transform">
            <svg ref={svgRef} viewBox="0 0 200 200" className="h-full w-full">
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
        {/* 데스크톱(sm+) 전용 — 판 왼쪽 바깥 세로 스택(16px 간격): 원위치 · 되돌리기.
            모바일은 위 도구줄로 올라갔다 — 판 위에는 아무것도 겹치지 않는다 */}
        <div className="absolute right-full top-0 z-10 mr-4 hidden flex-col items-end gap-1 whitespace-nowrap sm:flex">
          <button
            onClick={resetView}
            aria-label="원위치(더블탭)"
            className={`rounded-full border bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] backdrop-blur-sm transition-colors ${PRESS} ${
              zoomed ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-faint hover:text-hanji"
            }`}
          >
            ⊙ 원위치(더블탭)
          </button>
          <button
            onClick={undo}
            disabled={!canUndo || scattering}
            aria-label="되돌리기"
            className={`rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors enabled:hover:text-hanji disabled:opacity-40 ${PRESS}`}
          >
            ↩ 되돌리기
          </button>
        </div>
        {/* 데스크톱(sm+) 전용 — 판 오른쪽 바깥(16px 간격) 비우기 */}
        <button
          onClick={askClear}
          disabled={scattering}
          aria-label="비우기"
          className={`absolute left-full top-0 z-10 ml-4 hidden whitespace-nowrap rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50 sm:block ${PRESS_WARM}`}
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
              onClick={() => {
                if (scattering || tplIdx === i) return;
                // 문양이 바뀌면 되돌리기 더미도 비운다 — 남의 판을 되돌리지 않게
                undoStack.current = [];
                setCanUndo(false);
                setTplIdx(i);
              }}
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
  const [brush, setBrush] = useState(3); // 붓 굵기 — 도구줄(토글 아래) 슬라이더로 고른다
  const [panMode, setPanMode] = useState(false); // 기본: 연달아 그리기
  const [scattering, setScattering] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const confirm = useConfirm();

  const view = useRef({ scale: 1, x: 0, y: 0 });
  const stroke = useRef({ active: false, last: null as null | { x: number; y: number } });
  const pinch = useRef({ active: false, dist: 0, cx: 0, cy: 0 });
  const pan = useRef({ active: false, x: 0, y: 0 });
  const lastTap = useRef({ t: 0, x: 0, y: 0 }); // 더블탭 = 원위치 (색칠 모드와 같은 결)
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
    // 가이드 선 — 낮 모드에선 짙은 먹선 (인라인 CSS 변수에서 읽는다)
    const g = boardRef.current
      ? getComputedStyle(boardRef.current).getPropertyValue("--m-guide").trim()
      : "";
    paintGuides(ctx, SIZE, g || DL_GUIDE, segments);
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

  // 데스크톱 — 마우스 휠 줌: 커서 자리를 붙들고 확대/축소 (색칠 모드와 같은 결).
  // React 의 onWheel 은 passive 라 preventDefault 가 안 먹는다 —
  // ref 에 { passive: false } 로 직접 붙여 페이지 스크롤과 충돌하지 않게 한다.
  const scatteringRef = useRef(false);
  useEffect(() => {
    scatteringRef.current = scattering;
  }, [scattering]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // 판 위에선 페이지를 굴리지 않는다
      if (scatteringRef.current) return;
      const v = view.current;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1; // 줄·쪽 단위 휠도 픽셀로
      const ns = Math.min(3, Math.max(1, v.scale * Math.exp(-e.deltaY * unit * 0.0015)));
      const rect = board.getBoundingClientRect();
      // 커서가 짚은 자리가 확대 후에도 커서 밑에 남도록 이동을 함께 푼다
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const k = v.scale > 0 ? ns / v.scale : 1;
      v.x = mx - (mx - v.x) * k;
      v.y = my - (my - v.y) * k;
      v.scale = ns;
      applyTransform();
    };
    board.addEventListener("wheel", onWheel, { passive: false });
    return () => board.removeEventListener("wheel", onWheel);
    // applyTransform 은 ref 만 만진다 — 첫 렌더의 것을 붙들어도 안전
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (scattering) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    // 더블탭 = 원위치 — 확대·이동이 걸려 있을 때만. 탭은 획을 남기지 않으니
    // (움직임 없인 아무것도 안 그린다) 그림을 해치지 않는다. 첫 손가락만 센다.
    if (e.isPrimary) {
      const now = performance.now();
      const lt = lastTap.current;
      const v = view.current;
      const moved = Math.abs(v.scale - 1) > 0.01 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      if (now - lt.t < 300 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30 && moved) {
        lastTap.current = { t: 0, x: 0, y: 0 };
        resetView();
        return;
      }
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
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

  // ── 내려받기 — 가이드+그림 캔버스를 1024² 판에 합성한다 ──
  // 화면과 같은 원형 판: 원 밖은 먹빛, 가이드는 테마와 무관하게 밤 금선.
  const download = () => {
    try {
      const main = canvasRef.current;
      if (!main) return;
      const out = document.createElement("canvas");
      out.width = DL_SIZE;
      out.height = DL_SIZE;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = DL_BG;
      ctx.fillRect(0, 0, DL_SIZE, DL_SIZE);
      ctx.beginPath();
      ctx.arc(DL_SIZE / 2, DL_SIZE / 2, DL_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      paintGuides(ctx, DL_SIZE, DL_GUIDE, segments);
      ctx.drawImage(main, 0, 0, DL_SIZE, DL_SIZE);
      savePng(out);
    } catch {}
  };

  return (
    <>
      {/* 도구줄 — 토글 바로 아래. 판 위에는 아무것도 얹지 않는다 — 캡처하면 만다라만.
          원위치·되돌리기·옮기기·비우기는 모바일 전용, 데스크톱(sm+)에선 판 바깥에 있다.
          붓 굵기는 여기 — 거울 옆이 아니라 토글 곁에서 고른다 */}
      <div className="mt-2 flex w-full max-w-[480px] flex-wrap items-center justify-center gap-1">
        <button
          onClick={resetView}
          aria-label="원위치(더블탭)"
          className={`${TOOL} ${PRESS} border-ink-3 text-hanji-faint sm:hidden`}
        >
          원위치
        </button>
        <button
          onClick={undo}
          disabled={!canUndo || scattering}
          aria-label="되돌리기"
          className={`${TOOL} ${PRESS} border-ink-3 text-hanji-faint disabled:opacity-40 sm:hidden`}
        >
          되돌리기
        </button>
        <button
          onClick={() => setPanMode((v) => !v)}
          aria-label="손으로 옮기기"
          className={`${TOOL} ${PRESS} sm:hidden ${
            panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-faint"
          }`}
        >
          옮기기
        </button>
        <button
          onClick={askClear}
          disabled={scattering}
          aria-label="비우기"
          className={`${TOOL} ${PRESS_WARM} border-ink-3 text-hanji-faint disabled:opacity-50 sm:hidden`}
        >
          비우기
        </button>
        <button
          onClick={download}
          aria-label="내려받기"
          className={`${TOOL} ${PRESS} border-ink-3 text-hanji-faint hover:text-hanji`}
        >
          <span className="hidden sm:inline">⤓ </span>내려받기
        </button>
        <span className="ml-1 hidden text-[11px] tracking-[0.2em] text-hanji-faint sm:inline">
          붓
        </span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
          aria-label="붓 굵기"
          className="mandala-range w-16 sm:w-[120px]"
        />
      </div>

      {/* 안내는 데스크톱에만 — 모바일은 한 화면에 다 들어오도록 아낀다 */}
      <p className="mt-2 hidden text-center text-[11px] leading-5 text-hanji-faint sm:block">
        손끝으로 그으면, 여러 갈래로 함께 피어납니다.
      </p>

      {/* 만다라 판 — 판 위에는 아무 버튼도 없다. 색칠 모드와 같은 결 */}
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
        {/* 데스크톱(sm+) 전용 — 판 왼쪽 바깥 세로 스택(16px 간격):
            원위치 · 되돌리기 · 손으로 옮기기. 모바일은 위 도구줄로 올라갔다 */}
        <div className="absolute right-full top-0 z-10 mr-4 hidden flex-col items-end gap-1 whitespace-nowrap sm:flex">
          <button
            onClick={resetView}
            aria-label="원위치(더블탭)"
            className={`rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors hover:text-hanji ${PRESS}`}
          >
            ⊙ 원위치(더블탭)
          </button>
          <button
            onClick={undo}
            disabled={!canUndo || scattering}
            aria-label="되돌리기"
            className={`rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors enabled:hover:text-hanji disabled:opacity-40 ${PRESS}`}
          >
            ↩ 되돌리기
          </button>
          <button
            onClick={() => setPanMode((v) => !v)}
            aria-label="손으로 옮기기"
            className={`rounded-full border bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] backdrop-blur-sm transition-colors ${PRESS} ${
              panMode ? "border-gold/60 text-gold" : "border-ink-3 text-hanji-faint hover:text-hanji"
            }`}
          >
            ✋ 손으로 옮기기
          </button>
        </div>
        {/* 데스크톱(sm+) 전용 — 판 오른쪽 바깥(16px 간격) 비우기 */}
        <button
          onClick={askClear}
          disabled={scattering}
          aria-label="비우기"
          className={`absolute left-full top-0 z-10 ml-4 hidden whitespace-nowrap rounded-full border border-ink-3 bg-ink-2/70 px-2.5 py-1 text-[10px] tracking-[0.1em] text-hanji-faint backdrop-blur-sm transition-colors hover:border-vermilion/50 hover:text-vermilion disabled:opacity-50 sm:block ${PRESS_WARM}`}
        >
          {scattering ? "흩어지는 중…" : "비우기"}
        </button>
      </div>

      {/* 갈래·거울 — 문양 칩 자리(판 바로 아래). 붓은 위 도구줄로 옮겨 갔다 */}
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
      </div>

      <PaletteBar color={color} onPick={onPick} />
    </>
  );
}
