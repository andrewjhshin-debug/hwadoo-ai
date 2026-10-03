"use client";

// ─────────────────────────────────────────────────────────────
// 돌탑 — 떨어지는 돌을 제자리에서 받아 다섯을 쌓는다.
//
// 형: 「돌탑 지금 더 선명하게 게임처럼 흥미 유발로 다시 고쳐봐」
//
// 받는 짜임(떨어지는 돌을 눌러 받는다)은 그대로 둔다. 바꾼 것은 **긴장**이다 —
//  · 바닥이 생겼다. 받침돌 위에 쌓이니 비로소 탑으로 보인다
//  · 받을 자리가 **띠 두 줄**로 또렷하다. 바깥 띠는 良, 안쪽 띠는 中
//  · 빗나가면 글이 아니라 **글자 한 자**가 터진다(中·良·失)
//  · 어긋난 만큼 탑이 **기운다.** 기울기 자가 차면 **무너진다** —
//    이 판에서 처음으로 「실패할 수 있는 수행」이다
//  · 층이 오를수록 빨라지고 띠가 좁아진다
//
// 글로 설명하지 않는다. 한 번 놓아 보면 안다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import HipRoom from "@/components/HipRoom";
import { addMerit } from "@/lib/merit";
import { buzz } from "@/lib/sound";

const TOTAL = 5;
/** 층마다 돌 너비 — 위로 갈수록 좁아진다 */
const 너비 = [172, 152, 134, 118, 104];
/** 층마다 눕는 각 — 같은 그림 한 장이라 각으로 다른 돌인 척한다 */
const 기울 = [-2, 2.5, -3, 2, -1.5];
/** 한 층의 키 */
const 층키 = 34;
/** 받침돌 윗면 */
const 바닥 = 26;
/** 무대 키 */
const 무대 = 330;

/** 층마다 받는 자리(0=맨 위에서 떨어짐, 1=바닥) */
const 자리 = [0.78, 0.8, 0.78, 0.81, 0.79];

type 판정 = "中" | "良" | "失";

