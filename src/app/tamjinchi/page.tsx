"use client";

// ─────────────────────────────────────────────────────────────
// 불심투자 — 목탁 108번과 차트 봉 하나.
//
// 형: 「불심투자 니 식대로 해봐. 재밌고 우습고 실소 나오고 근데 이게 맞고」
// 형: 「사고 싶다 — 목탁을 칠수록 주가가 내려서 더 좋은 자리가 온다. 팔고 싶다는 반대로,
//      기다리는 동안 주가가 올라야지. 마음을 관리하니까 주식이 올랐다, 이런 스탠스」
// 그래서 산다 쪽은 칠 때마다 파란 음봉이 위에서 내려오고 값이 싸진다.
// 판다 쪽은 빨간 양봉이 밑에서 오르고 값이 오른다. 108번이면 30% — 상한가·하한가(형).
// 두 쪽은 위 단추로 언제든 넘나든다(친 수는 그대로). 급하게 치면 안 쳐진다.
// 아래 산다·안 산다 단추는 걷고 공유하기 하나만 둔다(형: 「없어도 될 것 같고 대신 공유하기」). 셈은 lib/invest-cool.ts.
// 한자·체온계·「그냥 보기만」·숫자 칸·이전 기록은 걷었다.
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { buzz, strikeMoktak, wakeSound } from "@/lib/sound";
import { 목탁수, 식음, 치기 } from "@/lib/invest-cool";
import { addMerit } from "@/lib/merit";
import "./cool.css";

/** 108번 다 치면 30% — 상한가 */
const 상한 = 30;

type 쪽 = "buy" | "sell";
type 판 = { want: 쪽; left: number };

/** 위에 뜨는 한 마디 — 늘 두 줄, 끊는 자리는 여기서 정한다(형: 「이상하게 끊기게 하지 마」).
 *  비꼬지 않고 확정적으로, 센스 있게(형: 「멘트 신중하게, 확정적이거나 센스 있게 재밌게만」) */
const 말들: Record<쪽, { 급함: string[]; 끝: string[]; 단계: [number, string[]][] }> = {
  buy: {
    급함: ["급한 손은 체결이 안 됩니다.", "한 번에 한 번씩."],
    끝: ["108번 기다린 가격입니다.", "이제 사도 후회 없습니다."],
    단계: [[90, ["사고 싶은 마음, 접수했습니다.", "목탁부터 치고 사죠."]], [60, ["치는 만큼 값이 내려옵니다.", "좋은 자리는 기다린 사람 몫."]], [30, ["벌써 이만큼 싸졌습니다.", "서둘렀으면 못 봤을 가격."]], [0, ["바닥이 보입니다.", "마지막 몇 번만 더."]]],
  },
  sell: {
    급함: ["던지는 손은 체결이 안 됩니다.", "한 번에 한 번씩."],
    끝: ["108번 버틴 가격입니다.", "이제 팔아도 아깝지 않습니다."],
    단계: [[90, ["팔고 싶은 마음, 접수했습니다.", "목탁부터 치고 팔죠."]], [60, ["치는 만큼 값이 올라갑니다.", "버틴 손이 수익을 냅니다."]], [30, ["벌써 이만큼 올랐습니다.", "서둘렀으면 못 봤을 가격."]], [0, ["고점이 보입니다.", "마지막 몇 번만 더."]]],
  },
};
function 말(want: 쪽, left: number, 급함: boolean) {
  const m = 말들[want];
  const 줄 = 급함 ? m.급함 : left === 0 ? m.끝 : m.단계.find(([n]) => left > n)![1];
  return 줄.join("\n");
}

