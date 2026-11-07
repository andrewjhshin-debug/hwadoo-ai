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
 *  주식갤 말맛으로 짧고 세게(형: 「DC 갤러리든 뭐든 재밌는 거 가져와, 함축적으로」) — 놀리는 대상은 늘 시장이지 사람이 아니다 */
const 말들: Record<쪽, { 급함: string[]; 끝: string[]; 단계: [number, string[]][] }> = {
  // 형: 「반말로, 뭐 하는 중이냐 말고 뭐뭐 중 — 깔끔하게, 서술할 필요 없다」
  buy: {
    급함: ["손가락이 가즈아.", "한 번에 한 번씩."],
    끝: ["108번 존버한 평단.", "이제 가즈아."],
    단계: [[90, ["지금 사면 구조대 1번.", "일단 쳐."]], [60, ["떡락 중. 좋은 쪽으로.", "줍줍 각 잡는 중."]], [30, ["아까 샀으면 「안 살껄」.", "껄무새 탈출."]], [0, ["바닥 냄새.", "인간지표 졸업 직전."]]],
  },
  sell: {
    급함: ["손절 버튼에서 손 떼.", "한 번에 한 번씩."],
    끝: ["108번 존버한 익절가.", "이제 웃으며 매도."],
    단계: [[90, ["지금 던지면 개미털기 당첨.", "일단 쳐."]], [60, ["떡상 중. 들고 있는 쪽이.", "설거지는 남이."]], [30, ["아까 던졌으면 배 아플 자리.", "존버 승리."]], [0, ["고점 냄새.", "인간지표 졸업 직전."]]],
  },
};
function 말(want: 쪽, left: number, 급함: boolean) {
  const m = 말들[want];
  const 줄 = 급함 ? m.급함 : left === 0 ? m.끝 : m.단계.find(([n]) => left > n)![1];
  return 줄.join("\n");
}

export default function InvestmentPage() {
  const [판, 판잡기] = useState<판>({ want: "buy", left: 목탁수 });
  // 친 순간의 쪽을 같이 적어 둔다 — 산다·판다만 바꿨을 때 ▲▼ 가 다시 튀지 않게(형: 「목탁 쳤을 때만 보여줘」)
  const [hit, hitSet] = useState<{ n: number; want: 쪽 }>({ n: 0, want: "buy" });
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
    hitSet((h) => ({ n: h.n + 1, want: 판.want }));
    판잡기({ ...판, left });
  };

  const 공유 = async (say: string) => {
    const url = `${location.origin}/tamjinchi`;
    const text = `${say}\n— 화두 불심투자: 사기 전에, 팔기 전에 목탁 108번`;
    // 앱은 안드로이드 공유창, 그 밖은 공유판이 뜬다(components/NativeShare)
    try { await navigator.share({ title: "화두 불심투자", text, url }); } catch { /* 닫음 */ }
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
              {hit.n > 0 && <span key={hit.n} className="cool-hit" aria-hidden><i /><b className={`is-${hit.want}`}>{hit.want === "buy" ? "▼" : "▲"}{(상한 / 목탁수).toFixed(2)}%</b></span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={`m${hit.n}`} className={hit.n > 0 ? "is-struck" : undefined} src="/obj/moktak-carved-fish-v1.webp" alt="" draggable={false} />
            </button>
          {/* 형: 「목탁 108번 친다는 것도 어디 표기해」「목탁 108번 없이 그 분수만」 */}
          <p className="cool-rule"><b>{목탁수 - 판.left}</b>/108</p>
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
