"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 색칠하기 — 화두를 기다리는 동안의 수행.
// 여섯 폭의 문양. 조각들은 빈틈 없이 맞물려, 어느 칸이든 색이 들어간다.
// 다 채운 뒤 '비우기' — 모래 만다라처럼 색이 흩어져 사라진다.
//
// 화면 짜임
//  · 손안(모바일): 만다라는 화면 폭 가득, 색판은 아래에 붙박이 —
//    색을 고르러 오르내릴 일이 없다.
//  · 넓은 화면: 만다라를 크게 두고 색판을 곁에 세로로 둔다.
// ────────────────────────────────────────────────────────────────

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useConfirm } from "@/components/Confirm";
import {
  buildRegions,
  PALETTE_GROUPS,
  TEMPLATES,
  type Region,
} from "@/lib/mandala";

const STORAGE_KEY = "hwadu.mandala.v2";
const ERASER = "transparent";
const UNDO_MAX = 40;

type Fills = Record<string, string>;
type Board = Record<number, Fills>;

const EMPTY: Fills = {};

// 고른 문양·색·되돌리기 이력을 한 덩어리로 다룬다 —
// 따로 두면 '비우기' 뒤에도 이력이 남아 흩은 것을 되살린다.
type State = { tpl: number; fills: Board; undo: Record<number, Fills[]> };
type Action =
  | { t: "restore"; fills: Board; tpl: number }
  | { t: "tpl"; tpl: number }
  | { t: "paint"; id: string; color: string; remember: boolean }
  | { t: "undo" }
  | { t: "clear" };

function reducer(s: State, a: Action): State {
  if (a.t === "restore") return { tpl: a.tpl, fills: a.fills, undo: {} };
  if (a.t === "tpl") return a.tpl === s.tpl ? s : { ...s, tpl: a.tpl };
  const cur = s.fills[s.tpl] ?? EMPTY;
  const stack = s.undo[s.tpl] ?? [];
  switch (a.t) {
    case "paint": {
      const next = { ...cur };
      if (a.color === ERASER) {
        if (!(a.id in cur)) return s; // 이미 비어 있으면 그대로
        delete next[a.id];
      } else {
        if (cur[a.id] === a.color) return s; // 같은 색이면 그대로
        next[a.id] = a.color;
      }
      return {
        ...s,
        fills: { ...s.fills, [s.tpl]: next },
        undo: a.remember
          ? { ...s.undo, [s.tpl]: [...stack.slice(-(UNDO_MAX - 1)), cur] }
          : s.undo,
      };
    }
    case "undo": {
      if (stack.length === 0) return s;
      return {
        ...s,
        fills: { ...s.fills, [s.tpl]: stack[stack.length - 1] },
        undo: { ...s.undo, [s.tpl]: stack.slice(0, -1) },
      };
    }
    case "clear":
      // 흩은 뒤에는 되돌릴 수 없다 — 이력도 함께 비운다
      return {
        ...s,
        fills: { ...s.fills, [s.tpl]: EMPTY },
        undo: { ...s.undo, [s.tpl]: [] },
      };
  }
}

function writeSaved(tpl: number, fills: Board) {
  // 아직 아무 문양도 손대지 않았다면 적지 않는다 — 저장돼 있던 것을 지우지 않기 위해
  if (Object.keys(fills).length === 0) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tpl, allFills: fills }));
  } catch {
    /* 저장 공간이 모자라면 그냥 넘어간다 */
  }
}

// 낮 모드에서도 선이 또렷하도록 색을 변수로 빼 둔다.
// (흰 종이 위의 옅은 금색은 거의 보이지 않는다 — 낮에는 석간주로 바꾼다)
const SHEET_CSS = `
.mandala-stage{--mandala-chrome:396px}
@media (min-width:768px){.mandala-stage{--mandala-chrome:248px}}
.mandala-sheet{
  --mandala-line:rgba(217,180,91,0.40);
  --mandala-empty:rgba(237,230,212,0.025);
  --mandala-bg:rgba(18,16,13,0.45);
  background:var(--mandala-bg);
  border-radius:9999px;
  touch-action:none;
}
html[data-theme="light"] .mandala-sheet{
  --mandala-line:rgba(122,26,18,0.62);
  --mandala-empty:rgba(122,26,18,0.035);
  --mandala-bg:#faf6f0;
}
.mandala-sheet path{
  fill:var(--mandala-empty);
  stroke:var(--mandala-line);
  stroke-width:0.9px;
  vector-effect:non-scaling-stroke;
  transition:fill .12s;
  outline:none;
}
.mandala-sheet path:focus-visible{stroke:var(--color-gold);stroke-width:2.6px}
.mandala-eraser{background-image:repeating-linear-gradient(45deg,#2a2520 0 4px,#14110d 4px 8px)}
html[data-theme="light"] .mandala-eraser{background-image:repeating-linear-gradient(45deg,#e3d9c9 0 4px,#c6b9a5 4px 8px)}
`;

