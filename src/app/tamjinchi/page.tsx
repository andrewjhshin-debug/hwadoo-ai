"use client";
import { useEffect, useRef, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { useConfirm } from "@/components/Confirm";
import { InvestmentChartMark } from "@/components/InvestmentDancheong";
import { loadTamjinchi, DEED_LABEL, type TamjinchiBook } from "@/lib/tamjinchi";
import { DEFAULT_INVESTMENT_RULES, INVESTMENT_RULES_KEY, normalizeInvestmentRules } from "@/lib/investment-practice";
import { ACTIONS, ACTUAL_ACTIONS, MOODS, DEFAULT_DECISION_DRAFT, DECISION_DRAFT_KEY, EMPTY_DECISION_BOOK, addDecision, decisionStats, makeDecision, mergeDecisionBackup, normalizeDecisionDraft, readDecisionBook, reviewDecision, writeDecisionBook, type Decision, type DecisionAction, type DecisionBook, type DecisionDraft, type DecisionReview } from "@/lib/investment-decisions";
import "./investment.css";

type View = "before" | "review" | "pattern";
const date = (at: number) => new Date(at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
export default function InvestmentPage() {
  const ask = useConfirm();
  const [view, setView] = useState<View>("before"), [book, setBook] = useState<DecisionBook>(EMPTY_DECISION_BOOK);
  const [ready, setReady] = useState(false), [message, setMessage] = useState(""), [now, setNow] = useState(0);
  const [rules, setRules] = useState(DEFAULT_INVESTMENT_RULES), [legacy, setLegacy] = useState<TamjinchiBook | null>(null), [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<DecisionDraft>(DEFAULT_DECISION_DRAFT);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const load = () => {
      setNow(Date.now()); setLegacy(loadTamjinchi());
      try { setBook(readDecisionBook()); setReady(true); } catch (e) { setMessage((e as Error).message); }
    };
    const timer = window.setTimeout(() => {
      load();
      try { setRules(normalizeInvestmentRules(JSON.parse(localStorage.getItem(INVESTMENT_RULES_KEY) ?? "null"))); setDraft(normalizeDecisionDraft(JSON.parse(localStorage.getItem(DECISION_DRAFT_KEY) ?? "null"))); } catch { /* Empty or invalid draft never changes saved records. */ }
    }, 0);
    const refreshTime = window.setInterval(() => setNow(Date.now()), 30000);
    window.addEventListener("storage", load);
    return () => { clearTimeout(timer); clearInterval(refreshTime); window.removeEventListener("storage", load); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => { try { localStorage.setItem(DECISION_DRAFT_KEY, JSON.stringify(draft)); } catch { setMessage("초안을 자동 저장하지 못했어요. 입력한 내용을 따로 보관해 주세요."); } }, 400);
    return () => clearTimeout(timer);
  }, [draft, ready]);
  const commit = (change: (current: DecisionBook) => DecisionBook) => {
    try { setBook(writeDecisionBook(change(readDecisionBook()))); setNow(Date.now()); return true; }
    catch (e) { setMessage(e instanceof Error ? e.message : "저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요."); return false; }
  };
  const stats = decisionStats(book, now);
  return <HipRoom here="/tamjinchi" lanes={false} rail="/settings">
    <section className="mind-invest" aria-label="불심투자">
      <header className="mind-invest-head"><InvestmentChartMark /><div><h1>불심투자</h1><p>시세보다 먼저, 내 판단을 봅니다.</p></div></header>
      <nav className="mind-invest-tabs" aria-label="불심투자 기능">{([["before", "판단 전"], ["review", "다시보기"], ["pattern", "내 패턴"]] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setMessage(""); }}>{label}{id === "review" && stats.due > 0 && <span aria-label={`${stats.due}건 돌아볼 때`}>{stats.due}</span>}</button>)}</nav>
      {message && <p className="mind-invest-message" role="status">{message}</p>}
      {view === "before" && <>
        {stats.due > 0 && <button type="button" className="mind-invest-due" onClick={() => setView("review")}>돌아볼 때가 된 판단 {stats.due}건 <span>열어보기 →</span></button>}
        <DecisionComposer draft={draft} onChange={setDraft} ready={ready} rules={rules} onSave={() => {
          try { const record = makeDecision(draft, rules); if (commit(current => addDecision(current, record))) { setDraft({ ...DEFAULT_DECISION_DRAFT }); try { localStorage.setItem(DECISION_DRAFT_KEY, JSON.stringify(DEFAULT_DECISION_DRAFT)); } catch { /* Saved record is already durable; deferred draft saving will report failures. */ } setOpen(record.id); setView("review"); setMessage("판단을 저장했어요. 나중에 실제 행동과 비교해 보세요."); } }
          catch (e) { setMessage((e as Error).message); }
        }} />
      </>}
      {view === "review" && <DecisionShelf book={book} now={now} open={open} setOpen={setOpen} onReview={(id, review) => { if (commit(current => reviewDecision(current, id, review))) { setMessage("처음 판단은 그대로 두고, 돌아본 내용을 붙였어요."); setOpen(null); } }} onDelete={async id => {
        if (await ask("이 판단 기록을 지울까요?", "이 브라우저에서 삭제되며 되돌릴 수 없어요. 필요하면 먼저 백업해 주세요.")) if (commit(current => ({ ...current, records: current.records.filter(r => r.id !== id) }))) setMessage("기록을 삭제했어요.");
      }} />}
      {view === "pattern" && <>
        <DecisionPatterns book={book} now={now} />
        <details className="mind-invest-rules"><summary>내가 지킬 원칙 3가지</summary>{rules.map((rule, i) => <label key={i}><span>원칙 {i + 1}</span><input maxLength={80} value={rule} onChange={e => setRules(items => items.map((s, j) => j === i ? e.target.value : s))} /></label>)}<button type="button" className="mind-invest-secondary" onClick={() => { try { localStorage.setItem(INVESTMENT_RULES_KEY, JSON.stringify(normalizeInvestmentRules(rules))); setMessage("원칙을 저장했어요. 다음 판단부터 새 원칙이 붙어요."); } catch { setMessage("원칙을 저장하지 못했어요."); } }}>원칙 저장</button></details>
        <div className="mind-invest-backup"><button type="button" className="mind-invest-secondary" disabled={!ready} onClick={() => {
          try { const file = new Blob([JSON.stringify(readDecisionBook(), null, 2)], { type: "application/json" }); const url = URL.createObjectURL(file), a = document.createElement("a"); a.href = url; a.download = "hwadu-investment-decisions.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
          catch { setMessage("백업 파일을 만들지 못했어요."); }
        }}>새 기록 백업</button><button type="button" className="mind-invest-secondary" onClick={() => importInput.current?.click()}>백업 불러오기</button><input ref={importInput} type="file" accept="application/json,.json" hidden aria-label="불심투자 백업 파일" onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
          if (file.size > 2 * 1024 * 1024) { setMessage("백업 파일은 2MB 이하만 불러올 수 있어요."); return; }
          try { const data: unknown = JSON.parse(await file.text()); if (commit(current => mergeDecisionBackup(current, data))) setMessage("백업을 합쳤어요. 같은 기록은 현재 내용을 유지했어요."); }
          catch { setMessage("불심투자 새 기록 백업 파일인지 확인해 주세요. 기존 기록은 바꾸지 않았어요."); }
        }} /></div>
        <details className="mind-invest-legacy"><summary>이전 참회록 {legacy?.entries.length ?? 0}건</summary>{legacy?.entries.length ? legacy.entries.map(entry => <article key={entry.id}><small>{date(entry.at)} · {DEED_LABEL[entry.deed]}</small><p>{entry.text}</p></article>) : <p>이 브라우저에 남아 있는 이전 기록이 없어요.</p>}</details>
      </>}
      <footer className="mind-invest-privacy">이 브라우저에만 저장되며 자동 동기화되지 않아요. 새 기록 백업에는 이전 참회록이 포함되지 않아요. 종목 추천·수익 예측·매매 신호는 제공하지 않아요.</footer>
    </section>
  </HipRoom>;
}

