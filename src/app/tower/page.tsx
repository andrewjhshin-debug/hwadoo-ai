"use client";

import { useEffect, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { addMerit } from "@/lib/merit";
import { buzz } from "@/lib/sound";

const TOTAL = 5;
const sizes = [198, 178, 158, 140, 122];
const turns = [-2, 2, -3, 2, -1];
const balance = [0, 0.12, -0.1, 0.08, -0.06];

/**
 * 돌탑 — 돌이 위에서 천천히 내려온다. 바닥 가까이에 왔을 때 탭해
 * 고정해야 한다. 너무 이르거나 늦으면 그 돌만 떨어지고, 앞의 탑은 남는다.
 */
export default function TowerPage() {
  const [placed, setPlaced] = useState(0);
  const [stones, setStones] = useState<number[]>([]);
  const [fall, setFall] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  // 화면이 켜져 있는 동안만 위의 돌이 내려온다. requestAnimationFrame 은
  // 탭을 벗어나면 브라우저와 함께 쉬므로 타이머가 쌓이지 않는다.
  useEffect(() => {
    if (done || missed) return;
    let frame = 0;
    let before = performance.now();
    const drop = (now: number) => {
      const dt = Math.min(36, now - before);
      before = now;
      setFall((v) => {
        const next = v + dt * 0.00014;
        if (next >= 1) {
          window.setTimeout(() => {
            setMissed(true); buzz(18);
            window.setTimeout(() => { setFall(0); setMissed(false); }, 520);
          }, 0);
          return 1;
        }
        return next;
      });
      frame = requestAnimationFrame(drop);
    };
    frame = requestAnimationFrame(drop);
    return () => cancelAnimationFrame(frame);
  }, [done, missed, placed]);

  const 놓기 = () => {
    if (done || missed) return;
    // 닿기 직전의 짧은 순간에만 잡힌다. 위로 갈수록 허용 시간이 짧다.
    const low = 0.67 + placed * 0.035;
    if (fall < low || fall > 0.985) {
      setMissed(true);
      buzz(18);
      window.setTimeout(() => { setFall(0); setMissed(false); }, 520);
      return;
    }
    buzz(7);
    setStones((v) => [...v, balance[placed]]);
    setPlaced((n) => {
      const next = n + 1;
      if (next === TOTAL) {
        setDone(true);
        addMerit("tower");
        buzz(24);
      }
      return next;
    });
    setFall(0);
  };

  const 다시 = () => {
    setPlaced(0); setStones([]); setFall(0); setMissed(false); setDone(false);
  };

  return (
    <HipRoom here="/tower" scroll={false}>
      <section className="hip-tower" aria-label="돌탑 쌓기">
        <p className="hip-tower-kicker">石塔 · 돌탑 쌓기</p>
        <p className="hip-tower-count"><b>{placed}</b><span> / {TOTAL}</span></p>

        <div className="hip-tower-stage" aria-label={`${placed}개의 돌을 쌓음`}>
          <span className="hip-tower-ground" aria-hidden />
          <div
            className="hip-tower-stack"
            style={{ transform: `rotate(${stones.reduce((sum, x) => sum + x * 8, 0)}deg)` }}
          >
            {stones.map((offset, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                className="hip-tower-stone"
                src="/obj/stone-cairn-stable.png"
                alt=""
                draggable={false}
                style={{
                  width: sizes[i],
                  bottom: 19 + i * 38,
                  left: `calc(50% + ${offset * 108}px)`,
                  transform: `translateX(-50%) rotate(${turns[i]}deg)`,
                }}
              />
            ))}
          </div>
          {!done && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`hip-tower-stone hip-tower-moving${missed ? " miss" : ""}`}
              src="/obj/stone-cairn-stable.png"
              alt=""
              draggable={false}
              style={{
                width: sizes[placed],
                bottom: 19 + placed * 38 + (1 - fall) * (178 - placed * 16),
                left: `calc(50% + ${Math.sin(fall * Math.PI) * (placed % 2 ? 11 : -11)}px)`,
                transform: `translateX(-50%) rotate(${turns[placed]}deg)`,
              }}
            />
          )}
        </div>

        {done ? (
          <div className="hip-tower-done" role="status">
            <b>다섯 돌을 고르게 쌓았습니다</b>
            <span>+1 공덕</span>
            <button onClick={다시}>한 번 더</button>
          </div>
        ) : (
          <button className="hip-tower-place" onClick={놓기} aria-label="이 자리에 돌 놓기">
            {missed ? "다시 받기" : "돌 받기"}
          </button>
        )}
      </section>
    </HipRoom>
  );
}
