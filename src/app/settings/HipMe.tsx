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
import { LOTUS_PRICE } from "@/lib/merit";

export type HipMeProps = {
  /** 법명 */
  name: string;
  /** 지금 자리의 한자 · 이름 */
  rank: { hanja: string; name: string };
  /** 여섯 자리 — 지나온 곳(got)과 지금(here) */
  seats: { hanja: string; got: boolean; here: boolean }[];
  /** 다음 자리까지 0~100 */
  pct: number;
  /** 다음 자리 한자 · 남은 공덕 · 모자란 화두 수. 꼭대기면 null.
      자리는 공덕만으로 안 오른다 — 「沙 0」 만 뜨면 왜 안 오르는지 알 수 없다 */
  next: { hanja: string; left: number; need: number } | null;
  merit: number;
  /** 무엇을 몇 번 — 많이 한 것부터 넉 장만 */
  hits: { label: string; n: number }[];
  /** 접었다 펴는 두 자리 — 안에 들어갈 것은 부모가 그려 준다 */
  charms: React.ReactNode;
  bells: React.ReactNode;
  /** 서비스 전부 — 형: 「서비스 다 넣어주고」. 한자 한 글자와 이름 */
  services: { href: string; mark: string; label: string }[];
  /** 법명 고치기 — 맞으면 null, 어긋나면 까닭을 돌려준다 */
  onRename: (next: string) => string | null;
  /** 법명 다시 뽑기 */
  onReroll: () => void;
  /** 적는 동안 미리 살펴 주는 검사 */
  nameProblem: (raw: string) => string | null;
};

export default function HipMe({
  name,
  rank,
  seats,
  pct,
  next,
  merit,
  hits,
  charms,
  bells,
  services,
  onRename,
  onReroll,
  nameProblem,
}: HipMeProps) {
  // 법명 고치기 — 그 자리에서 편다. 화면을 옮기지 않는다
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
    <div className="hip-screen hip-screen-scroll md:hidden">
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
        {/* 형: 「오른쪽 위에 ⋯ 기능 필요 없어, 일단 없애.
            대신 그거 눌린 내 도량 기능을 아래 탭 내 도량에 뜨게」 —
            그래서 접는 자리를 없애고 이 화면이 그 내용을 다 가진다 */}
        <span className="hip-kicker">我</span>
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
              </p>
            )}
            {(err ?? (editing ? nameProblem(draft) : null)) && (
              <p className="hip-name-bad">{err ?? nameProblem(draft)}</p>
            )}
            <p className="hip-me-rank">
              <b>{rank.hanja}</b> {rank.name}
            </p>
          </div>
        </div>

        {/* ── 자리 — 가로로 ──
            형: 「자리는 가로 형태로 두고」. 여섯 자리를 한 줄에 늘어놓고
            지나온 곳은 물들이고, 지금 자리만 크게. 한자 여섯이면 족하다 */}
        <div className="hip-seats">
          {seats.map((r) => (
            <i
              key={r.hanja}
              data-got={r.got ? "1" : undefined}
              data-here={r.here ? "1" : undefined}
            >
              {r.hanja}
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
          <details className="hip-info">
            <summary aria-label="공덕이란">ⓘ</summary>
            <div>
              목탁·염주·절·명상 — 수행하면 공덕이 쌓입니다.
              <br />
              하루치를 다 채우면({LOTUS_PRICE.toLocaleString("ko-KR")}) 연꽃 한 송이.
              <br />
              연꽃으로 쪽지를 보내고 초를 올립니다.
            </div>
          </details>
        </div>

        {/* 무엇을 몇 번 — 형: 「공덕 쌓은 거 라벨 이런 식으로 넣어.
            모든 기능 중 공덕 주는 건 다. 대신 한 횟수를 표기」.
            넉 장짜리 격자를 알약 줄로 바꿨다. 칸이 정해져 있지 않으니
            여덟이든 열둘이든 줄을 바꿔 가며 다 담긴다 — 「다」 라는 말은
            개수를 모른다는 뜻이고, 격자는 개수를 알아야 짜인다. */}
        <div className="hip-me-hits">
          {hits.map((h) => (
            <span key={h.label}>
              {h.label} <b>{h.n.toLocaleString("ko-KR")}</b>번
            </span>
          ))}
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
      </div>

    </div>
    </HipShell>
  );
}
