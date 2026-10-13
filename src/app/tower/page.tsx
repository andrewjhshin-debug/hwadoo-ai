"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import HipRoom from "@/components/HipRoom";
import { addMerit } from "@/lib/merit";
import { buzz, strikeStone } from "@/lib/sound";
import { ATLAS_SIZE, STONE_ATLAS, TOWER_STONES, TOWER_WIDTH, TOWER_HEIGHT, clampPlacementX, evaluateBalance, nextAim, placeStone, supportOf, survivingStones } from "@/lib/tower-balance";
import type { Balance, PlacedStone } from "@/lib/tower-balance";
import "./tower.css";

function Rock({ stone, preview = false, falling = false, direction = 1 }: {
  stone: PlacedStone; preview?: boolean; falling?: boolean; direction?: number;
}) {
  const s = TOWER_STONES[stone.index], [x, y, w, h] = s.crop;
  return <span className={`hip-cairn-rock${preview ? " preview" : ""}${falling ? " falling" : ""}`} data-stone={stone.index} aria-hidden="true" style={{
    left: TOWER_WIDTH / 2 + stone.x - s.width / 2, top: stone.y, width: s.width, height: s.height,
    "--rock-angle": `${s.tilt}deg`, "--rock-pivot": `${s.bottom * 100}%`,
    "--fall-x": `${direction * 105}px`, "--fall-angle": `${direction * 65}deg`,
  } as CSSProperties}>
    {/* CSS crop preserves the generated atlas and its alpha without rewriting pixels. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={STONE_ATLAS} alt="" draggable={false} style={{ width: `${ATLAS_SIZE / w * 100}%`, height: `${ATLAS_SIZE / h * 100}%`, left: `${-x / w * 100}%`, top: `${-y / h * 100}%` }} />
  </span>;
}

export default function TowerPage() {
  const [stones, setStones] = useState<PlacedStone[]>([]);
  const stonesRef = useRef<PlacedStone[]>([]);
  const [aim, setAim] = useState<number | null>(null);
  const [failure, setFailure] = useState<Balance | null>(null);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState(0);
  const [scale, setScale] = useState(1);
  const stage = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);
  const pointer = useRef<number | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = stones.length, stopped = done || failure !== null;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const resize = () => setScale(Math.min(el.clientWidth / TOWER_WIDTH, (el.clientHeight - 12) / TOWER_HEIGHT));
    const observer = new ResizeObserver(resize);
    observer.observe(el); resize();
    return () => { observer.disconnect(); if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, []);

  const reset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = null; stonesRef.current = []; locked.current = false; pointer.current = null;
    setStones([]); setAim(null); setFailure(null); setDone(false); setReward(0);
  }, []);

  const place = useCallback((x: number) => {
    if (locked.current) return;
    const old = stonesRef.current;
    if (old.length >= TOWER_STONES.length) return;
    const stone = placeStone(old.length, clampPlacementX(old.length, x), old.at(-1));
    const next = [...old, stone], balance = evaluateBalance(next);
    stonesRef.current = next; setStones(next); setAim(null);
    strikeStone(.25 + old.length * .018, old.length); buzz(balance.risk < .7 ? 7 : 13);
    if (!balance.stable) {
      locked.current = true; setFailure(balance); buzz(30);
      const remaining = survivingStones(next, balance);
      resetTimer.current = setTimeout(() => {
        // Continue from the untouched lower stones; no full reset or coordinate correction.
        resetTimer.current = null;
        stonesRef.current = remaining;
        setStones(remaining); setFailure(null); setAim(null);
        pointer.current = null; locked.current = false;
      }, 1200);
      return;
    }
    if (next.length === TOWER_STONES.length) {
      locked.current = true;
      const multiplier = balance.risk < .5 ? 1.35 : balance.risk < .8 ? 1 : .75;
      setReward(addMerit("tower", multiplier, 1).gained); setDone(true); buzz(20);
      // Completion never recenters, scales, animates or corrects stone coordinates.
    }
  }, []);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (el?.closest("input,textarea,select,[contenteditable='true']") || locked.current) return;
      if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
        const step = event.code === "ArrowLeft" ? -3 : 3;
        setAim(value => clampPlacementX(stonesRef.current.length, (value ?? nextAim(stonesRef.current)) + step));
      } else if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
        event.preventDefault(); place(aim ?? nextAim(stonesRef.current));
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [aim, place]);

  const pointerX = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return clampPlacementX(stonesRef.current.length, (event.clientX - rect.left - rect.width / 2) / scale);
  };
  const previewX = stopped ? 0 : clampPlacementX(count, aim ?? nextAim(stones));
  const preview = !stopped ? placeStone(count, previewX, stones.at(-1)) : null;
  const balance = evaluateBalance(stones), prospective = preview ? evaluateBalance([...stones, preview]) : balance;
  const contact = count > 0 && !stopped ? supportOf(stones[count - 1]) : null;

  return <HipRoom here="/tower" scroll={false}>
    <section className="hip-tower hip-cairn" aria-label="돌탑 쌓기">
      <p className="hip-tower-kicker">石塔 · 돌탑</p>
      <div className="hip-cairn-progress" aria-label={`${count} / ${TOWER_STONES.length}개 쌓음`}>
        {TOWER_STONES.map((s, i) => <i key={s.name} data-filled={i < count || undefined} aria-hidden="true" />)}
        <span>{count}<small> / {TOWER_STONES.length}</small></span>
      </div>
      <button ref={stage} type="button" className="hip-tower-stage hip-cairn-stage" disabled={stopped} aria-label="돌을 끌어 위치를 맞추고 놓기"
        onPointerDown={event => {
          if (locked.current) return;
          event.preventDefault(); pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId); setAim(pointerX(event));
        }}
        onPointerMove={event => { if (!locked.current && (event.pointerType === "mouse" || pointer.current === event.pointerId)) setAim(pointerX(event)); }}
        onPointerUp={event => {
          if (pointer.current !== event.pointerId) return;
          pointer.current = null;
          const x = pointerX(event);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          place(x);
        }}
        onPointerCancel={() => { pointer.current = null; setAim(null); }}
        onPointerLeave={() => { if (pointer.current === null) setAim(null); }}
      >
        <span className="hip-cairn-plane" style={{ width: TOWER_WIDTH, height: TOWER_HEIGHT, transform: `translateX(-50%) scale(${scale})` }}>
          <span className="hip-cairn-ground" aria-hidden="true" />
          {stones.map(stone => <Rock key={stone.index} stone={stone} falling={!!failure && stone.index >= failure.joint} direction={failure?.direction} />)}
          {contact && <span className="hip-cairn-contact" aria-hidden="true" style={{ left: TOWER_WIDTH / 2 + contact.x - contact.half, top: contact.y, width: contact.half * 2 }} />}
          {preview && <span data-risk={prospective.stable ? prospective.risk > .78 ? "edge" : "safe" : "fall"} className="hip-cairn-preview"><Rock stone={preview} preview /></span>}
        </span>
      </button>
      <span className="hip-tower-lean" role="meter" aria-label="돌탑의 균형 위험도" aria-valuenow={Math.round(Math.min(1, prospective.risk) * 100)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${Math.min(100, prospective.risk * 100)}%` }} />
      </span>
      <div className="hip-tower-done hip-cairn-done" style={{ visibility: done ? "visible" : "hidden" }} aria-hidden={!done}>
        <span role={done ? "status" : undefined}>{reward > 0 ? `+${reward.toLocaleString()} 공덕` : ""}</span>
        <button onClick={reset} disabled={!done}>한 번 더</button>
      </div>
    </section>
  </HipRoom>;
}
