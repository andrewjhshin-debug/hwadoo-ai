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
import { addMerit } from "@/lib/merit";

/**
 * 획이 이어지는 길이 — 방 한 칸 높이의 몇 배.
 *
 * 처음엔 삼백 칸으로 두었다. 십육만 픽셀이다. 아무도 못 닿는다 —
 * 그러면 형이 시킨 「끝에 먹으로 맺는」 자리를 본 사람이 하나도 없다.
 * **꽤나 내려가되 닿을 수 있게.** 마흔 칸으로 잡았다가 형이 「더 길게」
 * 해서 일흔다섯 칸으로 늘렸다. 엄지로 쓸면 이삼 분 걸리고, 그 끝에
 * 먹 한 점과 옛말 한 줄이 기다린다.
 */
const DEPTH = 75;

// 잘라 둔 세 조각의 자리 — `seogye.mjs` 가 뽑아 준 값 그대로.
// 머리 조각의 폭이 자다. 셋을 이 숫자대로 얹으면 획이 한 줄로 선다.
const HEAD_RATIO = 0.7553; // 높이 ÷ 폭
const MID_LEFT = 37.234;
const MID_WIDTH = 24.468;
const MID_RATIO = 12.1739;
const TAIL_LEFT = 34.043;
const TAIL_WIDTH = 30.851;
const TAIL_RATIO = 1.3448;

/**
 * 두 벌 — 먹빛 종이에 금글씨(기본) · 흰 종이에 먹글씨.
 *
 * 형: 「배경을 우리 원래 디자인 톤인 먹색으로, 붓서예 하심 색은 우리
 * 노랑 골드로. 골드 노란 글씨가 디폴트로 메인이고, 원하면 흰 도화지에
 * 묵 하심도 할 수 있게」
 *
 * 글씨는 검은 먹으로 찍힌 PNG 다. 색을 바꾸려면 그림을 다시 뽑는 게
 * 아니라 **가리개(mask)로 쓴다** — 먹 자리만 남기고 그 자리에 원하는
 * 색을 깐다. 한 장으로 두 벌이 나온다.
 */
type Ink = "gold" | "ink";
const SKIN: Record<Ink, { paper: string; brush: string; dim: string; line: string }> = {
  gold: { paper: "#12100E", brush: "#D9B45B", dim: "rgba(217,180,91,.55)", line: "rgba(217,180,91,.22)" },
  ink: { paper: "#F4F2EC", brush: "#14110E", dim: "rgba(20,17,14,.5)", line: "rgba(20,17,14,.15)" },
};
const INK_KEY = "hwadu.hasim.ink";

/**
 * 끝에서 만나는 한 줄 — 낮춤에 대한 옛말.
 *
 * 형: 「하심 관련된 선사들 말 가져와서 랜덤으로 뜨게 해」
 *
 * **이름을 붙인 것은 출처가 분명한 셋뿐이다.** 나머지는 선가의 결로
 * 우리가 쓴 말이라 이름을 안 붙인다 — 없는 말을 누구의 말이라고
 * 적는 것이 제일 나쁘다.
 */
const SAYINGS: { lines: string[]; by?: string }[] = [
  {
    lines: ["최고의 선은 물과 같다.", "물은 만물을 이롭게 하면서", "가장 낮은 곳으로 흐른다."],
    by: "노자 · 도덕경",
  },
  { lines: ["자기를", "바로 봅시다."], by: "성철" },
  {
    lines: ["무소유란 아무것도 갖지 않는 것이 아니라", "불필요한 것을 갖지 않는 것이다."],
    by: "법정",
  },
  { lines: ["고개를 숙이면", "부딪히지 않는다."] },
  { lines: ["비워야 담긴다.", "가득 찬 그릇에는", "아무것도 못 붓는다."] },
  { lines: ["낮은 자리가 가장 넓다.", "거기서는 누구도 밀려나지 않는다."] },
  { lines: ["높이려는 마음이 남아 있는 한", "낮추는 일도 높이는 일이다."] },
  { lines: ["남을 높이는 데는", "아무것도 들지 않는다."] },
  { lines: ["지는 것이", "반드시 잃는 것은 아니다."] },
  { lines: ["내가 옳다는 생각을 내려놓는 것,", "거기서부터가 하심이다."] },
  { lines: ["물은 다투지 않는다.", "다만 낮은 데로 갈 뿐이다."] },
  { lines: ["끝까지 내려와 보니", "낮출 것이 없었다.", "낮추려던 마음, 그것만 남아 있었다."] },
];

