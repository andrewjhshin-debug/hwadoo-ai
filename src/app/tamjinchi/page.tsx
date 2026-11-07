"use client";

// ─────────────────────────────────────────────────────────────
// 불심투자 — 삼독 체온계 + 참회록.
//
// 형: 「불심투자 니 식대로 해봐. 재밌고 우습고 실소 나오고 근데 이게 맞고」
//
// 들어오면 두두가 「뭐 하려고요?」 묻는다. 사고 싶다 → 貪 체온계가 끓고
// 「산다」 단추는 땀 흘리며 안 눌린다. 목탁을 108번 치면 식는다 —
// 급하게 치면 안 쳐진다. 다 식고도 사겠다면 산다. 다만 적는다.
// 셈은 lib/invest-cool.ts.
// 형: 「안 산다는 차트 봉처럼 — 눌릴수록 파란색으로 위에서 밑으로 음봉, 반대로 양봉, 한자는 지우고」
// 사고 싶다 = 파란 음봉이 위에서 내려온다 · 팔고 싶다 = 빨간 양봉이 밑에서 오른다.
// 「그냥 보기만」은 걷었다(형: 「없애, 산다 안 산다로 가자」).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { buzz, strikeMoktak, wakeSound } from "@/lib/sound";
import { loadMe } from "@/lib/me";
import { loadMerit, stageOf } from "@/lib/merit";
import { 목탁수, 식음, 업보, 욕심말, 읽기, 적기, 치기, 한마디, type 결말, type 기록, type 욕심 } from "@/lib/invest-cool";
import "./cool.css";

type 판 = { k: "pick" } | { k: "cool"; want: 욕심; left: number } | { k: "done"; row: 기록; say: string };

export default function InvestmentPage() {
  const [판, 판잡기] = useState<판>({ k: "pick" });
  const [rows, rowsSet] = useState<기록[]>([]);
  const [dudu, duduSet] = useState("/dudu/namu/0.png");
  const [hit, hitSet] = useState(false);
  const [급함, 급함잡기] = useState(false);
  const last = useRef(0);
  const taps = useRef(0);

  useEffect(() => {
    rowsSet(읽기());
    const face = loadMe()?.face ?? "namu";
    duduSet(`/dudu/${face}/${stageOf(loadMerit().total)}.png`);
  }, []);

  const 고르기 = (want: 욕심) => {
    wakeSound();
    taps.current = 0;
    판잡기({ k: "cool", want, left: 목탁수 });
  };

  const 끝내기 = (want: 욕심, did: 결말, n: number) => {
    const row: 기록 = { at: Date.now(), want, did, taps: n };
    const next = 적기(row);
    rowsSet(next);
    판잡기({ k: "done", row, say: 한마디(want, did, next.length) });
    buzz(did === "kept" ? 18 : 8);
  };

  const 목탁 = () => {
    if (판.k !== "cool") return;
    const now = performance.now();
    const [left, ok] = 치기(판.left, now - last.current);
    if (!ok) { if (판.left > 0) { 급함잡기(true); window.setTimeout(() => 급함잡기(false), 900); } return; }
    last.current = now;
    taps.current += 1;
    strikeMoktak(0.8);
    buzz(5);
    hitSet(true); window.setTimeout(() => hitSet(false), 70);
    판잡기({ ...판, left });
  };

  const 업 = 업보(rows);

  return (
    <HipRoom here="/tamjinchi" lanes={false} rail="/settings" scroll={false}>
      <section className="cool" aria-label="불심투자" style={판.k === "cool" ? ({ "--fill": 식음(판.left) } as React.CSSProperties) : undefined}>
        {/* 형: 「뒤로가기 버튼 하나 둬」 — 치던 중이면 고르기로, 고르기면 앞 화면으로. 「이전 기록」은 걷었다 */}
        <header className="cool-head">
          <button type="button" className="cool-back" aria-label="뒤로" onClick={() => (판.k === "pick" ? history.back() : 판잡기({ k: "pick" }))}>‹</button>
          <h1>불심투자</h1>
        </header>

        <div className="cool-dudu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dudu} alt="" onError={(e) => { const el = e.currentTarget; if (!el.src.endsWith("/dudu/0.png")) el.src = "/dudu/0.png"; }} />
          <p className={`cool-say${판.k === "cool" && !급함 ? " is-quiet" : ""}`} role="status">
            {판.k === "pick" && "뭐 하려고요?"}
            {판.k === "cool" && (급함 ? "급하면 안 쳐져요." : 판.left === 0 ? "…다 식었어요. 그래도요?" : 판.left > 90 ? "일단 치세요." : 판.left > 40 ? "아직 뜨거워요." : "거의 다 왔어요.")}
            {판.k === "done" && 판.say}
          </p>
        </div>

        {판.k === "pick" && (
          <div className="cool-pick">
            {(["buy", "sell"] as 욕심[]).map((w) => (
              <button key={w} type="button" onClick={() => 고르기(w)}>{욕심말[w]}</button>
            ))}
          </div>
        )}

        {판.k === "cool" && (
          <>
            <div className="cool-therm">
              <div className={`cool-candle is-${판.want}`} aria-hidden><span className="cool-wick" /><span className="cool-body" /></div>
              <div className="cool-side">
                <div className="cool-count" aria-label={`목탁 ${판.left}번 남음`}>{판.left}<small>번</small></div>
                <button type="button" className={`cool-mok${hit ? " is-hit" : ""}${판.left === 0 ? " is-done" : ""}`} aria-label="목탁 치기" onPointerDown={(e) => { if (e.isPrimary) { e.preventDefault(); 목탁(); } }} onContextMenu={(e) => e.preventDefault()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/obj/moktak-carved-fish-v1.webp" alt="" draggable={false} />
                </button>
              </div>
            </div>
            <div className="cool-acts">
              <button type="button" className="cool-keep" onClick={() => 끝내기(판.want, "kept", taps.current)}>{판.want === "buy" ? "안 산다" : "안 판다"}</button>
              <button type="button" className="cool-do" disabled={판.left > 0} onClick={() => 끝내기(판.want, "did", taps.current)}>{판.want === "buy" ? "산다" : "판다"}</button>
            </div>
          </>
        )}

        {판.k === "done" && (
          <>
            {/* 참음·그래도 함·식힌 목탁 숫자 칸은 걷었다(형: 「이딴 거 없애」). 셈은 공유 글에만 남는다 */}
            <div className="cool-again">
              <button type="button" onClick={() => 판잡기({ k: "pick" })}>다시</button>
              <button type="button" className="cool-share" aria-label="업보 공유" onClick={async () => {
                const text = `불심투자 — 참음 ${업.kept} · 그래도 함 ${업.did} · 식힌 목탁 ${업.taps}`;
                try { if (navigator.share) await navigator.share({ title: "화두 불심투자", text, url: `${location.origin}/tamjinchi` }); else await navigator.clipboard.writeText(`${text}\n${location.origin}/tamjinchi`); } catch { /* 취소 */ }
              }}>↗</button>
            </div>
          </>
        )}
      </section>
    </HipRoom>
  );
}
