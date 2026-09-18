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
// 한동안 내려가는 길에 한 줄씩 말을 흘려 두었다. 시키지도 않은 걸
// 넣은 거였고, 획을 가로질러 글자가 뜨니 먹만 지저분해졌다. 지웠다.
// 내려가는 길에는 획 하나만 있으면 된다.
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
  // 맺음은 마지막 한 칸에서. 예전엔 한 칸을 통째로 비워 두어 낙관 밑이
  // 휑했다 — 형: 「그 밑에 여백이 너무 넓어, 여백 없어도 돼」.
  // 맺음 그림과 글 두 줄, 낙관, 나가는 문이 들어갈 만큼만 남긴다.
  const endTop = total - unit * 0.86;
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
      // **화면을 통째로 덮는다.**
      //
      // 한동안 방 안에 70vh 짜리 통으로 앉혀 두었다. 형이 그걸 보고
      // 「개판났노, 그냥 하심 쭈욱 나오게, 오른쪽 위에 나가기 하면
      // 되겠다」 했다. 맞다 — 낮추는 자리에 서랍과 띠가 같이 보이면
      // 낮추는 게 아니다. 나가는 문 하나만 남긴다.
      //
      // fixed 로 덮되 **자기 키를 자로 삼는 통이 자기 안을 따라가면
      // 끝이 없다**(예전에 삼천만 픽셀로 부푼 그 버그). inset-0 은 키가
      // 화면에 못박혀 있어 그 일이 안 생긴다.
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
      style={{ background: "#F4F2EC" }} // 종이빛 — 이 방 안에만 편다
    >
      {/* 나가는 문 */}
      <Link
        href="/"
        className="sticky top-3 z-20 float-right mr-3 rounded-full border border-black/15 bg-white/80 px-3.5 py-1.5 text-[11px] tracking-[0.25em] text-black/45 backdrop-blur transition-colors hover:text-black/75"
      >
        나가기
      </Link>

      {/* 오른쪽 가장자리에 실 한 오라기로 「얼마나 내려왔나」를 보여 주었다.
          형: 「스크롤 보여주지마 없애」. 맞다 — 얼마 남았는지 보이면
          그건 끝을 재는 일이지 낮추는 일이 아니다. 지웠다. */}

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
                {/* 끝에 놓는 말.
                    처음엔 「여기가 바닥인 줄 알았는데 / 내려온 만큼 낮아진
                    것은 아니더라」였다. 뜻은 맞는데 넋두리에 가까웠다.

                    하심의 마지막 매듭은 **낮추려는 마음까지 내려놓는 것**이다.
                    낮추려 애쓰는 동안은 여전히 「낮추는 나」가 서 있다.
                    그 한 겹을 찍어 끝낸다. */}
                <p className="font-serif text-[30px] leading-[1.7] text-[#14110E] sm:text-[36px]">
                  끝까지 내려와 보니
                  <br />
                  낮출 것이 없었다
                </p>
                <p className="mt-7 font-serif text-[19px] leading-[1.8] text-black/55 sm:text-[22px]">
                  낮추려던 마음,
                  <br />
                  그것만 남아 있었다
                </p>
                {/* 낙관 한 점 — 붉은 도장 */}
                <p
                  className="mt-10 inline-block px-2 py-1 font-serif text-[13px] tracking-[0.2em]"
                  style={{ color: "#B23A2E", border: "1.5px solid #B23A2E" }}
                >
                  下心
                </p>

                {/* 끝까지 온 사람이 다시 위로 백 화면을 굴러 올라갈 이유가
                    없다. 형: 「하심 끝나고 되돌아가면 다시 메뉴로」 */}
                <div className="mt-9 pb-2">
                  <Link
                    href="/"
                    className="inline-block rounded-full border border-black/15 bg-white/70 px-6 py-2.5 text-[11.5px] tracking-[0.3em] text-black/45 transition-colors hover:text-black/75"
                  >
                    나가기
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* 「하 심」 이라 적어 두었던 자리 — 지웠다.
              下 와 心 이 이미 그 말이다. 그림 옆에 같은 말을 또 적으면
              그림을 못 믿는다는 뜻이 된다. */}
          {/* 「아래로 내려 보세요」라 적어 두었던 자리 — 지웠다.
              형: 「없애 장난하냐」. 종이가 아래로 길면 내리라는 뜻이다. */}

        </div>
      </div>
    </div>
  );
}
