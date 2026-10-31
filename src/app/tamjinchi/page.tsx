"use client";

// ─────────────────────────────────────────────────────────────
// 불심투자 — 삼독 체온계 + 참회록.
//
// 형: 「불심투자 니 식대로 해봐. 재밌고 우습고 실소 나오고 근데 이게 맞고」
//
// 들어오면 두두가 「뭐 하려고요?」 묻는다. 사고 싶다 → 貪 체온계가 끓고
// 「산다」 단추는 땀 흘리며 안 눌린다. 목탁을 108번 치면 식는다 —
// 급하게 치면 안 쳐진다. 다 식고도 사겠다면 산다. 다만 적는다.
// 셋 이상 쌓이면 업보 유형이 뜬다(장 마감 5분 전 귀신 …).
// 셈은 lib/invest-cool.ts, 옛 판단 기록은 /tamjinchi/records 에 그대로.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import { buzz, strikeMoktak, wakeSound } from "@/lib/sound";
import { loadMe } from "@/lib/me";
import { loadMerit, stageOf } from "@/lib/merit";
import { 독, 목탁수, 식음, 업보, 욕심말, 읽기, 적기, 치기, 한마디, type 결말, type 기록, type 욕심 } from "@/lib/invest-cool";
import "./cool.css";

type 판 = { k: "pick" } | { k: "cool"; want: 욕심; left: number } | { k: "done"; row: 기록; say: string };

/** 끓음(분홍)→금→옥빛 — 식을수록 */
function 액체색(t: number) {
  if (t < 0.5) { const u = t / 0.5; return `color-mix(in srgb, #f2789f ${(1 - u) * 100}%, #dda01c)`; }
  const u = (t - 0.5) / 0.5; return `color-mix(in srgb, #dda01c ${(1 - u) * 100}%, #5fae8f)`;
}

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
    if (want === "look") return 끝내기(want, "kept", 0);
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
  const kept = rows.filter((r) => r.did === "kept").length;
  const 총목탁 = rows.reduce((a, r) => a + r.taps, 0);

  return (
    <HipRoom here="/tamjinchi" lanes={false} rail="/settings" scroll={false}>
      <section className="cool" aria-label="불심투자" style={판.k === "cool" ? ({ "--heat": 1 - 식음(판.left), "--liq": 액체색(식음(판.left)) } as React.CSSProperties) : undefined}>
        <header className="cool-head"><h1>불심투자</h1><Link href="/tamjinchi/records">이전 기록</Link></header>

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
            {(Object.keys(욕심말) as 욕심[]).map((w) => (
              <button key={w} type="button" onClick={() => 고르기(w)}>{욕심말[w]}<b>{독[w]}</b></button>
            ))}
          </div>
        )}

        {판.k === "cool" && (
          <>
            <div className="cool-therm">
              <div className={`cool-tube${판.left > 80 ? " is-boil" : ""}`} aria-hidden>
                <span className="cool-liq" />
                <span className="cool-bulb">{독[판.want]}</span>
              </div>
              <div className="cool-side">
                <div className="cool-count" aria-label={`목탁 ${판.left}번 남음`}>{판.left}<small>번</small></div>
                <button type="button" className={`cool-mok${hit ? " is-hit" : ""}${판.left === 0 ? " is-done" : ""}`} aria-label="목탁 치기" onPointerDown={(e) => { if (e.isPrimary) { e.preventDefault(); 목탁(); } }} onContextMenu={(e) => e.preventDefault()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/obj/moktak.png" alt="" draggable={false} />
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
            <div className="cool-karma">
              <div className="cool-karma-row"><b>{업 ? 업.name : "아직 모름"}</b><span>{rows.length}번째</span></div>
              <p className="cool-karma-say">{업 ? 업.say : `${3 - rows.length}번 더 오면 업보 유형이 나와요.`}</p>
              <div className="cool-nums">
                <div><b>{kept}</b><span>참음</span></div>
                <div><b>{rows.length - kept}</b><span>그래도 함</span></div>
                <div><b>{총목탁}</b><span>식힌 목탁</span></div>
              </div>
            </div>
            <div className="cool-again">
              <button type="button" onClick={() => 판잡기({ k: "pick" })}>다시</button>
              <button type="button" className="cool-share" aria-label="업보 공유" onClick={async () => {
                const text = 업 ? `내 투자 업보: ${업.name} — ${업.say}` : `불심투자 ${rows.length}번째. 참음 ${kept}.`;
                try { if (navigator.share) await navigator.share({ title: "화두 불심투자", text, url: `${location.origin}/tamjinchi` }); else await navigator.clipboard.writeText(`${text}\n${location.origin}/tamjinchi`); } catch { /* 취소 */ }
              }}>↗</button>
            </div>
          </>
        )}
      </section>
    </HipRoom>
  );
}
