"use client";
import { useEffect, useState } from "react";
import { DEFAULT_INVESTMENT_RULES, INVESTMENT_RULES_KEY, INVESTMENT_SCENARIOS, investmentReview, normalizeInvestmentRules } from "@/lib/investment-practice";
import { POISON_BY_ID, type Poison, type TamjinchiBook } from "@/lib/tamjinchi";
export default function InvestmentPractice({ book, onPause, onRecord }: { book: TamjinchiBook | null; onPause: () => void; onRecord: (poison: Poison, text: string) => boolean }) {
  const [chosen, setChosen] = useState(0), [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [rules, setRules] = useState(DEFAULT_INVESTMENT_RULES), [status, setStatus] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => { const timer = window.setTimeout(() => { setNow(Date.now()); try { setRules(normalizeInvestmentRules(JSON.parse(localStorage.getItem(INVESTMENT_RULES_KEY) ?? "null"))); } catch { /* Defaults preserve use without storage. */ } }, 0); return () => clearTimeout(timer); }, []);
  const scenario = INVESTMENT_SCENARIOS[chosen], review = investmentReview(book, now);
  const completed = checks.every(Boolean);
  return <div className="investment-practice">
    <h2>지금 어떤 마음인가요?</h2>
    <div className="investment-scenarios">{INVESTMENT_SCENARIOS.map((s, i) => <button type="button" key={s.id} aria-pressed={chosen === i} onClick={() => { setChosen(i); setChecks([false, false, false]); setStatus(""); }}>{s.label}</button>)}</div>
    <p className="investment-question">{scenario.question}</p>
    <fieldset className="investment-checks"><legend>결정 전에 확인하기</legend>{scenario.checks.map((label, i) => <label key={label}><input type="checkbox" checked={checks[i]} onChange={e => setChecks(values => values.map((v, j) => j === i ? e.target.checked : v))} /><span>{label}</span></label>)}</fieldset>
    <div className="investment-actions"><button type="button" onClick={onPause}>108초 쉬기</button><button type="button" disabled={!completed} onClick={() => { const saved = onRecord(scenario.poison, `${scenario.label}. ${scenario.checks.join(". ")}.`); setChecks([false, false, false]); setStatus(saved ? "마음 점검을 참회록에 남겼어요." : "저장하지 못했어요. 기록을 따로 보관해 주세요."); setNow(Date.now()); }}>점검 기록</button></div>
    <details className="investment-rules"><summary>나의 원칙 3가지</summary><div>{rules.map((rule, i) => <label key={i}><span>원칙 {i + 1}</span><input value={rule} maxLength={80} onChange={e => setRules(values => values.map((v, j) => j === i ? e.target.value : v))} /></label>)}<button type="button" onClick={() => { try { localStorage.setItem(INVESTMENT_RULES_KEY, JSON.stringify(normalizeInvestmentRules(rules))); setStatus("이 기기에 원칙을 저장했어요."); } catch { setStatus("저장 공간을 사용할 수 없어요. 원칙을 따로 보관해 주세요."); } }}>원칙 저장</button></div></details>
    <section className="investment-review" aria-label="최근 7일 돌아보기"><h3>최근 7일</h3><p>{review.count ? `${review.count}번 기록했고, ${review.held}번 멈춰 돌아봤어요.` : "아직 기록이 없어요. 오늘의 마음부터 남겨 보세요."}</p>{review.dominant && <p>기록에 가장 자주 남긴 마음: {POISON_BY_ID[review.dominant].full}</p>}</section>
    <p className="investment-local">개인 기록은 이 브라우저에만 보관돼요. 종목 추천이나 매매 판단을 제공하지 않아요.</p>
    {status && <p role="status" className="investment-status">{status}</p>}
  </div>;
}
