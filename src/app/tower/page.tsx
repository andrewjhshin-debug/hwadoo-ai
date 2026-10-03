"use client";

import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { addMerit } from "@/lib/merit";
import { buzz } from "@/lib/sound";

const TOTAL = 5;
const sizes = [198, 178, 158, 140, 122];
const turns = [-3, 2, -2, 3, -1];

/**
 * 돌탑 — 돌 하나가 좌우로 흐를 때 탭해 올린다.
 * 중심에서 멀수록 다음 돌의 허용 폭이 좁아진다. 떨어져도 앞의 돌은
 * 남고 그 돌만 다시 온다. 다섯 개가 서면 그때만 공덕 한 판이 붙는다.
 */
export default function TowerPage() {
  const [placed, setPlaced] = useState(0);
  const [stones, setStones] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0.5);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const direction = useRef(1);

  // 화면이 켜져 있는 동안만 돌이 천천히 흐른다. requestAnimationFrame 을
  // 쓰면 브라우저가 뒤로 갔을 때 스스로 쉬므로 타이머가 쌓이지 않는다.
  useEffect(() => {
    if (done) return;
    let frame = 0;
    let before = performance.now();
    const move = (now: number) => {
      const dt = Math.min(36, now - before);
      before = now;
      setCursor((v) => {
        let next = v + direction.current * dt * 0.00042;
        if (next >= 1) { next = 1; direction.current = -1; }
        if (next <= 0) { next = 0; direction.current = 1; }
        return next;
      });
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [done, placed]);

  const 놓기 = () => {
    if (done || missed) return;
    const centered = cursor - 0.5;
    // 밑돌은 넉넉하고, 위로 갈수록 손이 조금 더 섬세해야 한다.
    const tolerance = 0.3 - placed * 0.035;
    if (Math.abs(centered) > tolerance) {
      setMissed(true);
      buzz(18);
      window.setTimeout(() => { setCursor(0.5); setMissed(false); }, 520);
      return;
    }
    buzz(7);
    setStones((v) => [...v, centered]);
    setPlaced((n) => {
      const next = n + 1;
      if (next === TOTAL) {
        setDone(true);
        addMerit("tower");
        buzz(24);
      }
      return next;
    });
    setCursor(0.5);
  };

  const 다시 = () => {
    direction.current = 1;
    setPlaced(0); setStones([]); setCursor(0.5); setMissed(false); setDone(false);
  };

  return (
    <HipRoom here="/tower" scroll={false}>
      <section className="hip-tower" aria-label="돌탑 쌓기">
        <p className="hip-tower-kicker">石塔 · 돌탑 쌓기</p>
        <p className="hip-tower-count"><b>{placed}</b><span> / {TOTAL}</span></p>

        <div className="hip-tower-stage" aria-label={`${placed}개의 돌을 쌓음`}>
          <span className="hip-tower-ground" aria-hidden />
          {stones.map((offset, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className="hip-tower-stone"
              src="/obj/stone-cairn.png"
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
          {!done && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`hip-tower-stone hip-tower-moving${missed ? " miss" : ""}`}
              src="/obj/stone-cairn.png"
              alt=""
              draggable={false}
              style={{
                width: sizes[placed],
                bottom: 19 + placed * 38,
                left: `${18 + cursor * 64}%`,
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
            {missed ? "다시 놓기" : "여기에 놓기"}
          </button>
        )}
      </section>
    </HipRoom>
  );
}