export default function TowerPage() {
  const [놓인, 놓인잡기] = useState(0);
  /** 쌓인 돌 — 저마다 중심에서 얼마나 어긋났나(-1~1) */
  const [돌들, 돌들잡기] = useState<number[]>([]);
  const [내림, 내림잡기] = useState(0);
  const [기운, 기운잡기] = useState(0);
  const [무너짐, 무너짐잡기] = useState(false);
  const [끝, 끝잡기] = useState(false);
  const [점수, 점수잡기] = useState(0);
  const [연속, 연속잡기] = useState(0);
  /** 방금 판정 — 글자 한 자가 터졌다 사라진다 */
  const [튄것, 튄것잡기] = useState<{ v: 판정; n: number } | null>(null);
  const 멈춤 = useRef(false);

  멈춤.current = 끝 || 무너짐;

  // ── 돌이 내려온다 ──────────────────────────────────────
  // 층이 오를수록 빠르다. 화면을 떠나면 rAF 가 같이 쉬므로 밀리지 않는다.
  useEffect(() => {
    if (끝 || 무너짐) return;
    let 틀 = 0;
    let 앞 = performance.now();
    const 떨어뜨리기 = (지금: number) => {
      const 참 = Math.min(36, 지금 - 앞);
      앞 = 지금;
      내림잡기((v) => {
        const 빠르기 = 0.00034 + 놓인 * 0.00007;
        const 다음 = v + 참 * 빠르기;
        return 다음 >= 1 ? 0 : 다음; // 바닥까지 가면 조용히 다시 올라간다
      });
      틀 = requestAnimationFrame(떨어뜨리기);
    };
    틀 = requestAnimationFrame(떨어뜨리기);
    return () => cancelAnimationFrame(틀);
  }, [끝, 무너짐, 놓인]);

  const 터뜨리기 = useCallback((v: 판정) => {
    튄것잡기({ v, n: Date.now() });
    window.setTimeout(() => 튄것잡기((x) => (x && x.v === v ? null : x)), 520);
  }, []);

  const 놓기 = useCallback(() => {
    if (멈춤.current) return;
    const 과녁 = 자리[놓인];
    // 良 띠. 위층일수록 좁다
    const 띠 = 0.17 - 놓인 * 0.016;
    const 떨어진 = Math.abs(내림 - 과녁);

    if (떨어진 > 띠) {
      // 빗나감 — 돌은 안 쌓이고 탑만 한 뼘 기운다
      const 더기움 = 0.3;
      const 새기운 = 기운 + 더기움;
      터뜨리기("失");
      연속잡기(0);
      buzz(18);
      기운잡기(새기운);
      if (새기운 >= 1) 쓰러뜨리기();
      내림잡기(0);
      return;
    }

    const 정확 = 1 - 떨어진 / 띠; // 1 이면 한가운데
    const 중앙 = 정확 > 0.62;
    // 어긋난 쪽으로 돌이 비켜 앉는다. 층마다 방향을 번갈아 둔다
    const 비킴 = ((내림 - 과녁) / 띠) * (놓인 % 2 ? 1 : -1);
    const 새기운 = 기운 + Math.abs(비킴) * 0.42;

    터뜨리기(중앙 ? "中" : "良");
    buzz(중앙 ? 9 : 6);
    돌들잡기((v) => [...v, 비킴]);
    점수잡기((v) => v + Math.round(12 + 정확 * 24 + 연속 * 3));
    연속잡기((v) => v + 1);
    기운잡기(새기운);
    내림잡기(0);

    if (새기운 >= 1) {
      쓰러뜨리기();
      return;
    }
    놓인잡기((n) => {
      const 다음 = n + 1;
      if (다음 === TOTAL) {
        끝잡기(true);
        addMerit("tower");
        buzz(26);
      }
      return 다음;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [내림, 놓인, 기운, 연속, 터뜨리기]);

  function 쓰러뜨리기() {
    무너짐잡기(true);
    연속잡기(0);
    buzz(30);
    window.setTimeout(() => {
      무너짐잡기(false);
      놓인잡기(0);
      돌들잡기([]);
      기운잡기(0);
      내림잡기(0);
      점수잡기(0);
    }, 1100);
  }

  const 다시 = () => {
    놓인잡기(0); 돌들잡기([]); 내림잡기(0); 기운잡기(0);
    무너짐잡기(false); 끝잡기(false); 점수잡기(0); 연속잡기(0);
  };

  // 손가락이 어디를 눌러도 받는다 — 단추를 찾아 눈을 옮길 틈이 없다
  useEffect(() => {
    const 자판 = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); 놓기(); }
    };
    window.addEventListener("keydown", 자판);
    return () => window.removeEventListener("keydown", 자판);
  }, [놓기]);

  const 받는줄 = 바닥 + 놓인 * 층키;
  const 띠폭 = 0.17 - 놓인 * 0.016;
  const 높이 = (몫: number) => 받는줄 + (1 - 몫) * (무대 - 받는줄 - 40);
  const 기운각 = 돌들.reduce((s, x) => s + x * 5.5, 0);
  // 지금 받으면 쌓이는가 — 이걸 **보여 준다.** 띠가 켜지고 돌에 빛이 돈다.
  // 형: 「어느 범위에 들어오면 딱 쌓인다, 이걸 더 직관적으로」
  const 떨어진지금 = Math.abs(내림 - 자리[놓인]);
  const 받이 = 끝 || 무너짐 ? 0 : 떨어진지금 <= 띠폭 * 0.38 ? 2 : 떨어진지금 <= 띠폭 ? 1 : 0;

  return (
    <HipRoom here="/tower" scroll={false}>
      <section className="hip-tower" aria-label="돌탑 쌓기">
        <p className="hip-tower-kicker">石塔 · 돌탑</p>
        <p className="hip-tower-count">
          <b>{놓인}</b><span> / {TOTAL}</span>
          {연속 > 1 && <em className="hip-tower-combo">{연속}</em>}
        </p>

        {/* 무대 전체가 단추다 — 돌에서 눈을 뗄 일이 없게 */}
        <button
          type="button"
          className={`hip-tower-stage${무너짐 ? " fall" : ""}`}
          data-hot={받이 || undefined}
          style={{ height: 무대 }}
          onPointerDown={(e) => { e.preventDefault(); 놓기(); }}
          disabled={끝}
          aria-label="돌 놓기"
        >
          {/* 받는 자리 — 바깥 띠 良, 안쪽 띠 中 */}
          {!끝 && !무너짐 && (
            <>
              <span className="hip-tower-band" aria-hidden
                style={{ bottom: 높이(자리[놓인] + 띠폭), height: Math.max(8, (띠폭 * 2) * (무대 - 받는줄 - 40)) }} />
              <span className="hip-tower-band in" aria-hidden
                style={{ bottom: 높이(자리[놓인] + 띠폭 * 0.38), height: Math.max(5, (띠폭 * 0.76) * (무대 - 받는줄 - 40)) }} />
            </>
          )}

          {/* 받침돌 — 바닥이 있어야 탑이다 */}
          <span className="hip-tower-base" aria-hidden />

          {/* 놓일 자리 — 그 돌 그대로의 그림자. 「여기에 앉는다」 */}
          {!끝 && !무너짐 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="hip-tower-ghost"
              src="/obj/stone-cairn-stable.png"
              alt=""
              aria-hidden
              draggable={false}
              style={
                {
                  width: 너비[놓인],
                  bottom: 받는줄,
                  "--tilt": `${기울[놓인]}deg`,
                } as React.CSSProperties
              }
            />
          )}

          <span className="hip-tower-stack" style={{ transform: `rotate(${기운각}deg)` }}>
            {돌들.map((비킴, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                className="hip-tower-stone"
                src="/obj/stone-cairn-stable.png"
                alt=""
                draggable={false}
                style={{
                  width: 너비[i],
                  bottom: 바닥 + i * 층키,
                  left: `calc(50% + ${비킴 * 24}px)`,
                  transform: `translateX(-50%) rotate(${기울[i]}deg)`,
                }}
              />
            ))}
          </span>

          {/* 내려오는 돌 */}
          {!끝 && !무너짐 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="hip-tower-stone hip-tower-moving"
              src="/obj/stone-cairn-stable.png"
              alt=""
              draggable={false}
              style={{
                width: 너비[놓인],
                bottom: 높이(내림),
                left: "50%",
                transform: `translateX(-50%) rotate(${기울[놓인]}deg)`,
              }}
            />
          )}

          {/* 판정 한 자 */}
          {튄것 && (
            <b key={튄것.n} className={`hip-tower-judge j-${튄것.v === "中" ? "mid" : 튄것.v === "良" ? "ok" : "no"}`} aria-hidden>
              {튄것.v}
            </b>
          )}
        </button>

        {/* 기울기 — 차면 무너진다 */}
        <span className="hip-tower-lean" aria-hidden>
          <i style={{ width: `${Math.min(100, 기운 * 100)}%` }} />
        </span>

        {끝 && (
          <div className="hip-tower-done" role="status">
            <b>다섯을 고르게 쌓았습니다</b>
            <span>{점수}</span>
            <button onClick={다시}>한 번 더</button>
          </div>
        )}
      </section>
    </HipRoom>
  );
}