/** 종이 폭의 한계 — 이보다 넓어지면 획이 허여멀개진다 */
const PAPER = 480;

export default function HasimPage() {
  const [deep, setDeep] = useState(0);
  // 통 한 칸의 높이와 종이 폭(px). vh 는 **화면** 높이라 이 방 안에서는
  // 어긋난다 — 방이 화면보다 작으니까. 통을 재어 그 값을 자로 쓴다.
  const [unit, setUnit] = useState(0);
  const [paper, setPaper] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  /** 먹빛 종이에 금글씨가 기본. 원하면 흰 종이에 먹글씨 */
  const [ink, setInk] = useState<Ink>("gold");
  /** 이번에 만날 한 줄 — 들어올 때 한 번 뽑는다 */
  const [say, setSay] = useState(0);
  /** 바닥에 닿았을 때 붙은 공덕(0 이면 오늘 이미 받았거나 천장) */
  const [got, setGot] = useState<number | null>(null);
  const paidRef = useRef(false);

  useEffect(() => {
    setSay(Math.floor(Math.random() * SAYINGS.length));
    try {
      const v = window.localStorage.getItem(INK_KEY);
      if (v === "ink" || v === "gold") setInk(v);
    } catch {
      /* 못 읽으면 기본값 */
    }
  }, []);

  const flip = () => {
    setInk((v) => {
      const next: Ink = v === "gold" ? "ink" : "gold";
      try {
        window.localStorage.setItem(INK_KEY, next);
      } catch {
        /* 못 적어도 이번 판은 바뀐다 */
      }
      return next;
    });
  };

  const skin = SKIN[ink];

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const on = () => {
      const max = el.scrollHeight - el.clientHeight;
      const d = max > 0 ? el.scrollTop / max : 0;
      setDeep(d);
      // 바닥에 닿으면 공덕 — 형: 「다 내리면 그것도 공덕 주고」
      // 한 판에 한 번만(paidRef), 하루 몫은 장부가 막는다.
      if (d > 0.995 && !paidRef.current) {
        paidRef.current = true;
        setGot(addMerit("hasim").gained);
      }
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
  // 心 을 첫 화면에 넣으려고 下 를 0.06 까지 끌어올렸더니 종이 위가
  // 답답해졌다 — 형: 「하심 디자인 존나 좋았잖아 왜 밤티 됐냐」.
  // 숨통을 조금 되돌린다. 心 은 아래에서 더 작게 앉혀 자리를 만든다.
  const headTop = unit * 0.11;
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
      style={{ background: skin.paper, transition: "background .35s" }}
    >
      {/* 나가는 문과 빛깔 — 오른쪽 위 한 자리에 나란히.
          먹빛 종이에 금글씨가 기본이고, 눌러 흰 종이로 바꾼다. */}
      <div className="sticky top-3 z-20 float-right mr-3 flex items-center gap-2">
        <button
          type="button"
          onClick={flip}
          aria-label={ink === "gold" ? "흰 종이로" : "먹빛 종이로"}
          className="rounded-full px-3 py-1.5 text-[11px] tracking-[0.2em] backdrop-blur transition-opacity hover:opacity-100"
          style={{
            color: skin.dim,
            border: `1px solid ${skin.line}`,
            background: ink === "gold" ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.7)",
            opacity: 0.9,
          }}
        >
          {ink === "gold" ? "흰 종이" : "먹빛"}
        </button>
        <Link
          href="/"
          className="rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.25em] backdrop-blur transition-opacity hover:opacity-100"
          style={{
            color: skin.dim,
            border: `1px solid ${skin.line}`,
            background: ink === "gold" ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.7)",
            opacity: 0.9,
          }}
        >
          나가기
        </Link>
      </div>

      {/* 오른쪽 가장자리에 실 한 오라기로 「얼마나 내려왔나」를 보여 주었다.
          형: 「스크롤 보여주지마 없애」. 맞다 — 얼마 남았는지 보이면
          그건 끝을 재는 일이지 낮추는 일이 아니다. 지웠다. */}

      <div className="relative" style={{ height: u(DEPTH) }}>
        <div
          className="relative mx-auto h-full"
          style={{ width: paper > 0 ? paper : "100%" }}
        >
          {/* ── 머리 — 가로획 · 점 · 세로획의 시작 ──
              먹으로 찍힌 그림을 **가리개로만** 쓴다. 먹 자리에 원하는
              빛깔을 깐다 — 그림 한 장으로 금글씨도 먹글씨도 나온다. */}
          <div
            aria-label="下"
            role="img"
            className="pointer-events-none absolute left-0 w-full select-none"
            style={{
              top: headTop,
              height: ready ? headH : 0,
              backgroundColor: skin.brush,
              maskImage: "url(/seo/ha-head.png)",
              WebkitMaskImage: "url(/seo/ha-head.png)",
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />

          {/* 心 — 下 **아래**, 오른편에.
              처음엔 가로획 옆에 나란히 두었는데 붓이 워낙 굵어 글자를
              통째로 삼켜 버렸다. 점(별획) 밑으로 내리니 위에서부터
              下 → 心 으로 읽힌다. 형이 말한 「세로로」가 이거다.

              이것도 **폰트가 아니라 그림이다.** 명조로 찍었더니 옆에 선
              진짜 붓글씨한테 바로 들통났다. `_틀/simcut.mjs` 가 붓 글꼴로
              뼈대를 뜨고 그 위에 下 세로획에서 떠 온 먹 결을 덮는다. */}
          <div
            aria-label="心"
            role="img"
            className="pointer-events-none absolute select-none"
            style={{
              backgroundColor: skin.brush,
              maskImage: "url(/seo/ha-sim.png)",
              WebkitMaskImage: "url(/seo/ha-sim.png)",
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              aspectRatio: "633 / 403",
              // 30%는 下 옆에서 너무 컸다. 한 글자가 다른 글자를 밀면
              // 두 글자가 아니라 한 덩어리로 보인다. 작게, 그리고 점에서
              // 한 뼘 더 떨어뜨린다.
              right: "7%",
              width: "24%",
              // 下 의 **아래**로 완전히 내린다. 0.86 자리에 두었더니
              // 점(별획)과 같은 띠에 앉아 두 글자가 엉겼다.
              top: headTop + headH + 26,
              transform: "rotate(-3deg)",
            }}
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
                    backgroundColor: skin.brush,
                    maskImage: "url(/seo/ha-mid.png)",
                    WebkitMaskImage: "url(/seo/ha-mid.png)",
                    maskSize: "100% 100%",
                    WebkitMaskSize: "100% 100%",
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
              <div
                aria-hidden
                className="pointer-events-none absolute select-none"
                style={{
                  left: `${TAIL_LEFT}%`,
                  width: `${TAIL_WIDTH}%`,
                  top: endTop,
                  height: tailH,
                  backgroundColor: skin.brush,
                  maskImage: "url(/seo/ha-tail.png)",
                  WebkitMaskImage: "url(/seo/ha-tail.png)",
                  maskSize: "100% 100%",
                  WebkitMaskSize: "100% 100%",
                }}
              />
              <div
                className="absolute inset-x-0 text-center"
                style={{ top: endTop + tailH + 30 }}
              >
                {/* 끝에서 만나는 한 줄 — 들어올 때마다 다르다.
                    형: 「하심 관련된 선사들 말 랜덤으로」 */}
                <p
                  className="font-serif text-[22px] leading-[1.9] sm:text-[26px]"
                  style={{ color: skin.brush }}
                >
                  {SAYINGS[say].lines.map((l, i) => (
                    <span key={i}>
                      {l}
                      {i < SAYINGS[say].lines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
                {SAYINGS[say].by && (
                  <p className="mt-5 text-[12px] tracking-[0.3em]" style={{ color: skin.dim }}>
                    — {SAYINGS[say].by}
                  </p>
                )}

                {/* 낙관 한 점 — 붉은 도장 */}
                <p
                  className="mt-9 inline-block px-2 py-1 font-serif text-[13px] tracking-[0.2em]"
                  style={{ color: "#B23A2E", border: "1.5px solid #B23A2E" }}
                >
                  下心
                </p>

                {/* 끝까지 내려온 값 — 형: 「다 내리면 그것도 공덕 주고」 */}
                {got !== null && (
                  <p className="mt-5 text-[12.5px] tracking-[0.2em]" style={{ color: skin.dim }}>
                    {got > 0 ? `공덕 ${got.toLocaleString("ko-KR")}` : "오늘 몫은 이미 받았어요"}
                  </p>
                )}

                {/* 끝까지 온 사람이 다시 위로 백 화면을 굴러 올라갈 이유가
                    없다. 형: 「하심 끝나고 되돌아가면 다시 메뉴로」 */}
                <div className="mt-9 pb-2">
                  <Link
                    href="/"
                    className="inline-block rounded-full px-6 py-2.5 text-[11.5px] tracking-[0.3em] transition-opacity hover:opacity-100"
                    style={{ color: skin.dim, border: `1px solid ${skin.line}`, opacity: 0.85 }}
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
