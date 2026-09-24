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

import HipShell from "@/components/HipShell";

export type HipMeProps = {
  /** 법명 */
  name: string;
  /** 지금 자리의 한자 · 이름 */
  rank: { hanja: string; name: string };
  /** 다음 자리까지 0~100 */
  pct: number;
  /** 다음 자리 한자 · 남은 공덕 · 모자란 화두 수. 꼭대기면 null.
      자리는 공덕만으로 안 오른다 — 「沙 0」 만 뜨면 왜 안 오르는지 알 수 없다 */
  next: { hanja: string; left: number; need: number } | null;
  merit: number;
  /** 무엇을 몇 번 — 많이 한 것부터 넉 장만 */
  hits: { label: string; n: number }[];
  onMore: () => void;
};

export default function HipMe({
  name,
  rank,
  pct,
  next,
  merit,
  hits,
  onMore,
}: HipMeProps) {
  return (
    <HipShell here="/settings">
    <div className="hip-screen md:hidden">
      <span aria-hidden className="hip-bloom hip-bloom-a" />
      <span aria-hidden className="hip-bloom hip-bloom-b" />

      <header className="hip-screen-top">
        <span className="hip-kicker">我</span>
        <button onClick={onMore} aria-label="더" className="hip-more">
          ⋯
        </button>
      </header>

      <div className="hip-screen-mid">
        {/* 이름과 자리 — 형: 「동자승 캐릭터 쓰지 말라고」.
            얼굴 그림을 뺐다. 법명 한 줄과 자리 한자면 족하다 */}
        <div className="hip-me-head">
          <div>
            <p className="hip-me-name">{name}</p>
            <p className="hip-me-rank">
              <b>{rank.hanja}</b> {rank.name}
            </p>
          </div>
        </div>

        {/* 다음 자리까지 — 실 한 올과 한자 하나 */}
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
        <p className="hip-me-merit-k">功 德</p>

        {/* 무엇을 몇 번 — 넉 장이면 족하다 */}
        <div className="hip-me-hits">
          {hits.map((h) => (
            <div key={h.label}>
              <b>{h.n.toLocaleString("ko-KR")}</b>
              <span>{h.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
    </HipShell>
  );
}
