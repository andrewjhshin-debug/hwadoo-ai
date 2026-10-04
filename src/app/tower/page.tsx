"use client";

// ─────────────────────────────────────────────────────────────
// 돌탑 — 바둑 두듯 **놓는 자리를 고른다.**
//
// 형: 「돌탑 바둑처럼 둘 때마다 쌓아 올리는 거. 대신 중심 무너지면
//      무너지고. 대신 또 너무 어렵지 않게」
//
// 앞의 두 판은 **때**를 겨뤘다 — 떨어지는 돌을 띠 안에서 받거나,
// 좌우로 오가는 돌을 멈춰 세우거나. 둘 다 돌탑이 아니라 리듬 놀이다.
// 절 마당에서 돌을 올릴 때 겨루는 것은 때가 아니라 **자리**다.
//
// 그래서 바둑처럼 둔다 —
//  · 누른 **그 자리에** 돌이 놓인다. 흔들리지도, 기다리지도 않는다
//  · 손가락이 가 있는 자리에 **다음 돌이 미리 비쳐** 보인다
//  · 어긋난 돌이 **같은 쪽으로 쏠리면** 무게중심이 받침을 벗어나 무너진다
//
// 너그럽다 — 한 알이 끝까지 빗나가도 안 쓰러진다. 여럿이 한쪽으로
// 쏠려야 넘어간다. 가운데 어림만 맞춰도 다섯이 선다.
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
/** 가운데에서 최대 이만큼까지 비켜 놓을 수 있다(px) */
const 비킬수 = 46;
/**
 * 무너지는 금 — 둘이다.
 *
 * 형: 「돌 무더기 그거 이렇게 안 맞으면 무너지게 하라니까」
 * 무게중심만 보던 때는 **아무 데나 찍어도 다섯이 섰다.** 흩뿌려 놓아도
 * 왼쪽 오른쪽이 서로 상쇄돼 평균이 0 에 가까웠기 때문이다.
 * 돌은 평균 위에 앉지 않는다 — **바로 아래 돌** 위에 앉는다.
 *
 *  ① 미끄러짐 — 아래 돌에서 이만큼 넘게 비키면 걸칠 데가 없다
 *  ② 쏠림 — 그래도 한쪽으로 기울어 모이면 받침을 벗어난다
 */
const 미끄럼 = 0.82;
const 쏠림금 = 0.66;

/** 다 쌓고 나서 — 얼마나 정갈한가. 셋으로만 가른다 */
const 등급표 = [
  { id: "上", 말: "한 치도 안 흔들립니다", 배: 1.35, 금: 0.07 },
  { id: "中", 말: "고르게 쌓았습니다", 배: 1, 금: 0.22 },
  { id: "下", 말: "겨우 섰습니다", 배: 0.75, 금: Infinity },
] as const;

type 판정 = "中" | "良" | "危";

