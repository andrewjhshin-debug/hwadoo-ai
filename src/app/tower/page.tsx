"use client";

import { useEffect, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { addMerit } from "@/lib/merit";
import { buzz } from "@/lib/sound";

const TOTAL = 5;
const sizes = [198, 178, 158, 140, 122];
const turns = [-2, 2, -3, 2, -1];
const balance = [0, 0.12, -0.1, 0.08, -0.06];
const targets = [0.76, 0.79, 0.75, 0.8, 0.77];

/**
 * 돌탑 — 빠르게 떨어지는 돌을 각 층의 안정 구간에 맞춰 받아 쌓는다.
 * 중심에 가까울수록 안정 점수와 연속 성공이 커진다.
 */
export default function TowerPage() {
  const [placed, setPlaced] = useState(0);
  const [stones, setStones] = useState<number[]>([]);
  const [fall, setFall] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [callout, setCallout] = useState("안정 구간에서 돌을 받으세요");
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
        // 한 번의 낙하는 약 2초. 망설이면 바로 다음 기회를 본다.
        const next = v + dt * 0.00048;
        if (next >= 1) {
          window.setTimeout(() => {
            setMissed(true); setCombo(0); setCallout("놓쳤습니다 · 다시 받으세요"); buzz(18);
            window.setTimeout(() => { setFall(0); setMissed(false); setCallout("안정 구간에서 돌을 받으세요"); }, 360);
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
    // 층이 높아질수록 안정 구간이 조금씩 좁아진다.
    const target = targets[placed];
    const windowSize = 0.105 - placed * 0.009;
    const distance = Math.abs(fall - target);
    if (distance > windowSize) {
      setMissed(true);
      setCombo(0);
      setCallout("균형을 놓쳤습니다 · 다시 받으세요");
      buzz(18);
      window.setTimeout(() => { setFall(0); setMissed(false); setCallout("안정 구간에서 돌을 받으세요"); }, 360);
      return;
    }
    const precision = 1 - distance / windowSize;
    const gained = Math.round(12 + precision * 18 + combo * 2);
    const nextCombo = combo + 1;
    buzz(7);
    setStones((v) => [...v, balance[placed]]);
    setScore((v) => v + gained);
    setCombo(nextCombo);
    setCallout(precision > 0.78 ? "완벽하게 중심을 잡았습니다" : "고르게 올렸습니다");
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
    setScore(0); setCombo(0); setCallout("안정 구간에서 돌을 받으세요");
  };

  return (
    <HipRoom here="/tower" scroll={false}>
      <section className="hip-tower" aria-label="돌탑 쌓기">
        <p className="hip-tower-kicker">石塔 · 돌탑 쌓기</p>
        <p className="hip-tower-count"><b>{placed}</b><span> / {TOTAL}</span></p>
        <div className="hip-tower-gamebar" aria-live="polite">
          <span>{callout}</span>
          <b>안정 {score}</b>
          {combo > 1 && <em>{combo} 연속</em>}
        </div>

        <div className="hip-tower-stage" aria-label={`${placed}개의 돌을 쌓음`}>
          <span className="hip-tower-ground" aria-hidden />
          {!done && (
            <span
              className="hip-tower-window"
              style={{ bottom: `${19 + placed * 38 + (1 - targets[placed]) * (178 - placed * 16)}px` }}
              aria-hidden
            />
          )}
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
            <span>안정 {score} · +1 공덕</span>
            <button onClick={다시}>한 번 더</button>
          </div>
        ) : (
          <button className="hip-tower-place" onClick={놓기} aria-label="이 자리에 돌 놓기">
            {missed ? "다시 받기" : "지금 놓기"}
          </button>
        )}
      </section>
    </HipRoom>
  );
}
