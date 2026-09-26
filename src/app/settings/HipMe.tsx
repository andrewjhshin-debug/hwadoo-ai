"use client";

// ─────────────────────────────────────────────────────────────
// 나 — 폰 판. 我(아).
//
// 형: 「쳐내야 할 아주 당장 필요 없는 기능은 빼고 핵심만」
//     「텍스트는 아예 거의 다 줄여버려. 의미 정보가 전달되도록만 하고
//      나머지 다 지우고」
//     「오리지날을 답습할 필요조차 없다」
//
// 옛 내 도량은 한 스크롤에 열다섯 덩이였다 — 마이페이지 + 앱 런처 +
// 설정 + 약관. 폰에서 그걸 다 펴 둘 이유가 없다.
//
// **남긴 것 넷.** 이름 · 자리 · 쌓은 것 · 무엇을 몇 번.
// 나머지(부적·이달의 마음·우리 절·알림·약관·서비스 격자…)는 전부
// 「⋯」 하나 뒤로 내렸다. 지운 것은 없다 — 한 겹 아래로 갔을 뿐이다.
//
// 글자도 깎았다. 「지금까지 쌓은 공덕」 → 「功德」. 「사미까지 공덕 432」 →
// 실 한 올과 「沙 432」. 뜻은 남기고 말은 지운다.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import HipShell from "@/components/HipShell";
import HipTop from "@/components/HipTop";
import { LOTUS_PRICE } from "@/lib/merit";

export type HipMeProps = {
  /** 법명 */
  name: string;
  /** 지금 자리의 한자 · 이름 */
  rank: { hanja: string; name: string };
  /** 여섯 자리 — 지나온 곳(got)과 지금(here). 한글 이름도 같이 적는다.
      형: 「법명 아래 바로 계급도 죽죽죽 부처까지 나오고
           그 아래 동자 사미 … 부처 이렇게 적어주자 한글로」 */
  seats: { hanja: string; name: string; need: number; got: boolean; here: boolean }[];
  /** 다음 자리까지 0~100 */
  pct: number;
  /** 다음 자리 한자 · 남은 공덕 · 모자란 화두 수. 꼭대기면 null.
      자리는 공덕만으로 안 오른다 — 「沙 0」 만 뜨면 왜 안 오르는지 알 수 없다 */
  next: { hanja: string; left: number; need: number } | null;
  merit: number;
  /** 무엇을 몇 번 — 많이 한 것부터 넉 장만 */
  hits: { label: string; n: number }[];
  /** 도량 안내 · 사업자 정보 — 법으로 두어야 하는 것들 */
  law: {
    links: { href: string; label: string }[];
    email: string;
    biz: string;
  };
  /** 접었다 펴는 두 자리 — 안에 들어갈 것은 부모가 그려 준다 */
  charms: React.ReactNode;
  bells: React.ReactNode;
  /** 계정 — 로그인·로그아웃. **접지 않는다.**
      폰에서 계정 칸이 영구히 숨겨져 있어서 형이 「로그인 기능 빵났다」고
      했다. 옛 머리띠(☰)까지 끄면서 마지막 길도 막혔었다.
      숨길 것이 아니라 보이는 자리에 둔다 */
  account: React.ReactNode;
  /** 아직 안 들어왔나 — 그러면 계정 칸을 **맨 위로** 올린다.
      형: 「로그인도 지금 안 돼. 로그인이 제일 시급」.
      단추는 있었다. 동그라미 스물여섯 개 아래, 1,098px 지점에 있었다 —
      찾을 수 없으면 없는 것과 같다 */
  guest: boolean;
  /** 서비스 전부 — 형: 「서비스 다 넣어주고」. 한자 한 글자와 이름 */
  services: { href: string; mark: string; label: string }[];
  /** 법명 고치기 — 맞으면 null, 어긋나면 까닭을 돌려준다 */
  onRename: (next: string) => string | null;
  /** 법명 다시 뽑기 */
  onReroll: () => void;
  /** 적는 동안 미리 살펴 주는 검사 */
  nameProblem: (raw: string) => string | null;
  /** 음양 — 형: 「남자면 양 여자면 음, 그거 버튼 넣자」.
      고르면 법명 글자 수가 따라 바뀐다(陽 두 자 · 陰 세 자) */
};