export default function TowerPage() {
  /** 쌓인 돌 — 저마다 가운데서 얼마나 어긋났나(-1~1) */
  const [돌들, 돌들잡기] = useState<number[]>([]);
  /** 손가락이 가 있는 자리 — 다음 돌이 여기 비친다 */
  const [겨눈, 겨눈잡기] = useState<number | null>(null);
  const [무너짐, 무너짐잡기] = useState(false);
  /** 다 쌓았나 — 쌓았으면 등급(上·中·下) */
  const [끝, 끝잡기] = useState<"上" | "中" | "下" | null>(null);
  const [점수, 점수잡기] = useState(0);
  const [연속, 연속잡기] = useState(0);
  const [튄것, 튄것잡기] = useState<{ v: 판정; n: number } | null>(null);
  const 판 = useRef<HTMLButtonElement | null>(null);

  const 놓인 = 돌들.length;
  const 멈춤 = 끝 || 무너짐;

  /** 누른 가로 자리를 -1~1 로 — 판 가운데가 0 */
  const 어디 = (e: React.PointerEvent | React.MouseEvent) => {
    const el = 판.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const 몫 = ((e.clientX - r.left) / r.width - 0.5) * 2;
    // 판 끝까지 끌어도 비킬 수 있는 만큼만 — 탑이 판 밖으로 안 나간다
    return Math.max(-1, Math.min(1, 몫 * 0.82));
  };

  const 터뜨리기 = useCallback((v: 판정) => {
    튄것잡기({ v, n: Date.now() });
    window.setTimeout(() => 튄것잡기((x) => (x && x.v === v ? null : x)), 520);
  }, []);

  const 쓰러뜨리기 = useCallback(() => {
    무너짐잡기(true);
    연속잡기(0);
    buzz(30);
    window.setTimeout(() => {
      무너짐잡기(false);
      돌들잡기([]);
      점수잡기(0);
      겨눈잡기(null);
    }, 1150);
  }, []);

  const 놓기 = useCallback(
    (비킴: number) => {
      if (멈춤) return;
      // 손가락 끝의 오차는 가운데로 조금 보정한다. 바둑처럼 고르는 맛은
      // 남기되, 화면 가장자리를 스쳤다고 바로 탑이 무너지지 않게 한다.
      const 놓을곳 = 비킴 * 0.72;
      const 벗어남 = Math.abs(놓을곳);
      const 다음돌들 = [...돌들, 놓을곳];
      // ① 바로 아래 돌에서 얼마나 비켰나 — 걸칠 데가 있는가
      const 아래 = 돌들.length ? 돌들[돌들.length - 1] : 0;
      const 미끄러짐 = Math.abs(놓을곳 - 아래);
      // ② 쌓인 것이 한쪽으로 쏠린 만큼
      const 쏠림 = Math.abs(다음돌들.reduce((s, x) => s + x, 0) / 다음돌들.length);
      const 넘어간다 = 미끄러짐 > 미끄럼 || 쏠림 > 쏠림금;

      const 한가운데 = 벗어남 < 0.2 && 미끄러짐 < 0.26;
      터뜨리기(넘어간다 ? "危" : 한가운데 ? "中" : "良");
      buzz(한가운데 ? 9 : 6);
      돌들잡기(다음돌들);
      점수잡기((v) => v + Math.round(10 + (1 - 벗어남) * 26 + 연속 * 3));
      연속잡기((v) => (한가운데 ? v + 1 : 0));
      겨눈잡기(null);

      if (넘어간다) { 쓰러뜨리기(); return; }
      if (다음돌들.length === TOTAL) {
        // 등급은 **한 알 한 알이 얼마나 가운데였나**로 매긴다.
        // 부호 있는 평균으로 재면 왼쪽 오른쪽이 서로 상쇄돼, 흔들흔들
        // 쌓아 놓고도 上 이 나온다. 절대값으로 센다.
        const 고름 = 다음돌들.reduce((s, x) => s + Math.abs(x), 0) / TOTAL;
        const 매김 = 등급표.find((g) => 고름 <= g.금) ?? 등급표[2];
        끝잡기(매김.id);
        addMerit("tower", 매김.배, 1);
        buzz(26);
      }
    },
    [멈춤, 돌들, 연속, 터뜨리기, 쓰러뜨리기],
  );

  const 다시 = () => {
    돌들잡기([]); 겨눈잡기(null); 무너짐잡기(false); 끝잡기(null);
    점수잡기(0); 연속잡기(0);
  };

  // 자판으로도 — 노트북에서 한가운데에 둔다
  useEffect(() => {
    const 자판 = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); 놓기(겨눈 ?? 0); }
    };
    window.addEventListener("keydown", 자판);
    return () => window.removeEventListener("keydown", 자판);
  }, [놓기, 겨눈]);

  const 중심 = 돌들.length ? 돌들.reduce((s, x) => s + x, 0) / 돌들.length : 0;
  const 쏠림 = Math.abs(중심);
  const 기운각 = 중심 * 7;
  /** 겨눈 자리가 얼마나 가운데인가 — 2 면 한가운데, 1 이면 걸친다 */
  const 겨냥 =
    멈춤 || 겨눈 === null ? 0 : Math.abs(겨눈) < 0.24 ? 2 : Math.abs(겨눈) < 0.66 ? 1 : 0;
  const 비칠 = 겨눈 ?? 0;

  return (
    <HipRoom here="/tower" scroll={false}>
      <section className="hip-tower" aria-label="돌탑 쌓기">
        <p className="hip-tower-kicker">石塔 · 돌탑</p>
        {/* 바둑판처럼 — 누른 그 자리에 돌이 놓인다 */}
        <button
          ref={판}
          type="button"
          className={`hip-tower-stage${무너짐 ? " fall" : ""}`}
          data-hot={겨냥 || undefined}
          style={{ height: 무대 }}
          /* 바둑이다 — 누르는 **그 순간** 돌이 놓인다.
             떼기를 기다리면 「눌렀는데 아직 안 놓였다」가 된다. */
          onPointerDown={(e) => { e.preventDefault(); 놓기(어디(e)); }}
          /* 마우스로 훑을 때만 미리 비친다. 손가락은 누르는 즉시 놓이니
             비칠 틈이 없다 — 그래서 손가락에는 미리보기가 없다 */
          onPointerMove={(e) => { if (e.pointerType === "mouse") 겨눈잡기(어디(e)); }}
          onPointerLeave={() => 겨눈잡기(null)}
          disabled={!!끝}
          aria-label="누른 자리에 돌 놓기"
        >
          {/* 안전한 폭 — 이 안이면 한가운데(中) */}
          <span className="hip-tower-safe" aria-hidden />

          {/* 받침돌 — 바닥이 있어야 탑이다 */}
          <span className="hip-tower-base" aria-hidden />

          <span className="hip-tower-stack" style={{ transform: `rotate(${기운각}deg)` }}>
            {돌들.map((비킴, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                className="hip-tower-stone"
                src="/obj/stone-cairn-stable.png"
                alt=""
                draggable={false}
                style={
                  {
                    width: 너비[i],
                    bottom: 바닥 + i * 층키,
                    left: `calc(50% + ${비킴 * 비킬수}px)`,
                    "--tilt": `${기울[i]}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>

          {/* 놓일 자리 — 손가락을 따라 다음 돌이 미리 앉는다 */}
          {!멈춤 && (
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
                  bottom: 바닥 + 놓인 * 층키,
                  left: `calc(50% + ${비칠 * 비킬수}px)`,
                  "--tilt": `${기울[놓인]}deg`,
                } as React.CSSProperties
              }
            />
          )}

          {튄것 && (
            <b
              key={튄것.n}
              className={`hip-tower-judge j-${튄것.v === "中" ? "mid" : 튄것.v === "良" ? "ok" : "no"}`}
              aria-hidden
            >
              {튄것.v}
            </b>
          )}
        </button>

        {/* 기울기 — 차면 무너진다 */}
        <span className="hip-tower-lean" aria-hidden>
          <i style={{ width: `${Math.min(100, (쏠림 / 쏠림금) * 100)}%` }} />
        </span>

        {끝 && (
          <div className="hip-tower-done" role="status">
            <em className={`hip-tower-grade g-${끝 === "上" ? "a" : 끝 === "中" ? "b" : "c"}`}>{끝}</em>
            <b>{등급표.find((g) => g.id === 끝)?.말}</b>
            <span>{점수}</span>
            <button onClick={다시}>한 번 더</button>
          </div>
        )}
      </section>
    </HipRoom>
  );
}
