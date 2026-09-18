"use client";

// ─────────────────────────────────────────────────────────────
// 하심(下心) — 마음을 낮추는 자리.
//
// 선사들이 「佛」을 쓸 때 세로획 하나를 종이 끝까지 내리긋는다. 그 획이
// 글씨의 전부다. 하심도 같다 — **「下」의 세로획을 끝없이 내리긋는다.**
//
// 획은 이제 **진짜 붓글씨다.** 한동안 SVG 로 획을 빚었는데, 아무리
// 손을 봐도 「그린 붓」이었다. 먹이 마르며 갈라지는 비백(飛白)은
// 좌표로 그릴 수 있는 결이 아니다. 한 장 써 놓은 「下」를
// 머리·몸통·맺음 셋으로 잘라 쓴다(`화두 이미지/_틀/seogye.mjs`).
//
// 몸통을 그냥 반복하면 이음매가 눈에 밟힌다. **거울로 뒤집어 가며**
// 잇는다 — 뒤집힌 끝과 바로 선 끝이 같은 결이라 자국이 안 남는다.
//
// 종이는 **이 방 안에만** 편다. 처음엔 화면 전체를 덮었는데(fixed inset-0),
// 그러면 서랍도 아래 띠도 다 사라져 딴 앱에 들어온 것 같았다.
//
// 내려가다 드물게 한 줄씩 말이 스친다. 읽으라고 두는 게 아니라
// 내려가는 일이 헛되지 않다는 표다.
//
// 공덕은 안 준다. 낮추는 일에 값을 매기면 낮추는 일이 아니게 된다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * 획이 이어지는 길이 — 방 한 칸 높이의 몇 배.
 *
 * 처음엔 삼백 칸으로 두었다. 십육만 픽셀이다. 아무도 못 닿는다 —
 * 그러면 형이 시킨 「끝에 먹으로 맺는」 자리를 본 사람이 하나도 없다.
 * **꽤나 내려가되 닿을 수 있게** 마흔 칸. 엄지로 쓸면 한참 걸리고,
 * 그 끝에 먹 한 점이 기다린다.
 */
const DEPTH = 40;

// 잘라 둔 세 조각의 자리 — `seogye.mjs` 가 뽑아 준 값 그대로.
// 머리 조각의 폭이 자다. 셋을 이 숫자대로 얹으면 획이 한 줄로 선다.
const HEAD_RATIO = 0.7553; // 높이 ÷ 폭
const MID_LEFT = 37.234;
const MID_WIDTH = 24.468;
const MID_RATIO = 12.1739;
const TAIL_LEFT = 34.043;
const TAIL_WIDTH = 30.851;
const TAIL_RATIO = 1.3448;

