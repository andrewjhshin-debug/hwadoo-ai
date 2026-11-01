"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import HipRoom from "@/components/HipRoom";
import { auth } from "@/lib/firebase";
import { loginWithGoogle, watchAuth } from "@/lib/sync";
import { SAJU_FOCUS, SAJU_PRODUCT, ELEMENTS, type SajuInput, type SajuChart } from "@/lib/saju";
import type { SajuReading } from "@/lib/saju-reading";
import { BANK_INFO, BIZ_NAME, BIZ_REG_NO, BIZ_MAIL_ORDER_NO, CONTACT_EMAIL } from "@/lib/config";
import "./saju.css";

type Report = { id: string; chart: SajuChart; entitled: boolean; orderId: string | null; state: string; reading: SajuReading | null; questions: { id: string; question: string; answer: string }[]; preview: { title: string; summary: string; action: string }; generating: boolean };
async function api(method: "GET" | "POST", body?: object, query = "") {
  const user = auth.currentUser;
  if (!user) throw Error("로그인 후 이용해 주세요.");
  const res = await fetch(`/api/saju${query}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw Error(data.error ?? "처리하지 못했어요.");
  return data;
}
export default function SajuPage() {
  const [user, setUser] = useState<string | null | undefined>(undefined), [reports, setReports] = useState<Report[]>([]), [selected, setSelected] = useState("");
  const [input, setInput] = useState<SajuInput>({ date: "", time: "", calendar: "solar", leap: false, focus: "work" });
  const [consent, setConsent] = useState(false), [terms, setTerms] = useState(false), [depositor, setDepositor] = useState("");
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [checkout, setCheckout] = useState(false), [ready, setReady] = useState(false), [admin, setAdmin] = useState(false), [native, setNative] = useState(false);
  const [question, setQuestion] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const selection = useRef("");
  const lock = useRef(false), generation = useRef(0), questionId = useRef("");
  const refresh = useCallback(async () => {
    const version = generation.current;
    const data = await api("GET");
    if (selection.current && !data.reports.some((r: Report) => r.id === selection.current)) {
      const own = await api("GET", undefined, `?id=${encodeURIComponent(selection.current)}`);
      data.reports.push(...own.reports);
    }
    if (version !== generation.current) return;
    setReports(prior => [...data.reports, ...prior.filter(r => !data.reports.some((n: Report) => n.id === r.id))]); setNextCursor(data.nextCursor); setReady(data.checkoutReady === true); setAdmin(data.admin === true);
  }, []);
  useEffect(() => watchAuth(u => { generation.current++; selection.current = ""; setUser(u?.uid ?? null); setReports([]); setSelected(""); setCheckout(false); setBusy(""); setError(""); setReady(false); setAdmin(false); if (u) void refresh().catch(e => setError(e.message)); }), [refresh]);
  useEffect(() => {
    const lifecycle = generation;
    const t = setTimeout(() => setNative(!!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()), 0);
    const visible = () => { if (!document.hidden && auth.currentUser) void refresh().catch(() => {}); };
    document.addEventListener("visibilitychange", visible);
    return () => { lifecycle.current++; clearTimeout(t); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const report = reports.find(r => r.id === selected);
  const run = async (label: string, action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(label); setError(""); const version = generation.current;
    try { await action(); } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { lock.current = false; if (version === generation.current) setBusy(""); }
  };
  return <HipRoom here="/saju" lanes={false} rail="/settings"><section className="saju">
    <header className="saju-head"><Link href="/settings" aria-label="내 공간으로">←</Link><span>山神閣</span>{reports.length > 0 && <a href="#saju-history">내 운세</a>}</header>
    <div className="saju-entrance saju-ink-entrance">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="saju-ink-pavilion" src="/obj/sanshingak-ink-v1.webp" width={960} height={410} alt="산신과 호랑이 그림을 모신 작은 수묵 산신각" />
      <h1>산신각</h1>
    </div>
    {error && <p role="alert" className="saju-error">{error}</p>}
    {user === undefined ? <p role="status">불러오는 중…</p> : !user ? <div className="saju-start"><button type="button" className="saju-primary" disabled={!!busy} onClick={() => void run("login", async () => { await loginWithGoogle(); })}>{busy === "login" ? "들어가는 중…" : "운세 보기"}</button></div> : <>
      {report && <div className="saju-toolbar"><button type="button" disabled={!!busy} onClick={() => { selection.current = ""; setSelected(""); setCheckout(false); setError(""); }}>다시 빌기</button></div>}
      {!report ? <form className="saju-form" onSubmit={e => { e.preventDefault(); void run("preview", async () => { const version = generation.current; const data = await api("POST", { action: "preview", input, consent }); if (version !== generation.current) return; selection.current = data.id; await refresh(); if (version === generation.current) { setSelected(data.id); setCheckout(false); } }); }}>
        <div className="saju-birth-head"><span>생년월일</span><div className="saju-pills">{(["solar", "lunar"] as const).map(mode => <button type="button" key={mode} aria-pressed={input.calendar === mode} onClick={() => setInput(v => ({ ...v, calendar: mode, leap: false }))}>{mode === "solar" ? "양력" : "음력"}</button>)}</div></div>
        <label className="saju-birth-date"><span className="sr-only">태어난 날</span><input type={input.calendar === "solar" ? "date" : "text"} placeholder="YYYY-MM-DD" required min="1900-01-01" value={input.date} onChange={e => { const raw = e.target.value; const date = input.calendar === "solar" ? raw : raw.replace(/\D/g, "").slice(0, 8).replace(/^(\d{4})(\d{1,2})?(\d{1,2})?$/, (_, y, m, d) => `${y}${m ? `-${m}` : ""}${d ? `-${d}` : ""}`); setInput(v => ({ ...v, date })); }} /></label>
        {input.calendar === "lunar" && <label className="saju-check"><input type="checkbox" checked={input.leap} onChange={e => setInput(v => ({ ...v, leap: e.target.checked }))} />윤달이에요</label>}
        <details className="saju-time"><summary>태어난 시각 <small>{input.time || "선택"}</small></summary><label>시각<input type="time" value={input.time} onChange={e => setInput(v => ({ ...v, time: e.target.value }))} /></label></details><small className="saju-local">한국 출생 기준</small>
        <fieldset><legend>무엇을 빌까요?</legend><div className="saju-pills">{Object.entries(SAJU_FOCUS).map(([id, label]) => <button type="button" key={id} aria-label={label} aria-pressed={input.focus === id} onClick={() => setInput(v => ({ ...v, focus: id as SajuInput["focus"] }))}>{{ work: "일", relationship: "인연", rhythm: "마음" }[id]}</button>)}</div></fieldset>
        <div className="saju-consent"><label className="saju-check"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} />출생 정보 이용·보관 동의</label><details><summary>내용 보기</summary><p>출생 정보를 사주 계산에 사용하고, 변환한 생일·명식·관심사를 내 계정에 보관합니다. 공개 프로필에는 표시하지 않으며 무료 운세에는 AI를 사용하지 않습니다. 해외 출생은 지원하지 않습니다. <Link href="/privacy">개인정보 안내</Link></p></details></div>
        <button className="saju-primary" disabled={!!busy || !consent}>{busy === "preview" ? "운세를 펼치는 중…" : "운세 보기"}</button>
      </form> : <article className="saju-result">
        <div className="saju-fortune"><span>{report.chart.dayElement}</span><h2>{report.preview.title}</h2><p>{report.preview.action}</p></div>
        {report.entitled ? <>
          {report.reading ? <><header className="saju-reading-title"><span>내 상세 리포트</span><h2>{report.reading.title}</h2></header><p>{report.reading.intro}</p>{report.reading.sections.map((section, i) => <section className="saju-reading-section" key={section.title}><small>{String(i + 1).padStart(2, "0")}</small><h3>{section.title}</h3><p>{section.text}</p></section>)}
            <button type="button" onClick={() => window.print()}>인쇄 / PDF로 저장</button>
            <section className="saju-questions"><h3>내 풀이에 더 묻기 <small>{report.questions.length} / {SAJU_PRODUCT.questions}</small></h3>{report.questions.map(q => <div key={q.id}><b>{q.question}</b><p>{q.answer}</p></div>)}{report.questions.length < SAJU_PRODUCT.questions && <form onSubmit={e => { e.preventDefault(); void run("ask", async () => { const version = generation.current; if (!questionId.current) questionId.current = crypto.randomUUID(); await api("POST", { action: "ask", id: report.id, question, questionId: questionId.current }); await refresh(); if (version === generation.current) { questionId.current = ""; setQuestion(""); } }); }}><label>지금 궁금한 한 가지<textarea required rows={3} maxLength={400} value={question} onChange={e => { setQuestion(e.target.value); questionId.current = ""; }} disabled={!!busy} /></label><button className="saju-primary" disabled={!!busy || !question.trim()}>{busy === "ask" ? "답하는 중…" : "질문하기"}</button><small>답변 생성에 실패하면 횟수가 차감되지 않아요.</small></form>}</section>
          </> : <div className="saju-offer"><h2>입금 확인됐어요.</h2><p>관심사에 맞춘 내 풀이를 만들어 보세요.</p><button className="saju-primary" disabled={!!busy || !ready} onClick={() => void run("generate", async () => { await api("POST", { action: "generate", id: report.id }); await refresh(); })}>{busy === "generate" ? "내 풀이를 쓰는 중…" : "내 상세 풀이 만들기"}</button><small>실패해도 구매 권리는 그대로예요. 다시 누르면 이어서 시도해요.</small></div>}
        </> : (ready || report.orderId || report.state === "refunded") && <div className="saju-offer"><span>단건 · 정기결제 없음</span><h2>더 깊이 보기</h2><strong className="saju-price">5,900<small>원</small></strong><details><summary>상세 풀이 · 질문 3회</summary><p>기질 · 일 · 관계 · 생활 · 90일 실천 · 내 질문. 상세 6장과 후속 질문 3회, 계정 보관을 제공합니다. 각 장에는 명식과 연결한 해석, 생활 속 예시, 직접 해볼 행동이 들어갑니다. 대운·용신·신살 분석은 포함하지 않습니다. 미래나 결과를 보장하지 않습니다.</p></details>
          {report.state === "refunded" ? <p>환불 처리된 기록입니다. 문의는 주문번호와 함께 보내주세요.</p> : report.orderId ? <><p className="saju-action">입금 확인을 기다리고 있어요. 자동 확인은 아닙니다.</p>{ready && !native ? <BankGuide orderId={report.orderId} /> : <p>현재 입금 안내는 중단되어 있어요. 추가 입금하지 말고 문의해 주세요.</p>}<button type="button" className="saju-primary" disabled={!!busy} onClick={() => void run("refresh", refresh)}>입금 확인 상태 새로고침</button></> : checkout && !native ? <form onSubmit={e => { e.preventDefault(); if (!ready) return; void run("order", async () => { await api("POST", { action: "order", id: report.id, depositor, terms }); await refresh(); setCheckout(false); }); }}><h3>{ready ? "구매 안내" : "구매 안내 미리보기"}</h3>{!ready && <p role="status" className="saju-action">현재는 구매 준비 중입니다. 주문과 입금을 받지 않아요.</p>}<label>입금자명<input required maxLength={30} value={depositor} onChange={e => setDepositor(e.target.value)} disabled={!ready} /></label><label className="saju-check"><input type="checkbox" required checked={terms} onChange={e => setTerms(e.target.checked)} disabled={!ready} />금액·제공 내용·수동 입금 확인과 Google Gemini에 계산 명식·관심사·후속 질문을 보내 AI 풀이를 생성하는 데 동의해요.</label><p className="saju-sub">취소·환불은 {CONTACT_EMAIL}로 주문번호와 함께 요청해 주세요. 공급 전 취소·환불을 요청할 수 있으며 법령상 권리는 제한하지 않습니다. 입금 확인 전에는 상세 풀이를 제공하지 않습니다. 서비스 오류 시 구매 권리를 유지하며 재시도할 수 있습니다. <Link href="/terms">이용약관</Link> · <Link href="/privacy">개인정보 안내</Link></p><button className="saju-primary" disabled={!!busy || !terms || !ready}>{ready ? "주문하고 입금 안내 보기" : "판매 준비 중"}</button><button type="button" onClick={() => setCheckout(false)}>닫기</button></form> : native ? <p>앱에서는 이미 구매한 풀이를 열어볼 수 있어요. 앱 내 신규 구매는 아직 준비 중이에요.</p> : <button type="button" className="saju-primary" disabled={!!busy} onClick={() => setCheckout(true)}>{ready ? "상세 풀이 5,900원" : "구매 안내 미리보기"}</button>}
        </div>}
        <details className="saju-basis"><summary>사주 풀이 보기</summary><p>{report.preview.summary}</p><div className="saju-pillars">{report.chart.pillars.map((p, i) => <div key={i}><small>{["년주", "월주", "일주", "시주"][i]}</small><strong>{p || "―"}</strong></div>)}</div>{!report.chart.timeKnown && <p>시각 미상 · 시주 제외</p>}<div className="saju-elements">{ELEMENTS.map((el, i) => <span key={el}>{el} <b>{report.chart.elements[i]}</b></span>)}</div><p>일간 오행의 일반 해석이며, 미래를 예측하는 개인 운세는 아닙니다. 오행 수는 천간·지지 기준이며 지장간은 포함하지 않습니다.</p><p>{report.chart.basis}</p></details>
      </article>}
      {reports.length > 0 && <details id="saju-history" className="saju-history"><summary>내 운세 보관함 <small>{reports.length}</small></summary><label>기록<select disabled={!!busy} value={selected} onChange={e => { selection.current = e.target.value; setSelected(e.target.value); setCheckout(false); setError(""); questionId.current = ""; setQuestion(""); }}><option value="">새로 빌기</option>{reports.map(r => <option key={r.id} value={r.id}>{r.chart.solarDate} · {SAJU_FOCUS[r.chart.focus]} · {r.entitled ? "구매함" : r.state === "pending" ? "입금 확인 중" : "운세"}</option>)}</select></label><button type="button" disabled={!!busy} onClick={() => void run("refresh", refresh)}>새로고침</button>{nextCursor && <button type="button" disabled={!!busy} onClick={() => void run("older", async () => { const version = generation.current; const data = await api("GET", undefined, `?cursor=${encodeURIComponent(nextCursor)}`); if (version !== generation.current) return; setReports(prior => [...prior, ...data.reports.filter((r: Report) => !prior.some(p => p.id === r.id))]); setNextCursor(data.nextCursor); })}>더 보기</button>}</details>}
    </>}
    <footer className="saju-footer"><details><summary>이용 안내</summary><p>사주를 빌린 가벼운 참고 콘텐츠입니다.</p>{BIZ_NAME} · 사업자 {BIZ_REG_NO}<br />통신판매 {BIZ_MAIL_ORDER_NO}<br /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · <Link href="/terms">이용약관</Link> · <Link href="/privacy">개인정보</Link>{admin && <p><Link href="/admin/saju">주문 관리</Link></p>}</details></footer>
  </section></HipRoom>;
}
function BankGuide({ orderId }: { orderId: string }) { return <div className="saju-bank"><b>{BANK_INFO?.bank} {BANK_INFO?.account}</b><span>예금주 {BANK_INFO?.holder}</span><strong>입금액 5,900원</strong><small>주문번호 {orderId}</small><p>입금 후 관리자가 통장에서 확인하면 상세 풀이가 열려요. 주문만으로 결제 완료 처리되지 않습니다.</p><button type="button" onClick={() => void navigator.clipboard.writeText(`${BANK_INFO?.bank} ${BANK_INFO?.account}`).catch(() => {})}>계좌 복사</button></div>; }
