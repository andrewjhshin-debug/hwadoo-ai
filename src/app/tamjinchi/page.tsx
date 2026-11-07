"use client";

// ─────────────────────────────────────────────────────────────
// 불심투자 — 목탁 108번과 차트 봉 하나.
//
// 형: 「불심투자 니 식대로 해봐. 재밌고 우습고 실소 나오고 근데 이게 맞고」
// 형: 「사고 싶다 — 목탁을 칠수록 주가가 내려서 더 좋은 자리가 온다. 팔고 싶다는 반대로,
//      기다리는 동안 주가가 올라야지. 마음을 관리하니까 주식이 올랐다, 이런 스탠스」
// 그래서 산다 쪽은 칠 때마다 파란 음봉이 위에서 내려오고 값이 0.1%씩 싸진다.
// 판다 쪽은 빨간 양봉이 밑에서 오르고 값이 0.1%씩 오른다. 108번이면 10.8%.
// 두 쪽은 위 단추로 언제든 넘나든다(친 수는 그대로). 급하게 치면 안 쳐진다.
// 「산다」「판다」는 108번 다 쳐야 눌린다. 다만 적는다. 셈은 lib/invest-cool.ts.
// 한자·체온계·「그냥 보기만」·숫자 칸·이전 기록은 걷었다.
// ─────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { buzz, strikeMoktak, wakeSound } from "@/lib/sound";
import { 목탁수, 식음, 적기, 치기, 한마디, type 결말, type 기록 } from "@/lib/invest-cool";
import "./cool.css";

type 쪽 = "buy" | "sell";
type 판 = { k: "cool"; want: 쪽; left: number } | { k: "done"; row: 기록; say: string };

/** 위에 뜨는 한 마디 — 주식쟁이 말투로. 친 만큼 말이 바뀐다 */
function 말(want: 쪽, left: number, 급함: boolean) {
  if (급함) return want === "buy" ? "급하면 체결 안 돼요. 호가창 말고 목탁 보세요." : "던지는 손이 빠르네요. 천천히.";
  if (want === "buy") {
    if (left === 0) return "바닥 다졌어요. 이 자리면 사도 됩니다. …아마도.";
    if (left > 90) return "풀매수 각이라고요? 일단 치세요.";
    if (left > 60) return "치는 동안 빠지고 있어요. 줍줍 자리 오는 중.";
    if (left > 30) return "벌써 이만큼 싸졌어요. 아까 샀으면 물렸죠?";
    return "거의 바닥. 조금만 더 기다려요.";
  }
  if (left === 0) return "목표가 찍었어요. 이제 팔아도 아깝지 않아요.";
  if (left > 90) return "패닉셀 하려고요? 일단 치세요.";
  if (left > 60) return "치는 동안 오르고 있어요. 개미 털기였네요.";
  if (left > 30) return "벌써 이만큼 올랐어요. 아까 팔았으면 배 아팠죠?";
  return "거의 고점. 조금만 더 버텨요.";
}

export default function InvestmentPage() {
  const [판, 판잡기] = useState<판>({ k: "cool", want: "buy", left: 목탁수 });
  const [hit, hitSet] = useState(0);
  const [급함, 급함잡기] = useState(false);
  const last = useRef(0);

  const 처음부터 = (want: 쪽) => { last.current = 0; 판잡기({ k: "cool", want, left: 목탁수 }); };

  const 끝내기 = (want: 쪽, did: 결말, left: number) => {
    const row: 기록 = { at: Date.now(), want, did, taps: 목탁수 - left };
    const n = 적기(row).length;
    판잡기({ k: "done", row, say: 한마디(want, did, n) });
    buzz(did === "kept" ? 18 : 8);
  };

  const 목탁 = () => {
    if (판.k !== "cool") return;
    wakeSound();
    const now = performance.now();
    const [left, ok] = 치기(판.left, now - last.current);
    if (!ok) { if (판.left > 0) { 급함잡기(true); window.setTimeout(() => 급함잡기(false), 900); } return; }
    last.current = now;
    strikeMoktak(0.8);
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

  const 쪽말 = { buy: { keep: "안 산다", go: "산다" }, sell: { keep: "안 판다", go: "판다" } };

  return (
    <HipRoom here="/tamjinchi" lanes={false} rail="/settings" scroll={false}>
      <section className="cool" aria-label="불심투자" style={판.k === "cool" ? ({ "--fill": 식음(판.left) } as React.CSSProperties) : undefined}>
        {/* 형: 「뒤로가기 버튼 하나 둬」 */}
        <header className="cool-head">
          <button type="button" className="cool-back" aria-label="뒤로" onClick={() => history.back()}>‹</button>
          <h1>불심투자</h1>
        </header>

        {판.k === "cool" && (
          <>
            {/* 형: 「산다 안 산다를 넘나들게, 그러면서 위도 바뀌고」 */}
            <div className="cool-mode" role="tablist" aria-label="산다 판다">
              {(["buy", "sell"] as 쪽[]).map((w) => (
                <button key={w} type="button" role="tab" aria-selected={판.want === w} className={`is-${w}`} onClick={() => 판잡기({ ...판, want: w })}>{쪽말[w].go}</button>
              ))}
            </div>
            <p className={`cool-say${급함 ? " is-hurry" : ""}`} role="status">{말(판.want, 판.left, 급함)}</p>

            <div className="cool-therm">
              <div className={`cool-candle is-${판.want}`} aria-hidden><span className="cool-wick" /><span className="cool-body" /></div>
              <div className="cool-side">
                <div className={`cool-price is-${판.want}`} aria-label="값의 움직임">
                  {판.want === "buy" ? "▼" : "▲"} {((목탁수 - 판.left) / 10).toFixed(1)}%
                  <small>{판.want === "buy" ? "싸졌어요" : "올랐어요"} · 남은 목탁 {판.left}</small>
                </div>
                {/* 형: 「목탁 가운데로 더 크게, 칠 때 효과 더」 — 눌리고, 물결이 퍼지고, 값이 한 칸 튄다 */}
                <button type="button" className={`cool-mok${판.left === 0 ? " is-done" : ""}`} aria-label="목탁 치기" onPointerDown={(e) => { if (e.isPrimary) { e.preventDefault(); 목탁(); } }} onContextMenu={(e) => e.preventDefault()}>
                  {hit > 0 && <span key={hit} className="cool-hit" aria-hidden><i /><b className={`is-${판.want}`}>{판.want === "buy" ? "▼0.1%" : "▲0.1%"}</b></span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={`m${hit}`} className={hit > 0 ? "is-struck" : undefined} src="/obj/moktak-carved-fish-v1.webp" alt="" draggable={false} />
                </button>
              </div>
            </div>
            <div className="cool-acts">
              <button type="button" className="cool-keep" onClick={() => 끝내기(판.want, "kept", 판.left)}>{쪽말[판.want].keep}</button>
              <button type="button" className="cool-do" disabled={판.left > 0} onClick={() => 끝내기(판.want, "did", 판.left)}>{쪽말[판.want].go}</button>
            </div>
          </>
        )}

        {판.k === "done" && (
          <>
            <p className="cool-say" role="status">{판.say}</p>
            {/* 형: 「공유하기 기능 넣고 — 멘트랑 링크랑 해서」 */}
            <div className="cool-again">
              <button type="button" onClick={() => 처음부터(판.row.want === "sell" ? "sell" : "buy")}>다시</button>
              <button type="button" className="cool-share" onClick={() => 공유(판.say)}>공유하기</button>
            </div>
          </>
        )}
      </section>
    </HipRoom>
  );
}
