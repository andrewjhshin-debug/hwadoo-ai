"use client";

// ─────────────────────────────────────────────────────────────
// 내 프로필 — 남이 보는 그대로.
//
// 형: 「올린 사진이랑 프로필은 내 도량에서 볼 수 있게 해. 다만 동그라미
//      프로필에 사진 하고 그 안에 돋보기 넣고, 그걸 누르면 다른 화면으로
//      가고 그 프로필 사진이랑 아래에 프로필 쓴 거 보이도록」
//
// 고치는 화면(/gathering/me)과 **일부러 다르게** 짰다. 거기는 칸을
// 채우는 자리고, 여기는 **오늘의 인연이 내 카드를 보는 그 눈**이다.
// 그래서 카드 생김새를 오늘의 인연과 한 글자도 다르지 않게 쓴다 —
// 내가 어떻게 보이는지 알아야 무엇을 고칠지 안다.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useState } from "react";
import HipRoom from "@/components/HipRoom";
import { watchAuth } from "@/lib/sync";
import { 나이, 내프로필, 모자란것, type 인연프로필 } from "@/lib/yeon";

export default function 내프로필보기() {
  const [있나, 있나잡기] = useState<boolean | null>(null);
  const [me, setMe] = useState<인연프로필 | null | undefined>(undefined);
  const [장, 장잡기] = useState(0);

  useEffect(
    () =>
      watchAuth(async (u) => {
        있나잡기(!!u);
        setMe(u ? await 내프로필() : null);
      }),
    []
  );

  const 사진 = (me?.photos ?? []).filter((f) => f.state !== "no");
  const 살 = me?.born ? 나이(me.born) : 0;
  const 빠진 = 모자란것(me ?? null);

  return (
    <HipRoom here="/gathering/me/view" lanes={false} rail="/gathering" scroll>
      <div className="hip-yeon">
        <p className="hip-yeon-head">因緣 · 남이 보는 나</p>

        {있나 === false && <p className="hip-yeon-say">들어온 뒤에 열립니다</p>}

        {있나 && me === undefined && <p className="hip-yeon-say">…</p>}

        {있나 && me === null && (
          <div className="hip-yeon-met" data-quiet="1">
            <b aria-hidden>緣</b>
            <p>아직 프로필이 없습니다</p>
            <Link href="/gathering/me" className="hip-yeon-hap">
              만들기
            </Link>
          </div>
        )}

        {me && (
          <>
            {/* 못 채운 것이 있으면 맨 위에 — 남에게는 아직 안 보인다는 뜻 */}
            {빠진.length > 0 && (
              <div className="hip-yeon-need">
                {빠진.map((x) => (
                  <span key={x}>{x}</span>
                ))}
              </div>
            )}

            <div className="hip-yeon-card">
              <div
                className="hip-yeon-face"
                onClick={() => 사진.length > 1 && 장잡기((v) => (v + 1) % 사진.length)}
                role={사진.length > 1 ? "button" : undefined}
                aria-label={사진.length > 1 ? "다음 사진" : undefined}
              >
                {사진.length > 1 && (
                  <span className="hip-yeon-ticks" aria-hidden>
                    {사진.map((f, i) => (
                      <i key={f.path} data-on={i === 장 ? "1" : undefined} />
                    ))}
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {사진[장] ? (
                  <img src={사진[장].url} alt="" draggable={false} />
                ) : (
                  <em />
                )}
                {사진[장]?.state === "pending" && (
                  <span className="hip-yeon-wait">보는 중</span>
                )}
                <span className="hip-yeon-who">
                  <b>{me.name || "이름 없는 이"}</b>
                  {살 > 0 && <i>{살}</i>}
                  {me.area && <u>{me.area}</u>}
                </span>
              </div>

              <div className="hip-yeon-tags">
                {/* 절은 따로 동의한 사람 것만 — 서버도 같은 줄로 막는다 */}
                {me.religionOk && me.temple && (
                  <span data-temple="1">{me.temple}</span>
                )}
                {me.job && <span>{me.job}</span>}
                {me.tall ? <span>{me.tall}cm</span> : null}
                {me.mbti && <span>{me.mbti}</span>}
                {me.smoke && <span>흡연 {me.smoke}</span>}
                {me.drink && <span>음주 {me.drink}</span>}
                {[...(me.vibe ?? []), ...(me.like ?? []), ...(me.care ?? [])].map(
                  (x) => (
                    <span key={x}>{x}</span>
                  )
                )}
                {me.merit?.rank && <span data-rank="1">{me.merit.rank}</span>}
              </div>

              {me.line ? (
                <p className="hip-yeon-line">{me.line}</p>
              ) : (
                <p className="hip-yeon-line" data-empty="1">
                  한 마디가 비어 있습니다
                </p>
              )}
            </div>

            <div className="hip-yeon-hands">
              <Link href="/gathering/me" className="hip-ghost">
                고치기
              </Link>
              <Link href="/gathering/yeon" className="hip-yeon-hap">
                오늘의 인연
              </Link>
            </div>
          </>
        )}
      </div>
    </HipRoom>
  );
}
