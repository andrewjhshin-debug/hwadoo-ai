"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_INVESTMENT_RULES, INVESTMENT_RULES_KEY, INVESTMENT_SCENARIOS, investmentReview, normalizeInvestmentRules } from "@/lib/investment-practice";
import { type Poison, type TamjinchiBook } from "@/lib/tamjinchi";
import { DancheongColumn, InvestmentBloom, InvestmentMoodIcon, type DancheongTone } from "./InvestmentDancheong";

const TONES: DancheongTone[] = ["jade", "coral", "gold"];
const ROUND = [
  { label: "조급", steps: ["마음", "원칙", "한숨"] },
  { label: "분노", steps: ["마음", "구분", "한숨"] },
  { label: "흔들", steps: ["사실", "물음", "이유"] },
  { label: "후회", steps: ["그때", "지금", "다음"] },
];

export default function InvestmentPractice({ book, onPause, onRecord }: { book: TamjinchiBook | null; onPause: () => void; onRecord: (poison: Poison, text: string) => boolean }) {
  const [chosen, setChosen] = useState(0), [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [rules, setRules] = useState(DEFAULT_INVESTMENT_RULES), [status, setStatus] = useState("");
  const [now, setNow] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const [stamped, setStamped] = useState(false);
  const savedRef = useRef(false);
  useEffect(() => { const timer = window.setTimeout(() => { setNow(Date.now()); try { setRules(normalizeInvestmentRules(JSON.parse(localStorage.getItem(INVESTMENT_RULES_KEY) ?? "null"))); } catch { /* Defaults preserve use without storage. */ } }, 0); return () => clearTimeout(timer); }, []);
  const scenario = INVESTMENT_SCENARIOS[chosen], review = investmentReview(book, now);
  const completed = checks.every(Boolean);
  const count = checks.filter(Boolean).length;
  const begin = (index: number) => {
    setChosen(index); setChecks([false, false, false]); setFocused(null);
    setStamped(false); setStatus(""); savedRef.current = false;
  };
  const record = () => {
    if (!completed || savedRef.current) return;
    savedRef.current = true;
    const saved = onRecord(scenario.poison, `${scenario.label}. ${scenario.checks.join(". ")}.`);
    if (saved) { setStamped(true); setStatus("남겼다, 툭."); setNow(Date.now()); }
    else { savedRef.current = false; setStatus("저장 실패 · 다시 눌러요"); }
  };
  return <div className="investment-practice">
    <div className="investment-scenarios" aria-label="지금의 마음">{INVESTMENT_SCENARIOS.map((s, i) => <button type="button" key={s.id} aria-label={s.label} aria-pressed={chosen === i} onClick={() => begin(i)}><InvestmentMoodIcon kind={s.id} /><span>{ROUND[i].label}</span></button>)}</div>
    <section className={`investment-play${completed ? " is-complete" : ""}${stamped ? " is-recorded" : ""}`} aria-label="세 번 눌러 마음 점검하기">
      <div className="investment-play-head"><div><h2>{stamped ? "한 판, 비움." : completed ? "준비 끝." : "세 번, 툭."}</h2><span className="investment-play-count" aria-label={`${count}개 점검 완료`}>{count}<i>/3</i></span></div><InvestmentBloom lit={checks} stamped={stamped} /></div>
      <div className="investment-columns">{scenario.checks.map((label, i) => <button type="button" className={`investment-column${checks[i] ? " is-checked" : ""}`} key={`${scenario.id}-${i}`} aria-label={label} aria-pressed={checks[i]} disabled={stamped} onClick={() => {
        setChecks(values => values.map((value, index) => index === i ? !value : value)); setFocused(i); setStatus("");
      }}><DancheongColumn filled={checks[i]} tone={TONES[i]} /><span className="investment-column-caption">{ROUND[chosen].steps[i]}<b aria-hidden="true">{checks[i] ? "✓" : "+"}</b></span></button>)}</div>
      <p className="investment-check-caption" aria-live="polite">{stamped ? "다음 마음도, 가볍게." : focused === null ? "막대를 눌러 하나씩 확인" : scenario.checks[focused]}</p>
      {completed && <div className="investment-petal-burst" key={stamped ? "saved" : "ready"} aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ "--petal-angle": `${i * 60}deg` } as CSSProperties} />)}</div>}
    </section>
    <div className="investment-actions"><button type="button" onClick={onPause}><span aria-hidden="true">◌</span> 108초 한숨</button><button type="button" disabled={!completed} onClick={stamped ? () => begin((chosen + 1) % INVESTMENT_SCENARIOS.length) : record}>{stamped ? "한 판 더 ↗" : "비움 남기기"}</button></div>
    {status && <p role="status" className="investment-status">{status}</p>}
    <details className="investment-rules"><summary>내 원칙 <span>3</span></summary><div>{rules.map((rule, i) => <label key={i}><span>{i + 1}</span><input aria-label={`나의 원칙 ${i + 1}`} value={rule} maxLength={80} onChange={e => setRules(values => values.map((v, j) => j === i ? e.target.value : v))} /></label>)}<button type="button" onClick={() => { try { localStorage.setItem(INVESTMENT_RULES_KEY, JSON.stringify(normalizeInvestmentRules(rules))); setStatus("원칙 저장했어요."); } catch { setStatus("저장 실패 · 원칙을 복사해 둬요"); } }}>저장</button></div></details>
    <section className="investment-review" aria-label="최근 7일 돌아보기"><small>7일</small><span><b>{review.count}</b> 기록</span><span><b>{review.held}</b> 멈춤</span></section>
    <p className="investment-local">이 기기에만 저장</p>
  </div>;
}