function DecisionComposer({ draft, onChange, ready, rules, onSave }: { draft: DecisionDraft; onChange: (draft: DecisionDraft) => void; ready: boolean; rules: string[]; onSave: () => void }) {
  const [now, setNow] = useState(0);
  useEffect(() => { if (!draft.pauseUntil) return; const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, [draft.pauseUntil]);
  const remaining = draft.pauseUntil ? Math.max(0, Math.ceil((draft.pauseUntil - now) / 1000)) : 0;
  const update = (patch: Partial<DecisionDraft>) => onChange({ ...draft, ...patch });
  return <form className="mind-invest-form" onSubmit={e => { e.preventDefault(); onSave(); }}>
    <h2>이번 판단을 남겨 두세요.</h2><p className="mind-invest-help">수익을 맞히는 일지가 아니라, 그때의 나와 나중의 나를 비교하는 기록이에요.</p>
    <fieldset><legend>지금 하려는 행동</legend><div className="mind-invest-choices">{(Object.keys(ACTIONS) as DecisionAction[]).map(id => <button type="button" key={id} aria-pressed={draft.action === id} onClick={() => update({ action: id })}>{ACTIONS[id]}</button>)}</div></fieldset>
    <label>무엇에 관한 판단인가요? <small>선택</small><input value={draft.name} maxLength={60} placeholder="내가 알아볼 이름이나 별칭" onChange={e => update({ name: e.target.value })} /></label>
    <fieldset><legend>지금 마음에 가까운 것</legend><div className="mind-invest-moods">{(Object.keys(MOODS) as (keyof typeof MOODS)[]).map(id => <button key={id} type="button" aria-pressed={draft.mood === id} onClick={() => update({ mood: id })}>{MOODS[id]}</button>)}</div></fieldset>
    <label className="mind-invest-range">충동 강도 <strong>{draft.intensity} / 10</strong><input type="range" min={0} max={10} step={1} value={draft.intensity} onChange={e => update({ intensity: Number(e.target.value) })} /><small>내가 느끼는 강도예요. 진단이나 투자 점수가 아니에요.</small></label>
    {draft.intensity >= 7 && <p className="mind-invest-callout">충동을 높게 기록했어요. 108초 쉬며 아래 이유를 다시 읽어 볼 수 있어요.</p>}
    <label>왜 지금 이 판단을 하나요?<textarea required maxLength={500} rows={3} value={draft.reason} placeholder="남의 결론 대신, 내 이유를 한두 문장으로" onChange={e => update({ reason: e.target.value })} /></label>
    <label>어떤 사실이 확인되면 내 생각을 다시 볼 건가요?<textarea required maxLength={500} rows={2} value={draft.invalidation} placeholder="처음 생각과 반대되는 근거를 구체적으로" onChange={e => update({ invalidation: e.target.value })} /></label>
    <details className="mind-invest-snapshot"><summary>이 판단에 함께 남길 나의 원칙</summary><ul>{rules.map((rule, i) => <li key={i}>{rule || "아직 적지 않은 원칙"}</li>)}</ul><p>‘내 패턴’에서 바꿀 수 있어요. 저장된 판단의 원칙은 바뀌지 않아요.</p></details>
    <label>언제 다시 볼까요?<select value={draft.delay} onChange={e => update({ delay: Number(e.target.value) })}><option value={3600000}>1시간 뒤</option><option value={86400000}>내일 이 시간</option><option value={604800000}>7일 뒤</option></select><small>앱이 자동으로 알림을 보내지는 않아요. 다시 들어오면 돌아볼 기록을 보여줘요.</small></label>
    <div className="mind-invest-pause"><button type="button" className="mind-invest-secondary" disabled={!!draft.pauseUntil && remaining > 0} onClick={() => { const t = Date.now(); setNow(t); update({ pauseUntil: t + 108000 }); }}>{draft.pauseUntil ? remaining > 0 ? `${Math.min(108, remaining)}초 남음` : "108초 쉬기 완료" : "108초 쉬어 보기"}</button><span role="status">{draft.pauseUntil && remaining === 0 ? "이유를 다시 읽고, 지금의 판단을 저장해 보세요." : "쉬는 동안에도 기록을 고칠 수 있어요."}</span></div>
    <button type="submit" className="mind-invest-primary" disabled={!ready || !draft.reason.trim() || !draft.invalidation.trim()}>판단 저장</button>
  </form>;
}

function DecisionShelf({ book, now, open, setOpen, onReview, onDelete }: { book: DecisionBook; now: number; open: string | null; setOpen: (id: string | null) => void; onReview: (id: string, review: DecisionReview) => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const items = book.records.filter(r => filter === "all" || (filter === "done" ? !!r.review : !r.review)).sort((a, b) => Number(!b.review && b.revisitAt <= now) - Number(!a.review && a.revisitAt <= now) || b.at - a.at);
  return <section><h2>그때의 이유, 지금의 행동.</h2><div className="mind-invest-filter">{([["pending", "아직 안 돌아본"], ["done", "돌아본"], ["all", "전체"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
    {!items.length && <div className="mind-invest-empty"><p>{book.records.length ? "이 조건에 맞는 판단 기록이 없어요." : "먼저 판단을 하나 남겨 보세요."}</p><small>나중에 비교할 ‘그때의 이유’가 여기에 남아요.</small></div>}
    <div className="mind-invest-records">{items.map(r => <article key={r.id} className="mind-invest-record"><button type="button" className="mind-invest-record-toggle" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}><span><b>{r.name || "이름 없는 판단"}</b><small>{date(r.at)} · {ACTIONS[r.action]}</small></span><span>{r.review ? "돌아봄" : r.revisitAt <= now ? "지금 돌아보기" : `${date(r.revisitAt)} 다시보기`}</span></button>{open === r.id && <div className="mind-invest-record-body"><dl><dt>처음 이유</dt><dd>{r.reason}</dd><dt>다시 볼 기준</dt><dd>{r.invalidation}</dd><dt>그때 마음</dt><dd>{MOODS[r.mood]} · 충동 {r.intensity}/10{r.pauseSeconds ? " · 108초 쉼" : ""}</dd><dt>그때의 원칙</dt><dd>{r.principles.filter(Boolean).join(" / ") || "남긴 원칙이 없어요."}</dd></dl>{r.review ? <div className="mind-invest-reviewed"><h3>돌아본 내용</h3><p>{ACTUAL_ACTIONS[r.review.action]} · 원칙 {r.review.rules === "yes" ? "지켰다" : r.review.rules === "partly" ? "일부 지켰다" : "못 지켰다"} · 지금 충동 {r.review.intensity}/10</p><p>{r.review.note || "덧붙인 내용이 없어요."}</p><small>{date(r.review.at)} 기록</small></div> : <ReviewForm record={r} onSave={onReview} />}<button type="button" className="mind-invest-delete" onClick={() => onDelete(r.id)}>이 기록 삭제</button></div>}</article>)}</div>
  </section>;
}
function ReviewForm({ record, onSave }: { record: Decision; onSave: (id: string, review: DecisionReview) => void }) {
  const [action, setAction] = useState<DecisionAction | "">(""), [rules, setRules] = useState<DecisionReview["rules"] | "">(""), [intensity, setIntensity] = useState(record.intensity), [note, setNote] = useState("");
  return <form className="mind-invest-review-form" onSubmit={e => { e.preventDefault(); if (action && rules) onSave(record.id, { at: Date.now(), action, rules, intensity, note }); }}><h3>실제로는 어떻게 했나요?</h3><label>실제 행동<select required value={action} onChange={e => setAction(e.target.value as DecisionAction)}><option value="" disabled>직접 고르세요</option>{(Object.keys(ACTUAL_ACTIONS) as DecisionAction[]).map(id => <option key={id} value={id}>{ACTUAL_ACTIONS[id]}</option>)}</select></label><label>그때 정한 원칙<select required value={rules} onChange={e => setRules(e.target.value as DecisionReview["rules"])}><option value="" disabled>직접 고르세요</option><option value="yes">지켰다</option><option value="partly">일부 지켰다</option><option value="no">못 지켰다</option></select></label><label>지금 충동 강도: {intensity} / 10<input type="range" min={0} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} /></label><label>다음 판단에 남길 한 가지 <small>선택</small><textarea maxLength={600} rows={2} value={note} onChange={e => setNote(e.target.value)} /></label><button type="submit" className="mind-invest-primary" disabled={!action || !rules}>돌아보기 저장</button></form>;
}
function DecisionPatterns({ book, now }: { book: DecisionBook; now: number }) {
  const s = decisionStats(book, now);
  const points = s.last.map((r, i) => `${30 + i * (280 / Math.max(1, s.last.length - 1))},${130 - r.intensity * 11}`);
  return <section className="mind-invest-pattern"><h2>내 판단에 남은 습관.</h2><dl className="mind-invest-metrics"><div><dt>남긴 판단</dt><dd>{s.count}<small>건</small></dd></div><div><dt>돌아본 판단</dt><dd>{s.reviewed}<small>건</small></dd></div><div><dt>원칙을 지켰다고 기록</dt><dd>{s.keptRate === null ? "아직 없음" : `${s.keptRate}%`}</dd></div></dl><p className="mind-invest-help">마지막 비율은 돌아본 {s.reviewed}건 중 ‘지켰다’고 직접 입력한 기록 기준이에요. 수익률이나 투자 능력 점수가 아니에요.</p>
    <figure className="mind-invest-chart"><figcaption>최근 {s.last.length}회 판단의 충동 강도</figcaption>{s.last.length ? <svg viewBox="0 0 340 160" role="img" aria-label={`입력 순서대로 기록한 충동 강도: ${s.last.map(r => r.intensity).join(", ")}. 0부터 10까지.`}>{[0, 5, 10].map(n => <g key={n}><text x="3" y={134 - n * 11}>{n}</text><line x1="28" x2="316" y1={130 - n * 11} y2={130 - n * 11} /></g>)}{points.length > 1 && <polyline points={points.join(" ")} />}{s.last.map((r, i) => <circle key={r.id} cx={30 + i * (280 / Math.max(1, s.last.length - 1))} cy={130 - r.intensity * 11} r="3.5" />)}</svg> : <p className="mind-invest-empty">기록이 생기면 내 입력값으로만 그려져요.</p>}<p>왼쪽이 이전 기록, 오른쪽이 최근 기록이에요. 주가 차트가 아니에요.</p></figure>
  </section>;
}