/** 종이 폭의 한계 — 이보다 넓어지면 획이 허여멀개진다 */
const PAPER = 480;

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
  // 통 한 칸의 높이와 종이 폭(px). vh 는 **화면** 높이라 이 방 안에서는
  // 어긋난다 — 방이 화면보다 작으니까. 통을 재어 그 값을 자로 쓴다.
  const [unit, setUnit] = useState(0);
  const [paper, setPaper] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const on = () => {
      const max = el.scrollHeight - el.clientHeight;
      setDeep(max > 0 ? el.scrollTop / max : 0);
    };
    el.addEventListener("scroll", on, { passive: true });
    const measure = () => {
      setUnit(el.clientHeight);
      setPaper(Math.min(PAPER, el.clientWidth));
    };
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
   * 첫 그림에서는 아직 못 쟀다(unit 0). 그때 0px 를 주면 전부 맨 위로
   * 겹쳐 아무것도 안 보인다. 못 쟀으면 vh 로 받쳐 둔다.
   */
  const u = (n: number) => (unit > 0 ? `${unit * n}px` : `${n * 100}vh`);

  // ── 획의 세 토막을 어디에 놓을 것인가 ──
  const total = unit * DEPTH;
  const headTop = unit * 0.06; // 心 이 첫 화면 안에 들어오려면 下 를 올려야 한다
  const headH = paper * HEAD_RATIO;
  const midTop = headTop + headH - 1; // 1px 겹쳐 이음매를 없앤다
  const endTop = total - unit; // 맺음은 마지막 한 칸에서
  const midH = Math.max(0, endTop - midTop);
  const tailH = paper * (TAIL_WIDTH / 100) * TAIL_RATIO;

  // 몸통 한 칸의 제 높이. 이 길이로 나누어 **거울로 뒤집어 가며** 잇는다.
  const segNat = paper * (MID_WIDTH / 100) * MID_RATIO;
  const segs = segNat > 0 ? Math.max(1, Math.round(midH / segNat)) : 1;
  const segH = midH / segs;
  const ready = unit > 0 && paper > 0;

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
        <div
          className="relative mx-auto h-full"
          style={{ width: paper > 0 ? paper : "100%" }}
        >
          {/* ── 머리 — 가로획 · 점 · 세로획의 시작 ── */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/seo/ha-head.png"
            alt="下"
            className="pointer-events-none absolute left-0 w-full select-none"
            style={{ top: headTop, height: ready ? headH : undefined }}
            draggable={false}
          />

          {/* 心 — 下 **아래**, 오른편에.
              처음엔 가로획 옆에 나란히 두었는데 붓이 워낙 굵어 글자를
              통째로 삼켜 버렸다. 점(별획) 밑으로 내리니 위에서부터
              下 → 心 으로 읽힌다. 형이 말한 「세로로」가 이거다.

              이것도 **폰트가 아니라 그림이다.** 명조로 찍었더니 옆에 선
              진짜 붓글씨한테 바로 들통났다. `_틀/simcut.mjs` 가 붓 글꼴로
              뼈대를 뜨고 그 위에 下 세로획에서 떠 온 먹 결을 덮는다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/seo/ha-sim.png"
            alt="心"
            className="pointer-events-none absolute select-none"
            style={{
              right: "5%",
              width: "30%",
              // 下 의 **아래**로 완전히 내린다. 0.86 자리에 두었더니
              // 점(별획)과 같은 띠에 앉아 두 글자가 엉겼다.
              top: headTop + headH + 14,
              transform: "rotate(-3deg)",
            }}
            draggable={false}
          />

          {/* ── 몸통 — 거울로 뒤집어 가며 잇는 비백 세로획 ──
              같은 그림을 그냥 반복하면 이음매마다 결이 끊긴다.
              한 칸씩 뒤집으면 맞닿는 두 끝이 서로의 거울이라 자국이 없다. */}
          {ready && (
            <div
              aria-hidden
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: `${MID_LEFT}%`,
                width: `${MID_WIDTH}%`,
                top: midTop,
                height: midH,
              }}
            >
              {Array.from({ length: segs }, (_, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: i * segH,
                    left: 0,
                    right: 0,
                    height: segH + 1, // 1px 겹쳐 반올림 틈을 메운다
                    backgroundImage: "url(/seo/ha-mid.png)",
                    backgroundSize: "100% 100%",
                    transform: i % 2 ? "scaleY(-1)" : undefined,
                  }}
                />
              ))}
            </div>
          )}

          {/* ── 끝 — 먹으로 맺는다 ──
              붓을 지그시 눌렀다 떼는 자국 하나(수필, 收筆)가 남고,
              그 아래 서예로 두 줄. 여기까지 온 사람만 본다. */}
          {ready && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/seo/ha-tail.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute select-none"
                style={{
                  left: `${TAIL_LEFT}%`,
                  width: `${TAIL_WIDTH}%`,
                  top: endTop,
                  height: tailH,
                }}
                draggable={false}
              />
              <div
                className="absolute inset-x-0 text-center"
                style={{ top: endTop + tailH + 28 }}
              >
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
            </>
          )}

          {/* 「하 심」 이라 적어 두었던 자리 — 지웠다.
              下 와 心 이 이미 그 말이다. 그림 옆에 같은 말을 또 적으면
              그림을 못 믿는다는 뜻이 된다. */}
          {deep < 0.003 && (
            <p
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 animate-pulse text-[11px] tracking-[0.3em] text-black/40"
              style={{ top: unit * 0.955 }}
            >
              아래로 내려 보세요
            </p>
          )}

          {/* ── 드물게 스치는 말 ── */}
          {WHISPERS.map((w, i) => (
            <p
              key={w}
              className="pointer-events-none absolute left-0 right-0 text-center text-[12.5px] tracking-[0.35em] text-black/30"
              style={{ top: u(1.9 + i * 1.95) }}
            >
              {w}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
