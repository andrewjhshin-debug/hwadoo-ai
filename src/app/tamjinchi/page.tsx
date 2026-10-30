"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import { DancheongColumn, InvestmentBloom, InvestmentChartMark } from "@/components/InvestmentDancheong";
import { buzz, strikeBell, wakeSound } from "@/lib/sound";
import { THREE_POISONS, beginPractice, cancelPractice, chargeAmount, newPoisonPractice, nextPoison, practiceTarget, readPracticeBest, releasePractice, savePracticeBest, type PoisonPractice } from "@/lib/poison-practice";
import "./practice.css";

export default function InvestmentPage() {
  const [game, setGame] = useState(() => newPoisonPractice(13));
  const [slow, setSlow] = useState(false), [best, setBest] = useState(0), [message, setMessage] = useState("");
  const current = useRef(game), slowMode = useRef(false), started = useRef<number | null>(null), frame = useRef(0);
  const surface = useRef<HTMLElement>(null), pointer = useRef<number | null>(null), key = useRef<string | null>(null);
  const commit = useCallback((value: PoisonPractice) => { current.current = value; setGame(value); }, []);
  const paint = useCallback((amount: number) => { surface.current?.style.setProperty("--charge", `${amount * 100}%`); }, []);
  const stop = useCallback(() => { cancelAnimationFrame(frame.current); frame.current = 0; started.current = null; pointer.current = null; key.current = null; paint(0); }, [paint]);
  const cancel = useCallback(() => { stop(); commit(cancelPractice(current.current)); }, [commit, stop]);
  const release = useCallback(() => {
    if (started.current === null || current.current.phase !== "holding") return;
    const next = releasePractice(current.current, performance.now() - started.current, slowMode.current);
    stop(); commit(next);
    if (next.phase === "hit" || next.phase === "finished") { strikeBell(.17, next.stage); buzz(12); }
    else buzz(6);
  }, [commit, stop]);
  const begin = useCallback(() => {
    if (current.current.phase !== "ready" || document.hidden) return;
    wakeSound(); setMessage(""); commit(beginPractice(current.current)); started.current = performance.now();
    const animate = () => {
      if (started.current === null) return;
      const amount = chargeAmount(performance.now() - started.current, practiceTarget(current.current, slowMode.current).duration);
      paint(amount);
      if (amount >= 1) { release(); return; }
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  }, [commit, paint, release]);
  useEffect(() => {
    const t = setTimeout(() => {
      const preferSlow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      slowMode.current = preferSlow; setSlow(preferSlow);
      try { setBest(readPracticeBest(localStorage)); } catch { setMessage("이전 점수를 읽지 못했어요."); }
    }, 0);
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(t); cancelAnimationFrame(frame.current); started.current = null; window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", visibility); };
  }, [cancel]);
  useEffect(() => {
    if (game.phase !== "hit") return;
    const t = setTimeout(() => { paint(0); commit(nextPoison(current.current)); }, 950);
    return () => clearTimeout(t);
  }, [game.phase, commit, paint]);
  useEffect(() => {
    if (game.phase !== "finished") return;
    const t = setTimeout(() => {
      try { setBest(savePracticeBest(game.points.reduce((a, b) => a + b, 0), localStorage)); }
      catch { setMessage("점수를 저장하지 못했어요."); }
    }, 0);
    return () => clearTimeout(t);
  }, [game]);
  const target = practiceTarget(game, slow), active = THREE_POISONS[game.stage], finished = game.phase === "finished";
  const points = game.points.reduce((a, b) => a + b, 0), cleared = game.points.filter(Boolean).length;
  return <HipRoom here="/tamjinchi" lanes={false} rail="/settings" scroll={false}>
    <section ref={surface} className={`poison-play${finished ? " is-finished" : ""}`} aria-label="불심투자 탐진치 놀이">
      <header className="pp-head"><InvestmentChartMark /><h1>불심투자</h1><details className="pp-help"><summary aria-label="놀이 도움말">?</summary><div><p>빛에 닿으면 놓아요.<br />놀이 점수 · 공덕 차감 없음</p><button type="button" aria-pressed={slow} onClick={() => { cancel(); slowMode.current = !slow; setSlow(!slow); }}>천천히 {slow ? "켜짐" : "켜기"}</button></div></details><Link href="/tamjinchi/records">이전 기록</Link></header>
      <div className="pp-round"><span>탐 · 진 · 치</span><span>{best > 0 ? `최고 ${best}` : ""}</span></div>
      <div className="pp-title"><h2>{finished ? "삼독, 비움." : `${active.name}을 비워요`}</h2><span>{cleared}<small>/3</small></span></div>
      <div className="pp-columns" aria-label="탐욕은 보시로, 성냄은 자비로, 어리석음은 지혜로">
        {THREE_POISONS.map((poison, i) => <div key={poison.id} className={`pp-column${game.stage === i && !finished ? " is-active" : ""}${game.points[i] ? " is-clear" : ""}`}>
          <span className="pp-hanja" aria-hidden="true">{game.points[i] ? poison.clear : poison.hanja}</span>
          <div className="pp-column-art"><DancheongColumn filled={false} tone={poison.tone} /><div className="pp-column-light"><DancheongColumn filled tone={poison.tone} /></div></div>
          <span className="pp-column-name">{game.points[i] ? poison.remedy : poison.name}</span>
        </div>)}
      </div>
      {finished ? <div className="pp-finish"><InvestmentBloom lit={[true, true, true]} stamped /><strong>{points}<small>점</small></strong></div> : <div className="pp-timing">
        <div className="pp-timing-label"><span>{active.name}</span><span>{active.remedy} →</span></div>
        <div className="pp-meter" aria-label="빛나는 구간에서 놓기"><span className="pp-meter-zone" style={{ left: `${target.low * 100}%`, width: `${(target.high - target.low) * 100}%` }} /><span className="pp-meter-fill" /><i className="pp-meter-needle" /></div>
      </div>}
      <div className="pp-actions">
        {finished ? <div className="pp-result-buttons"><button type="button" className="pp-main" onClick={() => {
          stop(); setMessage(""); commit(newPoisonPractice(crypto.getRandomValues(new Uint32Array(1))[0], game.lap + 1));
        }}>한 판 더 <span>↗</span></button><button type="button" className="pp-share" aria-label="삼독 비움 점수 공유" onClick={async () => {
          const text = `탐·진·치를 비웠다. 화두 불심투자 ${points}점!`;
          try { if (navigator.share) await navigator.share({ title: "화두 불심투자", text, url: `${window.location.origin}/tamjinchi` }); else { await navigator.clipboard.writeText(`${text}\n${window.location.origin}/tamjinchi`); setMessage("복사했어요."); } }
          catch (e) { if ((e as Error).name !== "AbortError") setMessage("공유하지 못했어요."); }
        }}>↗</button></div> : <button type="button" className={`pp-main pp-hold${game.phase === "holding" ? " is-holding" : ""}`} aria-pressed={game.phase === "holding"} disabled={game.phase === "hit"}
          onPointerDown={e => { if (!e.isPrimary || e.button !== 0 || current.current.phase !== "ready") return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); begin(); pointer.current = e.pointerId; }}
          onPointerUp={e => { if (pointer.current === e.pointerId) release(); }}
          onPointerCancel={cancel} onLostPointerCapture={() => { if (started.current !== null) cancel(); }}
          onKeyDown={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat && current.current.phase === "ready") { key.current = e.key; begin(); } } }}
          onKeyUp={e => { if (e.key === key.current) { e.preventDefault(); release(); } }}
          onClick={e => { if (e.detail === 0 && key.current === null) { if (current.current.phase === "holding") release(); else begin(); } }}
          onContextMenu={e => e.preventDefault()} onBlur={cancel}>
          {game.phase === "hit" ? `${active.remedy} ✦` : game.phase === "holding" ? "빛에서 놓아요" : "꾹 눌러요"}<span aria-hidden="true">{game.phase === "holding" ? "◌" : "↓"}</span>
        </button>}
        <p className="pp-feedback" role="status">{message || (finished ? points === 108 ? "백팔, 완벽한 타이밍." : "보시 · 자비 · 지혜" : game.phase === "hit" ? `${game.points[game.stage]}점` : game.feedback === "early" ? "조금만 더." : game.feedback === "late" ? "조금 먼저." : "")}</p>
      </div>
    </section>
  </HipRoom>;
}
