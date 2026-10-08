"use client";

// ─────────────────────────────────────────────────────────────
// 화두 상황판 — 형만 보는 자리.
//
// 형: 「대시보드 만들어. 따로 떼서 나만 보는 주소로」
//
// 앱 뒷방(/admin)에 안 넣는다. 뒷방은 **손보는 자리**고 여기는
// **보는 자리**다. 둘을 섞으면 숫자를 보러 들어왔다가 단추를 누른다.
// 나중에 블로그 수치까지 여기로 모은다 — 앱·블로그·돈이 한 화면에.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { watchAuth } from "@/lib/sync";

type 상황 = {
  at: number;
  블로그: {
    id: string;
    이름: string;
    최근: { 제목: string; 날: number; 길: string }[];
    피드수: number;
    마지막: number;
  } | null;
  사람: { 계정: number; 오늘: number; 이레: number; 서른: number };
  도량: { 공양: number; 공개공양: number; 기와: number; 인연: number; 인연활동: number; 글: number };
  돈: { 누적: number; 건수: number; 기다림: number; 달별: { 달: string; 원: number }[] };
  주문: { id: string; n: number; price: number; status: string; depositor: string; email: string | null; at: number }[];
};

const 원 = (n: number) => n.toLocaleString("ko-KR") + "원";
const 수 = (n: number) => (n < 0 ? "—" : n.toLocaleString("ko-KR"));

export default function DeskPage() {
  const [d, setD] = useState<상황 | null>(null);
  const [탈, 탈잡기] = useState("");

  const 읽기 = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return 탈잡기("로그인이 필요합니다");
    try {
      const r = await fetch("/api/desk", {
        headers: { authorization: `Bearer ${await u.getIdToken()}` },
      });
      if (r.status === 403) return 탈잡기("뒷방 계정만 볼 수 있습니다");
      if (!r.ok) return 탈잡기("지금은 읽지 못했습니다");
      setD((await r.json()) as 상황);
      탈잡기("");
    } catch {
      탈잡기("지금은 읽지 못했습니다");
    }
  }, []);

  useEffect(() => watchAuth(() => void 읽기()), [읽기]);

  if (탈) return <main className="desk"><p className="desk-bad">{탈}</p></main>;
  if (!d) return <main className="desk"><p className="desk-bad">살피는 중</p></main>;

  const 최고 = Math.max(1, ...d.돈.달별.map((m) => m.원));

  return (
    <main className="desk">
      <header className="desk-top">
        <h1>화두 상황판</h1>
        <span>{new Date(d.at).toLocaleString("ko-KR")}</span>
      </header>

      {/* ── 머리 셋 ── */}
      <section className="desk-row">
        <div className="desk-card">
          <p className="desk-k">누적 매출</p>
          <p className="desk-big">{원(d.돈.누적)}</p>
          <p className="desk-s">
            입금 {d.돈.건수}건
            {d.돈.기다림 > 0 && <> · 대기 {d.돈.기다림}건</>}
          </p>
        </div>
        <div className="desk-card">
          <p className="desk-k">계정</p>
          <p className="desk-big">{수(d.사람.계정)}</p>
          <p className="desk-s">
            오늘 {수(d.사람.오늘)} · 이레 {수(d.사람.이레)} · 한 달 {수(d.사람.서른)}
          </p>
        </div>
        <div className="desk-card">
          <p className="desk-k">법당</p>
          <p className="desk-big">{수(d.도량.공양)}</p>
          <p className="desk-s">
            공개 {수(d.도량.공개공양)} · 기와 {수(d.도량.기와)}
          </p>
        </div>
      </section>

      {/* ── 달별 매출 ── */}
      <section className="desk-card desk-wide">
        <p className="desk-k">달별 매출</p>
        {d.돈.달별.length === 0 ? (
          <p className="desk-s">아직 입금된 주문이 없습니다.</p>
        ) : (
          <div className="desk-bars">
            {d.돈.달별.map((m) => (
              <div key={m.달} className="desk-bar">
                <b>{m.원.toLocaleString("ko-KR")}</b>
                <i style={{ height: `${Math.max(4, (m.원 / 최고) * 100)}%` }} />
                <span>{m.달.slice(5)}월</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 도량 ── */}
      <section className="desk-row">
        {[
          ["인연 프로필", d.도량.인연],
          ["인연 활동 중", d.도량.인연활동],
          ["모임 글", d.도량.글],
        ].map(([k, v]) => (
          <div key={k as string} className="desk-card">
            <p className="desk-k">{k as string}</p>
            <p className="desk-mid">{수(v as number)}</p>
          </div>
        ))}
      </section>

      {/* ── 주문 장부 ── */}
      <section className="desk-card desk-wide">
        <p className="desk-k">최근 주문</p>
        {d.주문.length === 0 ? (
          <p className="desk-s">아직 주문이 없습니다.</p>
        ) : (
          <table className="desk-table">
            <tbody>
              {d.주문.map((o) => (
                <tr key={o.id} data-pend={o.status !== "paid" ? "1" : undefined}>
                  <td>{o.at ? new Date(o.at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "—"}</td>
                  <td>{o.depositor || o.email || "—"}</td>
                  <td>연꽃 {o.n}</td>
                  <td className="desk-num">{원(o.price)}</td>
                  <td>{o.status === "paid" ? "입금" : "대기"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── 블로그 ──
          방문자·수익은 형 계정으로 로그인해야 보이는 수라 서버가 못
          가져온다. 대신 RSS 로 읽히는 것(언제 · 무엇이 올라갔나)은
          자동으로 채우고, 못 가져오는 둘은 **문만 달아 둔다.** */}
      <section className="desk-card desk-wide">
        <div className="desk-blog-top">
          <p className="desk-k">블로그 · {d.블로그?.이름 || "—"}</p>
          <span className="desk-s">
            {d.블로그?.마지막
              ? `마지막 글 ${Math.max(0, Math.round((Date.now() - d.블로그.마지막) / 86400000))}일 전`
              : "—"}
          </span>
        </div>
        {d.블로그 ? (
          <>
            <ul className="desk-posts">
              {d.블로그.최근.map((x) => (
                <li key={x.길}>
                  <a href={x.길} target="_blank" rel="noreferrer">{x.제목}</a>
                  <span>{x.날 ? new Date(x.날).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : ""}</span>
                </li>
              ))}
            </ul>
            <p className="desk-s">피드에 잡힌 글 {d.블로그.피드수}개(네이버가 최근 것만 내준다)</p>
          </>
        ) : (
          <p className="desk-s">블로그를 읽지 못했습니다.</p>
        )}
        <div className="desk-links">
          <a href="https://analytics.naver.com" target="_blank" rel="noreferrer">네이버 애널리틱스 — 방문자</a>
          <a href="https://adpost.naver.com" target="_blank" rel="noreferrer">애드포스트 — 수익</a>
          <a href={`https://blog.naver.com/${d.블로그?.id ?? ""}`} target="_blank" rel="noreferrer">블로그 열기</a>
        </div>
      </section>
    </main>
  );
}