export default function InvestmentPage() {
  const [판, 판잡기] = useState<판>({ want: "buy", left: 목탁수 });
  const [hit, hitSet] = useState(0);
  const [급함, 급함잡기] = useState(false);
  const last = useRef(0);

  const 목탁 = () => {
    wakeSound();
    const now = performance.now();
    const [left, ok] = 치기(판.left, now - last.current);
    if (!ok) { if (판.left > 0) { 급함잡기(true); window.setTimeout(() => 급함잡기(false), 900); } return; }
    last.current = now;
    strikeMoktak(0.8);
    addMerit("moktak"); // 형: 「위 연꽃 게이지랑 연동해서 치면 공덕 차도록」 — 목탁 화면과 같은 몫
    buzz(left === 0 ? 30 : 6);
    hitSet((h) => h + 1);
    판잡기({ ...판, left });
  };

  const 공유 = async (say: string) => {
    const url = `${location.origin}/tamjinchi`;
    const text = `${say}\n— 화두 불심투자: 사기 전에, 팔기 전에 목탁 108번`;
    try {
      if (navigator.share) await navigator.share({ title: "화두 불심투자", text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); alert("글과 링크를 복사했어요."); }
    } catch { /* 취소 */ }
  };

  return (
    <HipRoom here="/tamjinchi" lanes={false} rail="/settings" scroll={false}>
      <section className="cool" aria-label="불심투자" style={{ "--fill": 식음(판.left) } as React.CSSProperties}>
        {/* 형: 「뒤로가기 버튼 하나 둬」 */}
        <header className="cool-head">
          <button type="button" className="cool-back" aria-label="뒤로" onClick={() => history.back()}>‹</button>
          <h1>불심투자</h1>
        </header>

        <p className={`cool-say${급함 ? " is-hurry" : ""}`} role="status">{말(판.want, 판.left, 급함)}</p>

        <div className="cool-therm">
          <div className={`cool-candle is-${판.want}`} aria-hidden><span className="cool-wick" /><span className="cool-body" /></div>
          <div className="cool-side">
            <div className={`cool-price is-${판.want}`} aria-label="값의 움직임">
              {판.want === "buy" ? "▼" : "▲"} {((목탁수 - 판.left) * 상한 / 목탁수).toFixed(1)}%
            </div>
            {/* 형: 「목탁 가운데로 더 크게, 칠 때 효과 더」 — 눌리고, 물결이 퍼지고, 값이 한 칸 튄다 */}
            <button type="button" className={`cool-mok${판.left === 0 ? " is-done" : ""}`} aria-label="목탁 치기" onPointerDown={(e) => { if (e.isPrimary) { e.preventDefault(); 목탁(); } }} onContextMenu={(e) => e.preventDefault()}>
              {hit > 0 && <span key={hit} className="cool-hit" aria-hidden><i /><b className={`is-${판.want}`}>{판.want === "buy" ? "▼" : "▲"}{(상한 / 목탁수).toFixed(2)}%</b></span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={`m${hit}`} className={hit > 0 ? "is-struck" : undefined} src="/obj/moktak-carved-fish-v1.webp" alt="" draggable={false} />
            </button>
          {/* 형: 「목탁 108번 친다는 것도 어디 표기해」 */}
          <p className="cool-rule">목탁 108번 · <b>{목탁수 - 판.left}</b>/108</p>
          </div>
        </div>
        {/* 형: 「산다 판다를 산다·안 판다 그 자리로 내려」「다 치고 나서 공유하기랑 다시 뜨도록」 — 한 자리를 둘이 번갈아 쓴다 */}
        {판.left > 0 ? (
          <div className="cool-mode" role="tablist" aria-label="산다 판다">
            {(["buy", "sell"] as 쪽[]).map((w) => (
              <button key={w} type="button" role="tab" aria-selected={판.want === w} className={`is-${w}`} onClick={() => 판잡기({ ...판, want: w })}>{w === "buy" ? "산다" : "판다"}</button>
            ))}
          </div>
        ) : (
          <div className="cool-again">
            <button type="button" onClick={() => { last.current = 0; 판잡기({ ...판, left: 목탁수 }); }}>다시</button>
            <button type="button" className="cool-share" onClick={() => 공유(말(판.want, 0, false))}>공유하기</button>
          </div>
        )}
      </section>
    </HipRoom>
  );
}
