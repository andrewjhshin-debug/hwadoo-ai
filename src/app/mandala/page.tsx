"use client";

// ────────────────────────────────────────────────────────────────
// 만다라 색칠하기 — 화두를 기다리는 동안의 수행.
// 다섯 폭의 문양. 조각들은 빈틈 없이 맞물려, 어느 칸이든 색이 들어간다.
// 다 채운 뒤 '비우기' — 모래 만다라처럼 색이 흩어져 사라진다.
//
// 화면 짜임
//  · 손안(모바일): 만다라는 화면 폭 가득, 색판은 아래에 붙박이 —
//    색을 고르러 오르내릴 일이 없다.
//  · 넓은 화면: 만다라를 크게 두고 색판을 곁에 세로로 둔다.
// ────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function MandalaPage() {
  const confirm = useConfirm();
  const [tpl, setTpl] = useState(0);
  const [color, setColor] = useState(PALETTE_GROUPS[0].colors[0]);
  const [allFills, setAllFills] = useState<Record<number, Fills>>({});
  const [undoStack, setUndoStack] = useState<Fills[]>([]);
  const [scattering, setScattering] = useState(false);
  const [restored, setRestored] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const painting = useRef(false);

  const template = TEMPLATES[tpl] ?? TEMPLATES[0];
  const regions: Region[] = useMemo(() => buildRegions(template), [template]);
  const fills = allFills[tpl] ?? {};

  // 색판이 아래에 붙박이로 있는 동안에는 사유의 방 단추를 감춘다 (겹치지 않게)
  useEffect(() => {
    document.body.dataset.palette = "true";
    return () => {
      delete document.body.dataset.palette;
    };
  }, []);

  // 새로고침·탭 이동에도 남도록 되살린다
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          tpl?: number;
          allFills?: Record<number, Fills>;
        };
        if (saved.allFills) setAllFills(saved.allFills);
        if (typeof saved.tpl === "number" && TEMPLATES[saved.tpl])
          setTpl(saved.tpl);
      }
    } catch {
      /* 저장된 값이 깨졌으면 새로 시작한다 */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tpl, allFills }));
    } catch {
      /* 저장 공간이 모자라면 그냥 넘어간다 */
    }
  }, [tpl, allFills, restored]);

  const setFills = useCallback(
    (updater: (prev: Fills) => Fills, remember = true) => {
      setAllFills((prev) => {
        const cur = prev[tpl] ?? {};
        const next = updater(cur);
        if (remember) {
          setUndoStack((s) => [...s.slice(-(UNDO_MAX - 1)), cur]);
        }
        return { ...prev, [tpl]: next };
      });
    },
    [tpl]
  );

  const paint = useCallback(
    (id: string, remember = true) => {
      if (scattering) return;
      setFills((prev) => {
        if (color === ERASER) {
          if (!prev[id]) return prev; // 이미 비어 있으면 그대로
          const next = { ...prev };
          delete next[id];
          return next;
        }
        if (prev[id] === color) return prev; // 같은 색이면 그대로
        return { ...prev, [id]: color };
      }, remember);
    },
    [color, scattering, setFills]
  );

  const undo = () => {
    if (scattering || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setAllFills((all) => ({ ...all, [tpl]: prev }));
  };

  const filledCount = Object.keys(fills).length;
  const total = regions.length;
  const done = filledCount >= Math.floor(total * 0.9);

  // 붓질처럼 — 누른 채 지나가면 이어서 칠해진다
  const onPointerDown = (id: string) => {
    painting.current = true;
    paint(id);
  };
  const onPointerEnter = (id: string) => {
    if (painting.current) paint(id, false);
  };
  useEffect(() => {
    const stop = () => {
      painting.current = false;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  // ── 모래처럼 흩어지기 ──────────────────────────────────────
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
    setFills(() => ({}));
    setUndoStack([]);

    let raf = 0;
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
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, size, size);
        cancelAnimationFrame(raf);
        setScattering(false);
      }
    };
    raf = requestAnimationFrame(tick);
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

  // ── 색판 (손안·넓은 화면 공통으로 쓰는 알맹이) ────────────────
  const Swatches = ({ compact }: { compact?: boolean }) => (
    <div
      className={
        compact
          ? "flex gap-3 overflow-x-auto pb-1"
          : "flex flex-col gap-3"
      }
    >
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
                onClick={() => setColor(c)}
                aria-label={`색 ${c}`}
                aria-pressed={color === c}
                className={`rounded-full border-2 transition-transform ${
                  compact ? "h-8 w-8" : "h-9 w-9"
                } ${
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
        <p className="mb-1 text-[9px] tracking-[0.2em] text-hanji-faint">
          지움
        </p>
        <button
          onClick={() => setColor(ERASER)}
          aria-label="지우개"
          aria-pressed={color === ERASER}
          className={`rounded-full border-2 transition-transform ${
            compact ? "h-8 w-8" : "h-9 w-9"
          } ${
            color === ERASER
              ? "scale-110 border-hanji"
              : "border-ink-3 hover:scale-105"
          }`}
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #2a2520 0 4px, #14110d 4px 8px)",
          }}
        />
      </div>
    </div>
  );

  const toolBtn =
    "rounded-[10px] border border-ink-3 px-4 py-2 text-[12px] tracking-[0.15em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji disabled:opacity-40";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-[150px] pt-5 sm:px-6 sm:pb-8">
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
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 sm:justify-center">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.key}
            onClick={() => !scattering && setTpl(i)}
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
      <div className="mt-3 flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
        {/* 만다라 — 손안에서는 폭 가득, 넓은 화면에서는 크게 */}
        <div
          ref={svgWrapRef}
          className="relative w-full max-w-[min(92vw,560px)] sm:max-w-[min(72vh,620px)]"
        >
          <svg
            viewBox="0 0 200 200"
            className="h-auto w-full touch-manipulation select-none"
            style={{ overflow: "visible" }}
          >
            {regions.map((r) => (
              <path
                key={r.id}
                d={r.d}
                onPointerDown={() => onPointerDown(r.id)}
                onPointerEnter={() => onPointerEnter(r.id)}
                fill={fills[r.id] ?? "rgba(255,255,255,0.012)"}
                stroke="rgba(217,180,91,0.34)"
                strokeWidth="0.3"
                style={{
                  cursor: scattering ? "default" : "pointer",
                  transition: "fill 0.1s",
                }}
              />
            ))}
          </svg>
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0"
          />
        </div>

        {/* 넓은 화면 — 곁에 세운 색판 */}
        <div className="hidden w-[228px] shrink-0 flex-col sm:flex">
          <div className="sticky top-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.3em] text-hanji-faint">색</p>
              <span
                className="h-5 w-5 rounded-full border border-ink-3"
                style={
                  color === ERASER
                    ? {
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #2a2520 0 4px, #14110d 4px 8px)",
                      }
                    : { backgroundColor: color }
                }
              />
            </div>
            <div className="mt-2">
              <Swatches />
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
                onClick={undo}
                disabled={scattering || undoStack.length === 0}
                className={toolBtn}
              >
                되돌리기
              </button>
              <button
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
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-3 bg-ink/95 px-3 pb-2 pt-2 backdrop-blur sm:hidden">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10px] text-hanji-faint">
            <span
              className="h-4 w-4 rounded-full border border-ink-3"
              style={
                color === ERASER
                  ? {
                      backgroundImage:
                        "repeating-linear-gradient(45deg, #2a2520 0 4px, #14110d 4px 8px)",
                    }
                  : { backgroundColor: color }
              }
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
              onClick={undo}
              disabled={scattering || undoStack.length === 0}
              className="rounded-[8px] border border-ink-3 px-3 py-1 text-[11px] text-hanji-dim disabled:opacity-40"
            >
              되돌리기
            </button>
            <button
              onClick={clear}
              disabled={scattering || filledCount === 0}
              className="rounded-[8px] border border-ink-3 px-3 py-1 text-[11px] text-hanji-dim disabled:opacity-40"
            >
              {scattering ? "흩는 중" : "비우기"}
            </button>
          </span>
        </div>
        <Swatches compact />
      </div>
    </div>
  );
}
