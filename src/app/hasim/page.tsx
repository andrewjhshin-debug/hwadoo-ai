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
// 종이는 **이 방 안에만** 편다. 처음엔 화면 전체를 덮었는데(fixed inset-0),
// 그러면 서랍도 아래 띠도 다 사라져 딴 앱에 들어온 것 같았다.
// 다른 방과 같은 틀 안에 앉히고, 그 안에서만 흰 종이를 편다.
//
// 내려가다 드물게 한 줄씩 말이 스친다. 읽으라고 두는 게 아니라
// 내려가는 일이 헛되지 않다는 표다.
//
// 공덕은 안 준다. 낮추는 일에 값을 매기면 낮추는 일이 아니게 된다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * 획이 이어지는 길이 — 화면 높이의 몇 배.
 *
 * 끝이 아예 없으면 스크롤 막대가 거짓말을 하고, 끝까지 가 본 사람에게
 * 아무것도 못 준다. **꽤나 내려가되 끝은 있다** — 삼백 화면.
 * 폰에서 엄지로 쓸면 이삼 분쯤 걸린다. 그 끝에 먹 한 점이 기다린다.
 */
const DEPTH = 300;

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
  "낮은 데는 넓다",
  "쌓을수록 무겁다",
  "비우면 가볍다",
  "무릎이 먼저 안다",
  "고개는 저절로 숙여진다",
  "여기서도 아직",
  "끝이 보이면 끝이 아니다",
  "조금만 더",
];