// ── 색판 — 손안·넓은 화면이 함께 쓴다 ────────────────────────────
// 컴포넌트 밖에 두어야 칠할 때마다 다시 태어나지 않는다
// (다시 태어나면 가로로 밀어 둔 색판이 맨 앞으로 되감긴다)
const Swatches = memo(function Swatches({
  compact,
  color,
  onPick,
}: {
  compact?: boolean;
  color: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className={compact ? "flex gap-3 overflow-x-auto pb-1" : "flex flex-col gap-3"}>
      {PALETTE_GROUPS.map((g) => (
        <div key={g.name} className={compact ? "shrink-0" : ""}>
          <p className="mb-1 text-[9px] tracking-[0.2em] text-hanji-faint">
            {g.name}
          </p>
          <div
            className={
              compact
                ? "grid grid-flow-col grid-rows-2 gap-1.5"
                : "grid grid-cols-4 gap-2"
            }
          >
            {g.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onPick(c)}
                aria-label={`색 ${c}`}
                aria-pressed={color === c}
                className={`h-9 w-9 rounded-full border-2 transition-transform ${
                  color === c
                    ? "scale-110 border-hanji"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      ))}
      {/* 지우개 */}
      <div className={compact ? "shrink-0" : ""}>
        <p className="mb-1 text-[9px] tracking-[0.2em] text-hanji-faint">지움</p>
        <button
          type="button"
          onClick={() => onPick(ERASER)}
          aria-label="지우개"
          aria-pressed={color === ERASER}
          className={`mandala-eraser h-9 w-9 rounded-full border-2 transition-transform ${
            color === ERASER
              ? "scale-110 border-hanji"
              : "border-ink-3 hover:scale-105"
          }`}
        />
      </div>
    </div>
  );
});

export default function MandalaPage() {
  const confirm = useConfirm();
  const [color, setColor] = useState(PALETTE_GROUPS[0].colors[0]);
  const [state, dispatch] = useReducer(reducer, { tpl: 0, fills: {}, undo: {} });
  const [scattering, setScattering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const sandTimerRef = useRef(0);
  const painting = useRef(false);
  const lastCell = useRef<string | null>(null);
  const pending = useRef<{ tpl: number; fills: Board } | null>(null);

  const tpl = state.tpl;
  const template = TEMPLATES[tpl] ?? TEMPLATES[0];
  const regions: Region[] = useMemo(() => buildRegions(template), [template]);
  const fills = state.fills[tpl] ?? EMPTY;
  const undoDepth = (state.undo[tpl] ?? []).length;

  // 색판이 아래에 붙박이로 있는 동안에는 사유의 방 단추를 감춘다 (겹치지 않게)
  useEffect(() => {
    document.body.dataset.palette = "true";
    return () => {
      delete document.body.dataset.palette;
    };
  }, []);

  // 새로고침·탭 이동에도 남도록 되살린다
  const restored = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { tpl?: number; allFills?: Board };
        const savedTpl =
          typeof saved.tpl === "number" && TEMPLATES[saved.tpl] ? saved.tpl : 0;
        if (saved.allFills)
          dispatch({ t: "restore", fills: saved.allFills, tpl: savedTpl });
        else dispatch({ t: "tpl", tpl: savedTpl });
      }
    } catch {
      /* 저장된 값이 깨졌으면 새로 시작한다 */
    }
    restored.current = true;
  }, []);

  // 붓질 한 획에 수십 번 쓰지 않도록 잠깐 미뤄 두고 한 번만 적는다.
  // 미뤄 둔 것은 화면을 떠날 때 반드시 적어 넣는다 — 칠한 것이 사라지면 안 된다.
  useEffect(() => {
    if (!restored.current) return;
    pending.current = { tpl, fills: state.fills };
    const write = () => {
      const p = pending.current;
      if (!p) return;
      pending.current = null;
      writeSaved(p.tpl, p.fills);
    };
    const h = setTimeout(write, 400);
    window.addEventListener("pagehide", write);
    return () => {
      clearTimeout(h);
      window.removeEventListener("pagehide", write);
    };
  }, [tpl, state.fills]);

  // 떠나는 길에 미뤄 둔 저장을 마저 한다
  useEffect(
    () => () => {
      const p = pending.current;
      if (p) writeSaved(p.tpl, p.fills);
    },
    []
  );

  const paint = useCallback(
    (id: string, remember = true) => {
      if (scattering) return;
      dispatch({ t: "paint", id, color, remember });
    },
    [color, scattering]
  );

  const undo = () => {
    if (scattering) return;
    dispatch({ t: "undo" });
  };

  const filledCount = useMemo(
    () => regions.reduce((n, r) => n + (fills[r.id] ? 1 : 0), 0),
    [regions, fills]
  );
  const total = regions.length;
  const done = filledCount >= Math.floor(total * 0.9);

  // ── 붓질 ──────────────────────────────────────────────────
  // 터치에서는 브라우저가 처음 누른 조각에 포인터를 묶어 버려(암묵적 캡처)
  // 이웃 조각에는 pointerenter 가 오지 않는다. 캡처를 풀고 좌표로 칸을 찾는다.
  const hitPaint = useCallback(
    (x: number, y: number, remember: boolean) => {
      const el = document.elementFromPoint(x, y);
      const id = el?.getAttribute("data-cell");
      if (!id || id === lastCell.current) return;
      lastCell.current = id;
      paint(id, remember);
    },
    [paint]
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (scattering) return;
    const t = e.target as Element;
    if (t.hasPointerCapture?.(e.pointerId)) t.releasePointerCapture(e.pointerId);
    painting.current = true;
    lastCell.current = null;
    hitPaint(e.clientX, e.clientY, true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!painting.current || scattering) return;
    // 빠르게 그은 획에서도 칸이 빠지지 않도록 합쳐진 이벤트까지 훑는다
    const native = e.nativeEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const list = coalesced.length > 0 ? coalesced : [native];
    for (const ev of list) hitPaint(ev.clientX, ev.clientY, false);
  };

  const onCellKeyDown = (e: React.KeyboardEvent<SVGPathElement>, id: string) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    lastCell.current = null;
    paint(id);
  };

  useEffect(() => {
    const stop = () => {
      painting.current = false;
      lastCell.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  // ── 모래처럼 흩어지기 ──────────────────────────────────────
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(sandTimerRef.current);
    },
    []
  );

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

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      color: string;
    };
    const parts: P[] = [];
    for (const reg of regions) {
      const c = fills[reg.id];
      if (!c) continue;
      const px = reg.cx * scale;
      const py = reg.cy * scale;
      const count = 10 + Math.floor(Math.random() * 8);
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
    dispatch({ t: "clear" });

    const finish = () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(sandTimerRef.current);
      rafRef.current = 0;
      ctx.clearRect(0, 0, size, size);
      setScattering(false);
    };
    // 다른 탭에 가 있으면 프레임이 오지 않는다 — 그래도 흩어짐은 끝나야 한다
    sandTimerRef.current = window.setTimeout(finish, 3200);

    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 2200;
      if (t < 1) {
        ctx.clearRect(0, 0, size, size);
        for (const p of parts) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.004;
          ctx.globalAlpha = Math.max(0, 1 - t * 1.15);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        rafRef.current = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const clear = async () => {
    if (scattering) return;
    if (filledCount === 0) return;
    const ok = await confirm(
      "공들여 채운 만다라를 비우시겠습니까?",
      "모래 만다라처럼 — 이룬 것을 흩어 없애는 것도 수행입니다.",
      { confirm: "흩다", cancel: "두다" }
    );
    if (ok) runSandEffect();
  };

  const toolBtn =
    "rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji disabled:opacity-40";

  return (
    <div className="mandala-stage mx-auto flex w-full max-w-6xl flex-1 flex-col px-2 pb-[164px] pt-4 md:px-6 md:pb-8 md:pt-6">
      <style dangerouslySetInnerHTML={{ __html: SHEET_CSS }} />

      {/* 머리말 */}
      <div className="text-center">
        <h1 className="text-[11px] tracking-[0.5em] text-gold-soft">
          曼陀羅 · 만다라
        </h1>
        <p className="mt-1.5 text-[11px] leading-5 text-hanji-faint">
          한 잎씩 색을 채웁니다. 다 채운 뒤에는 — 비웁니다.
        </p>
      </div>

      {/* 문양 고르기 */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 md:justify-center">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => !scattering && dispatch({ t: "tpl", tpl: i })}
            aria-pressed={tpl === i}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] tracking-wide transition-colors ${
              tpl === i
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-ink-3 text-hanji-dim hover:text-hanji"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* 본체 */}
      <div className="mt-3 flex flex-1 flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
        {/* 만다라 — 손안에서는 폭 가득, 넓은 화면에서는 남는 높이만큼 크게 */}
        <div
          ref={svgWrapRef}
          className="relative w-full"
          style={{ maxWidth: "min(100%, calc(100dvh - var(--mandala-chrome)))" }}
        >
          <svg
            viewBox="0 0 200 200"
            className="mandala-sheet h-auto w-full select-none"
            role="group"
            aria-label={`${template.name} 만다라 — ${total}칸 가운데 ${filledCount}칸 채움`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            style={{ cursor: scattering ? "default" : "pointer" }}
          >
            {regions.map((r, i) => (
              <path
                key={r.id}
                d={r.d}
                data-cell={r.id}
                role="button"
                tabIndex={0}
                aria-label={`${i + 1}번 칸`}
                aria-pressed={!!fills[r.id]}
                onKeyDown={(e) => onCellKeyDown(e, r.id)}
                style={fills[r.id] ? { fill: fills[r.id] } : undefined}
              />
            ))}
          </svg>
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0"
          />
        </div>

        {/* 넓은 화면 — 곁에 세운 색판 */}
        <div className="hidden w-[228px] shrink-0 flex-col md:flex">
          <div className="sticky top-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.3em] text-hanji-faint">색</p>
              <span
                className={`h-5 w-5 rounded-full border border-ink-3 ${
                  color === ERASER ? "mandala-eraser" : ""
                }`}
                style={
                  color === ERASER ? undefined : { backgroundColor: color }
                }
              />
            </div>
            <div className="mt-2">
              <Swatches color={color} onPick={setColor} />
            </div>

            <p className="mt-4 text-[11px] tracking-wide text-hanji-faint">
              {done ? (
                <span className="text-gold-soft">
                  다 채우셨습니다 — 이제 비울 때
                </span>
              ) : (
                <>
                  {filledCount} / {total} 칸
                </>
              )}
            </p>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={undo}
                disabled={scattering || undoDepth === 0}
                className={toolBtn}
              >
                되돌리기
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={scattering || filledCount === 0}
                className={`flex-1 rounded-[10px] border px-4 py-2 text-[12px] tracking-[0.15em] transition-colors disabled:opacity-40 ${
                  done
                    ? "btn-obang text-hanji hover:opacity-90"
                    : "border-ink-3 text-hanji-dim hover:border-vermilion/50 hover:text-vermilion"
                }`}
              >
                {scattering ? "흩어지는 중…" : "비우기"}
              </button>
            </div>

            <p className="mt-4 text-[10px] leading-5 text-hanji-faint">
              모래로 쌓은 만다라는 완성되는 순간 쓸려 나갑니다.
              <br />
              채움에 매이지 않는 연습.
            </p>

            <Link
              href="/"
              className="mt-4 inline-block text-[11px] tracking-[0.2em] text-hanji-faint transition-colors hover:text-hanji-dim"
            >
              ← 화두로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      {/* 손안 — 아래에 붙박이 색판 (탭 바 위에 앉는다) */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-3 bg-ink/95 px-3 pb-2 pt-2 backdrop-blur md:hidden">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10px] text-hanji-faint">
            <span
              className={`h-4 w-4 rounded-full border border-ink-3 ${
                color === ERASER ? "mandala-eraser" : ""
              }`}
              style={color === ERASER ? undefined : { backgroundColor: color }}
            />
            {done ? (
              <span className="text-gold-soft">다 채움 — 비울 때</span>
            ) : (
              <>
                {filledCount} / {total} 칸
              </>
            )}
          </span>
          <span className="flex gap-1.5">
            <button
              type="button"
              onClick={undo}
              disabled={scattering || undoDepth === 0}
              className="rounded-[8px] border border-ink-3 px-3 py-1 text-[11px] text-hanji-dim disabled:opacity-40"
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={scattering || filledCount === 0}
              className="rounded-[8px] border border-ink-3 px-3 py-1 text-[11px] text-hanji-dim disabled:opacity-40"
            >
              {scattering ? "흩는 중" : "비우기"}
            </button>
          </span>
        </div>
        <Swatches compact color={color} onPick={setColor} />
      </div>
    </div>
  );
}