export default function HipMe({
  name,
  rank,
  seats,
  pct,
  next,
  merit,
  hits,
  law,
  charms,
  bells,
  services,
  account,
  guest,
  onRename,
  onReroll,
  nameProblem,
}: HipMeProps) {
  // 법명 고치기 — 그 자리에서 편다. 화면을 옮기지 않는다
  /** 공덕 ⓘ 서랍 */
  const [openInfo, setOpenInfo] = useState(false);
  /** 공덕 알약 — 접힌 것이 기본. 형: 「동그라미들 접었다 펼치기 기능 둬」 */
  const [openHits, setOpenHits] = useState(false);
  /** 접었을 때 보일 것 — 형: 「이거 3개까지만 나오고 나머진 접고」.
      한 것만 남겼더니 아홉 줄이 되어 여전히 화면을 먹었다. **가장 많이 한
      셋**이면 족하다 — 내 살림이 무엇인지는 그 셋이 이미 말한다.
      (hits 는 많이 한 것부터 정렬되어 온다) */
  const foldedHits = hits.slice(0, 3);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [err, setErr] = useState<string | null>(null);
  const open = () => {
    setDraft(name);
    setErr(null);
    setEditing(true);
  };
  const save = () => {
    const bad = onRename(draft);
    if (bad) {
      setErr(bad);
      return;
    }
    setEditing(false);
  };

  return (
    <HipShell here="/settings">
    {/* hip-screen-scroll — 이 판은 내용이 길어 세로로 흐른다.
        형: 「내 도량에서 위 아래 스크롤이 안되노 고치고」.
        판(.hip-screen)은 fixed·overflow:hidden 이고 body 도 overflow:hidden 이라,
        안에 통을 하나 만들어 주지 않으면 화면에 스크롤할 자리가 아예 없다. */}
    <div className="hip-screen hip-screen-scroll">
      <span aria-hidden className="hip-bloom hip-bloom-a" />
      <span aria-hidden className="hip-bloom hip-bloom-b" />

      <header className="hip-screen-top">
        <a href="/" aria-label="화두 홈" className="hip-home">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 4.2c1.7 2.4 2.4 4.4 2.4 6.3s-1.1 3.7-2.4 4.9c-1.3-1.2-2.4-3-2.4-4.9s.7-3.9 2.4-6.3z" />
            <path d="M12 15.4c-1.9-1.6-4.6-2.3-7.4-2.2.3 2.6 2.4 4.6 5 5 .9.1 1.7 0 2.4-.3" />
            <path d="M12 15.4c1.9-1.6 4.6-2.3 7.4-2.2-.3 2.6-2.4 4.6-5 5-.9.1-1.7 0-2.4-.3" />
          </svg>
          <b>화두</b>
        </a>
        {/* 여기는 이미 내 도량이니 我 단추는 숨긴다 */}
        <HipTop />
      </header>

      <div className="hip-screen-mid">
        {/* 이름과 자리 — 형: 「동자승 캐릭터 쓰지 말라고」.
            얼굴 그림을 뺐다. 법명 한 줄과 자리 한자면 족하다 */}
        <div className="hip-me-head">
          <div>
            {/* 형: 「내 도량에서 법명이나 아이디 고칠 수 있도록」.
                화면을 옮기지 않는다 — 이름을 누르면 그 자리가 글칸이 된다 */}
            {editing ? (
              <div className="hip-name-edit">
                <input
                  autoFocus
                  value={draft}
                  maxLength={8}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setErr(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  aria-label="법명"
                />
                <button onClick={save} className="hip-name-ok">
                  확인
                </button>
                <button onClick={() => setEditing(false)} className="hip-name-no">
                  ✕
                </button>
              </div>
            ) : (
              <p className="hip-me-name">
                <button onClick={open} aria-label="법명 고치기">
                  {name}
                </button>
                <button onClick={onReroll} className="hip-reroll" aria-label="법명 다시 뽑기">
                  ↻
                </button>
                {/* 음양 토글은 걷었다 — 형: 「음양 필요 없고」.
                    법명 옆에 陽·陰 두 알이 붙어 있으니 이름보다 그것이
                    먼저 눈에 걸렸다. 글자 수는 이미 정해 둔 결대로 뽑힌다. */}
              </p>
            )}
            {(err ?? (editing ? nameProblem(draft) : null)) && (
              <p className="hip-name-bad">{err ?? nameProblem(draft)}</p>
            )}
          </div>
        </div>

        {/* 손님이면 여기 — 이름 바로 아래. 들어온 뒤에는 맨 아래로 내린다 */}
        {guest && <div className="hip-account hip-account-top">{account}</div>}

        {/* ── 자리 — 가로로 ──
            형: 「자리는 가로 형태로 두고」. 여섯 자리를 한 줄에 늘어놓고
            지나온 곳은 물들이고, 지금 자리만 크게. 한자 여섯이면 족하다 */}
        {/* 형: 「법명 바로 아래 동자 이딴 거 넣지 말고, 법명 아래 바로
            계급도 죽죽죽 부처까지 나오고, 그 아래 동자 사미 … 부처
            이렇게 적어주자 한글로」
            「그 공덕 아래 얼마가 쌓여야 부처가 되는지도 숫자로 써주자」.
            지금 자리를 한 번 더 적던 줄(童 동자)을 걷었다 — 아래 여섯 자리에
            이미 켜져 있는데 위에 또 적으니 같은 말이 두 번이었다. */}
        <div className="hip-seats">
          {seats.map((r) => (
            <i
              key={r.hanja}
              data-got={r.got ? "1" : undefined}
              data-here={r.here ? "1" : undefined}
            >
              <b>{r.hanja}</b>
              <em>{r.name}</em>
              <u>{r.need > 0 ? r.need.toLocaleString("ko-KR") : "시작"}</u>
            </i>
          ))}
        </div>
        <div className="hip-me-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        {next && (
          <p className="hip-me-next">
            <b>{next.hanja}</b> {next.left.toLocaleString("ko-KR")}
            {next.need > 0 && (
              <>
                {" · "}
                <b>話</b> {next.need}
              </>
            )}
          </p>
        )}

        {/* 쌓은 것 — 이 화면의 큰 것 하나 */}
        <p className="hip-me-merit">{merit.toLocaleString("ko-KR")}</p>
        {/* <p> 가 아니라 <div> 다 — 안에 ⓘ 서랍(details>div)이 들어간다.
            HTML 은 <p> 안에 <div> 를 못 넣는다(브라우저가 <p> 를 먼저
            닫아 버려서 서버·클라이언트 그림이 어긋난다) */}
        <div className="hip-me-merit-k">
          功 德
          {/* 형: 「공덕 시스템 유지하고 ⓘ로 어딘가에 표시. 하루 내내 공덕
              쌓으면 연꽃 하나 주고, 이걸로 인연에서 쪽지 보내거나
              초공양할 수 있다고」. 세 줄이면 족하다 */}
          {/* 형: 「아니지 않나. 공덕은 부처까지 가는 거고 하루에 한 송이
              주는 거잖아. 그걸 더 ⓘ에 친절하게 설명해 봐. 지금처럼 허접하게
              펼쳐지는 것도 좀 고치고」

              길을 하나로 그려 놨더니 **공덕이 연꽃으로 바뀌는 것**처럼
              읽혔다. 아니다 — 둘은 갈래가 다르다.
                · 공덕은 **쌓이기만** 한다. 줄지 않고, 끝은 부처다
                · 연꽃은 **하루에 한 송이**. 그날 치를 다 채운 날 한 송이 핀다
              그래서 두 줄로 갈라 적는다. 그림 한 줄, 말 한 줄씩.

              <details> 는 열릴 때 툭 튀어나온다(높이가 0에서 제값으로
              한 칸에 간다). grid 의 0fr → 1fr 로 바꾸면 높이를 모르고도
              스르르 열린다. 그래서 서랍을 직접 짠다. */}
          <button
            type="button"
            className="hip-info-key"
            onClick={() => setOpenInfo((v) => !v)}
            aria-expanded={openInfo}
            aria-controls="hip-merit-info"
            aria-label="공덕이란"
          >
            ⓘ
          </button>
        </div>

        <div
          id="hip-merit-info"
          className="hip-info-drawer"
          data-open={openInfo ? "1" : undefined}
        >
          <div className="hip-info-card">
            {/* ① 공덕 — 쌓여서 부처까지 */}
            <div className="hip-info-row">
              <span className="hip-info-way">
                <i>修</i>
                <u>→</u>
                <i>功</i>
                <u>→</u>
                <i className="on">佛</i>
              </span>
              {/* 형: 「이 말 지우고, 실제로 로그인 뜸하면 공덕도 깎인다고」
                  맞는 지적이다 — **판은 진작 깎고 있었다**(merit.ts 퇴전:
                  이틀째부터 하루 4%씩, 이레 넘으면 하루 25%). 그런데 여기
                  적힌 말은 「한 번 쌓인 공덕은 줄지 않습니다」였다.
                  화면이 코드와 다른 말을 하면 그 화면을 못 믿는다. */}
              <p>
                <b>쌓이고, 쉬면 줄어듭니다.</b>
                <br />
                동자에서 사미 · 수좌 · 선사 · 보살을 지나 부처까지.
                <br />
                하루는 봐주고, 이틀째부터 하루 4%씩 물러납니다.
              </p>
            </div>

            {/* ② 연꽃 — 하루에 한 송이 */}
            <div className="hip-info-row">
              <span className="hip-info-way">
                <i>
                  功
                  <em>{LOTUS_PRICE.toLocaleString("ko-KR")}</em>
                </i>
                <u>→</u>
                <i className="on">
                  蓮
                  <em>1</em>
                </i>
              </span>
              <p>
                <b>연꽃은 하루에 한 송이입니다.</b>
                <br />
                하루 공덕 {LOTUS_PRICE.toLocaleString("ko-KR")}을 다 채우면
                <br />
                연꽃 한 송이.
              </p>
            </div>
          </div>
        </div>

        {/* 무엇을 몇 번 — 형: 「공덕 쌓은 거 라벨 이런 식으로 넣어.
            모든 기능 중 공덕 주는 건 다. 대신 한 횟수를 표기」.
            넉 장짜리 격자를 알약 줄로 바꿨다. 칸이 정해져 있지 않으니
            여덟이든 열둘이든 줄을 바꿔 가며 다 담긴다 — 「다」 라는 말은
            개수를 모른다는 뜻이고, 격자는 개수를 알아야 짜인다. */}
        {/* 형: 「동그라미들 접었다 펼치기 기능 둬」 + 왼쪽으로 붙이고.
            갈래 전부를 깔았더니 열일곱 알이 화면 절반을 먹었다.
            **접었을 때는 한 번이라도 한 것**만 — 그게 내 살림이다.
            나머지는 「+12」 알 하나 뒤에 접어 둔다. 눌러 보면 무엇을
            더 하면 공덕이 붙는지 그 자리에서 펼쳐진다. 설명은 없다. */}
        <div className="hip-me-hits" data-open={openHits ? "1" : undefined}>
          {(openHits ? hits : foldedHits).map((h) => (
            <span key={h.label}>
              {h.label} <b>{h.n.toLocaleString("ko-KR")}</b>번
            </span>
          ))}
          {hits.length > foldedHits.length && (
            <button
              type="button"
              className="hip-hits-more"
              onClick={() => setOpenHits((v) => !v)}
              aria-expanded={openHits}
              aria-label={openHits ? "접기" : `나머지 ${hits.length - foldedHits.length}가지 펼치기`}
            >
              {openHits ? "－" : `＋${hits.length - foldedHits.length}`}
            </button>
          )}
        </div>

        {/* ── 서비스 전부 — 동그란 버튼으로 ──
            형: 「정직하게 막 탭에 메뉴판에 다 두려고 하지 말고, 동영상
            레퍼처럼 귀엽게 아기자기하게 동그란 버튼을 두든, 여러 메뉴는
            내 도량에서 보든」 「서비스 다 넣어주고」.
            여섯만 두었더니 나머지로 가는 길이 아예 없었다 — 옛 머리띠를
            끄면서 ☰ 서랍까지 사라졌으니 여기가 유일한 문이다.
            글자는 한 줄, 그림은 한자 한 글자. */}
        <div className="hip-rooms">
          {services.map((r) => (
            <Link key={r.href} href={r.href} aria-label={r.label}>
              <i>{r.mark}</i>
              <span>{r.label}</span>
            </Link>
          ))}
        </div>

        {/* ── 계정 ──
            형: 「왜 로그인 기능이 없냐 어디서 로그인해」 「로그인 기능
            빵났다」. 폰에서 이 칸이 영구히 숨겨져 있었다(meMore 를 켜는
            곳이 파일 어디에도 없었다). 옛 머리띠를 끄면서 ☰ 서랍이라는
            마지막 길까지 막혔다. **접지 않고** 여기 둔다. */}
        {!guest && <div className="hip-account">{account}</div>}

        {/* ── 접었다 펼치는 둘 ──
            형: 「부적 기능 접었다 펼쳤다. 알림도 접었다 펼쳤다」.
            늘 펴 두면 화면이 길어지고, 아주 지우면 찾을 길이 없다 */}
        <div className="hip-folds">
          <details>
            <summary>
              <b>符</b> 부적
            </summary>
            <div>{charms}</div>
          </details>
          <details>
            <summary>
              <b>鐘</b> 알림
            </summary>
            <div>{bells}</div>
          </details>
        </div>

        {/* ── 도량 안내와 사업자 정보 ──
            리뉴얼이 웹까지 덮으면서 아래 띠(footer)가 통째로 가려졌다 —
            .hip-screen 이 fixed inset-0 로 화면을 덮기 때문이다. 그 바람에
            이용약관·개인정보·사업자 정보로 가는 길이 **앱 어디에도 없어졌다.**
            전자상거래법 제10조는 이것을 볼 수 있게 두라고 한다.
            눈에 안 걸리게, 그러나 반드시 닿게 — 맨 아래 옅은 한 줄. */}
        <div className="hip-law">
          <p>
            {law.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
            <a href={`mailto:${law.email}`}>문의</a>
          </p>
          <small>{law.biz}</small>
        </div>
      </div>

    </div>
    </HipShell>
  );
}