export default function HasimPage() {
  const [deep, setDeep] = useState(0);
  // 통 한 칸의 높이(px). vh 는 **화면** 높이라 이 방 안에서는 어긋난다 —
  // 방이 화면보다 작으니까. 통을 재어 그 값을 자로 쓴다.
  const [unit, setUnit] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const on = () => {
      const max = el.scrollHeight - el.clientHeight;
      setDeep(max > 0 ? el.scrollTop / max : 0);
    };
    el.addEventListener("scroll", on, { passive: true });
    const measure = () => setUnit(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", on);
      ro.disconnect();
    };
  }, []);

  /**
   * 통 한 칸을 자로 삼는다 — 예전 vh 자리를 이걸로 바꾼다.
   *
   * 첫 그림에서는 아직 못 쟀다(unit 0). 그때 0px 를 주면 글자가 전부
   * 맨 위로 겹쳐 아무것도 안 보인다. 못 쟀으면 vh 로 받쳐 둔다 —
   * 한 틱 뒤에 제 값으로 바뀐다.
   */
  const u = (n: number) => (unit > 0 ? `${unit * n}px` : `${n * 100}vh`);

  return (
    <div
      ref={boxRef}
      // flex-1 만 주었더니 통이 **안쪽 높이를 따라 삼천만 픽셀로 부풀었다.**
      // 자기 키를 자로 삼는 통이 자기 안을 따라가면 끝이 없다.
      // 키를 먼저 못박고(h-[70vh]) 그 안에서 굴린다 — min-h-0 이 있어야
      // flex 안에서 통이 제 키를 지킨다.
      className="relative mx-auto h-[70vh] min-h-0 w-full max-w-xl overflow-y-auto overscroll-contain rounded-[16px]"
      style={{ background: "#F4F2EC" }} // 종이빛 — 이 방 안에만 편다
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
        className="sticky top-3 z-20 float-right mr-3 rounded-full border border-black/15 bg-white/80 px-3.5 py-1.5 text-[11px] tracking-[0.25em] text-black/45 backdrop-blur transition-colors hover:text-black/75"
      >
        나가기
      </Link>

      {/* 얼마나 내려왔나 — 오른쪽 가장자리 실 한 오라기.
          숫자로 안 적는다. 끝이 있다고 말하는 셈이 되니까. */}
      <div
        aria-hidden
        className="sticky top-0 z-20 float-right w-[2px] bg-black/20"
        style={{ height: `${Math.min(100, deep * 100)}%`, marginLeft: -2 }}
      />

      <div className="relative" style={{ height: u(DEPTH) }}>
        {/* ── 첫 화면 — 下心 ──
            두 SVG 를 따로 그렸더니 좌표계가 어긋나 세로획이 가로획 오른쪽
            끝에 가서 붙었다. **자리는 전부 %로 잡고**, 붓의 굵기 변화만
            SVG 에 맡긴다. 그러면 어느 화면 폭에서도 한 글자로 선다.

            下 의 짜임 — 가로획 하나, 그 **한가운데**에서 내려오는 세로획,
            세로획 **오른쪽**에 점 하나. */}
        <div className="absolute inset-x-0 top-0" style={{ height: u(1) }}>
          <div className="relative mx-auto h-full w-full max-w-[520px]">
            {/* 가로획 — 왼쪽 기필(起筆)이 굵고 오른쪽 끝에서 가늘게 빠진다 */}
            <svg
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              className="absolute"
              style={{ left: "12%", top: u(0.24), width: "62%", height: "26px" }}
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
              style={{ left: "47%", top: u(0.30), width: "34px", height: "34px" }}
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
                top: u(0.19),
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
          style={{ top: u(0.25), bottom: 0 }}
        >
          <div className="relative mx-auto h-full w-full max-w-[520px]">
            <svg
              viewBox="0 0 60 1200"
              preserveAspectRatio="none"
              className="absolute"
              style={{ left: "41.4%", top: 0, width: "18px", height: u(1.6) }}
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
                top: u(1.6),
                bottom: 0,
                left: "43%",
                width: "5px",
                // 아래로 갈수록 옅어지게 했더니 회색 막대가 됐다.
                // 먹은 마르면 **옅어지는 게 아니라 갈라진다**(비백, 飛白).
                // 진하기는 거의 그대로 두고, 흰 줄이 결처럼 파고들게 한다.
                background: `
                  repeating-linear-gradient(
                    to bottom,
                    transparent 0px, transparent 26px,
                    rgba(244,242,236,.85) 26px, rgba(244,242,236,.85) 29px,
                    transparent 29px, transparent 74px
                  ),
                  linear-gradient(to bottom, #14110E 0%, #17140F 55%, #1C1813 100%)
                `,
              }}
            />
          </div>
        </div>

        {/* ── 끝 — 먹으로 맺는다 ──
            획이 바닥에 닿으면 붓을 눌러 떼는 자국 하나(수필, 收筆)가 남고,
            그 아래 서예로 한 줄. 여기까지 온 사람만 본다. */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: u(1) }}>
          <div className="relative mx-auto h-full w-full max-w-[520px]">
            {/* 수필(收筆) — 붓을 지그시 눌렀다 떼며 맺는 자국 */}
            <svg
              viewBox="0 0 120 120"
              className="absolute"
              style={{ left: "35.5%", top: u(0.26), width: "56px", height: "56px" }}
            >
              <path
                d="M52 0 C50 22, 47 42, 44 58
                   C40 78, 44 96, 58 102
                   C74 108, 90 96, 92 78
                   C94 58, 82 42, 70 30
                   C64 24, 60 12, 60 0 Z"
                fill="#14110E"
              />
            </svg>

            <div className="absolute inset-x-0 text-center" style={{ top: u(0.44) }}>
              <p className="font-serif text-[30px] leading-[1.7] text-[#14110E] sm:text-[36px]">
                여기가
                <br />
                바닥인 줄 알았는데
              </p>
              <p className="mt-7 font-serif text-[19px] leading-[1.8] text-black/55 sm:text-[22px]">
                내려온 만큼
                <br />
                낮아진 것은 아니더라
              </p>
              {/* 낙관 한 점 — 붉은 도장 */}
              <p
                className="mt-10 inline-block px-2 py-1 font-serif text-[13px] tracking-[0.2em]"
                style={{ color: "#B23A2E", border: "1.5px solid #B23A2E" }}
              >
                下心
              </p>
              <p className="mt-8 text-[11.5px] tracking-[0.3em] text-black/35">
                다시 올라가셔도 됩니다
              </p>
            </div>
          </div>
        </div>

        {/* ── 드물게 스치는 말 ── */}
        {WHISPERS.map((w, i) => (
          <p
            key={w}
            className="pointer-events-none absolute left-0 right-0 text-center text-[12.5px] tracking-[0.35em] text-black/30"
            style={{ top: u((i + 1) * 14) }}
          >
            {w}
          </p>
        ))}
      </div>
    </div>
  );
}
