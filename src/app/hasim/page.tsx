"use client";

// ─────────────────────────────────────────────────────────────
// 하심(下心) — 마음을 낮추는 자리.
//
// 선사들이 「佛」을 쓸 때 세로획 하나를 종이 끝까지 내리긋는다. 그 획이
// 글씨의 전부다. 하심도 같다 — **「下」의 세로획을 끝없이 내리긋는다.**
//
// 스크롤을 내리면 그 획이 계속 따라온다. 바닥이 없다.
// 낮추는 데 끝이 있으면 그건 낮춘 게 아니다.
//
// 화면은 종이다 — 흰 바탕에 먹. 이 앱에서 유일하게 밝은 방이다.
// 낮추는 일은 어둠 속에서 하는 일이 아니라 환한 데서 하는 일이라서.
//
// 내려가다 드물게 한 줄씩 말이 스친다. 읽으라고 두는 게 아니라
// 내려가는 일이 헛되지 않다는 표다.
//
// 공덕은 안 준다. 낮추는 일에 값을 매기면 낮추는 일이 아니게 된다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** 획이 이어지는 길이 — 화면 높이의 몇 배. 끝은 사실상 안 보인다 */
const DEPTH = 140;

/** 내려가다 드물게 스치는 말 */
const WHISPERS = [
  "낮은 데로",
  "더 낮은 데로",
  "아직 높다",
  "물은 낮은 곳으로 흐른다",
  "고개를 숙이면 부딪히지 않는다",
  "내려가는 것이 오르는 것",
  "여기도 아니다",
  "가장 낮은 자리가 가장 넓다",
  "다 왔다고 여기면 거기서 멈춘다",
  "바닥은 없다",
  "그래도 더",
  "下心",
];

export default function HasimPage() {
  const [deep, setDeep] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const on = () => {
      const max = el.scrollHeight - el.clientHeight;
      setDeep(max > 0 ? el.scrollTop / max : 0);
    };
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  return (
    <div
      ref={boxRef}
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain"
      style={{ background: "#F4F2EC" }} // 종이빛 — 이 앱에서 유일하게 밝은 방
    >
      <style>{`
        /* 붓으로 내리그은 획 — 위는 굵고 진하게, 아래로 가늘고 옅게.
           획 가장자리를 살짝 흔들어 먹이 번진 결을 낸다. */
        /* 먹이 종이에 번진 결 — 아주 옅게만. 과하면 흐릿해 보인다 */
        svg path, svg text { filter: blur(0.12px); }
      `}</style>

      {/* 나가는 문 */}
      <Link
        href="/"
        className="fixed right-4 top-4 z-20 rounded-full border border-black/15 bg-white/70 px-3.5 py-1.5 text-[11px] tracking-[0.25em] text-black/45 backdrop-blur transition-colors hover:text-black/75"
      >
        나가기
      </Link>

      {/* 얼마나 내려왔나 — 오른쪽 가장자리 실 한 오라기.
          숫자로 안 적는다. 끝이 있다고 말하는 셈이 되니까. */}
      <div
        aria-hidden
        className="fixed right-0 top-0 z-20 w-[2px] bg-black/20"
        style={{ height: `${Math.min(100, deep * 100)}vh` }}
      />

      <div className="relative" style={{ height: `${DEPTH * 100}vh` }}>
        {/* ── 첫 화면 — 下心 ──
            두 SVG 를 따로 그렸더니 좌표계가 어긋나 세로획이 가로획 오른쪽
            끝에 가서 붙었다. **자리는 전부 %로 잡고**, 붓의 굵기 변화만
            SVG 에 맡긴다. 그러면 어느 화면 폭에서도 한 글자로 선다.

            下 의 짜임 — 가로획 하나, 그 **한가운데**에서 내려오는 세로획,
            세로획 **오른쪽**에 점 하나. */}
        <div className="absolute inset-x-0 top-0 h-screen">
          <div className="relative mx-auto h-full w-full max-w-[520px]">
            {/* 가로획 — 왼쪽 기필(起筆)이 굵고 오른쪽 끝에서 가늘게 빠진다 */}
            <svg
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              className="absolute"
              style={{ left: "12%", top: "24vh", width: "62%", height: "26px" }}
            >
              <path
                d="M6 14 C80 6, 220 4, 340 9 C368 10, 392 15, 396 20
                   C390 27, 360 31, 330 32 C210 35, 78 34, 10 30
                   C2 29, 0 19, 6 14 Z"
                fill="#14110E"
              />
            </svg>

            {/* 점(별획) — 세로획 오른쪽, 붓을 눕혔다 떼는 짧은 한 점 */}
            <svg
              viewBox="0 0 40 40"
              className="absolute"
              style={{ left: "47%", top: "30vh", width: "34px", height: "34px" }}
            >
              <path
                d="M8 10 C16 4, 28 8, 33 18 C37 27, 33 36, 24 37
                   C14 38, 5 29, 4 20 C3 14, 4 12, 8 10 Z"
                fill="#14110E"
              />
            </svg>

            {/* 心 — 오른쪽 위에 작게, 살짝 기울여 */}
            <p
              className="absolute font-serif leading-none text-[#14110E]"
              style={{
                right: "12%",
                top: "19vh",
                fontSize: "clamp(52px, 17vw, 96px)",
                transform: "rotate(-3deg)",
              }}
            >
              心
            </p>

            <p className="pointer-events-none absolute bottom-[16%] right-[14%] text-[11px] tracking-[0.45em] text-black/35">
              하 심
            </p>
            {deep < 0.003 && (
              <p className="pointer-events-none absolute bottom-[7%] left-1/2 -translate-x-1/2 animate-pulse text-[11px] tracking-[0.3em] text-black/40">
                아래로 내려 보세요
              </p>
            )}
          </div>
        </div>

        {/* ── 끝없이 내려가는 세로획 ──
            가로획 한가운데(왼쪽 12% + 폭 62% 의 절반 ≒ 43%)에서 시작해
            바닥 없이 내려간다. 위는 눌러 굵고, 내려갈수록 가늘고 옅어진다.
            첫 160vh 구간만 붓의 눌림을 SVG 로 그리고 그 아래는 이어 긋는다. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0"
          style={{ top: "25vh", bottom: 0 }}
        >
          <div className="relative mx-auto h-full w-full max-w-[520px]">
            <svg
              viewBox="0 0 60 1200"
              preserveAspectRatio="none"
              className="absolute"
              style={{ left: "41.4%", top: 0, width: "18px", height: "160vh" }}
            >
              <path
                d="M14 0 C9 160, 7 400, 9 640 C10 880, 12 1040, 13 1200
                   L30 1200 C31 1040, 33 880, 34 640 C36 400, 38 160, 44 0 Z"
                fill="#14110E"
              />
            </svg>
            <div
              className="absolute"
              style={{
                top: "160vh",
                bottom: 0,
                left: "43%",
                width: "5px",
                background:
                  "linear-gradient(to bottom, #14110E 0%, #241F1A 20%, #4A4038 50%, #857C70 80%, #BDB5A9 100%)",
              }}
            />
          </div>
        </div>

        {/* ── 드물게 스치는 말 ── */}
        {WHISPERS.map((w, i) => (
          <p
            key={w}
            className="pointer-events-none absolute left-0 right-0 text-center text-[12.5px] tracking-[0.35em] text-black/30"
            style={{ top: `${(i + 1) * 11}00vh` }}
          >
            {w}
          </p>
        ))}
      </div>
    </div>
  );
}
