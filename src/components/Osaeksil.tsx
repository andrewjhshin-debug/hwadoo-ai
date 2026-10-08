"use client";

// ─────────────────────────────────────────────────────────────
// 오색실 — 我 탭 맨 위에 한 가닥.
//
// 형: 「오색실에 텍스트 너무 많이 하지 마라, 최대한 줄이고」
// 그래서 이 카드에 글자는 **둘**뿐이다 — 「五色絲」와 소원 한 줄.
// 몇 퍼센트 닳았는지도 안 적는다. **색이 말한다.**
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { MERIT_EVENT, loadMerit } from "@/lib/merit";
import { SIL_EVENT, 결, 닳음, 소원고치기, 실매기, 실읽기, type 실 } from "@/lib/sil";

/**
 * 꼬인 끈 한 가닥 — 네 장을 겹쳐 두고 **닳은 만큼 갈아 낀다.**
 *
 * 처음엔 SVG 로 그렸다. 가닥은 꼬였는데 면사로는 안 보였다 — 실은 선이
 * 아니라 **보풀**이다. 형: 「실 디자인 시안만 다시 제미나이 써도 된다고」.
 * 제미나이 Pro 로 네 결을 굽고 초록을 뽑았다(_틀/chroma.mjs).
 *
 * 결 사이는 **겹쳐 녹인다** — 네 장뿐이라 그냥 갈아 끼우면 뚝뚝 끊긴다.
 * 아래 장을 깔고 위 장을 서서히 띄우면 색이 천천히 빠지는 것으로 보인다.
 */
const 결그림 = ["/obj/sil-sae.png", "/obj/sil-baram.png", "/obj/sil-seong.png", "/obj/sil-cut.png"];
/** 각 그림이 온전히 보이는 지점(닳음 0~1) */
const 결점 = [0, 0.4, 0.78, 1];

export function SilCord({ wear, className = "" }: { wear: number; className?: string }) {
  const w = Math.max(0, Math.min(1, wear));
  // 지금 어느 두 장 사이인가
  let k = 0;
  while (k < 결점.length - 2 && w >= 결점[k + 1]) k++;
  const 폭 = 결점[k + 1] - 결점[k];
  const 섞 = 폭 > 0 ? Math.max(0, Math.min(1, (w - 결점[k]) / 폭)) : 1;
  return (
    <span className={`hip-sil-stack ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={결그림[k]} alt="" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={결그림[k + 1]} alt="" draggable={false} style={{ opacity: 섞 }} />
    </span>
  );
}

/**
 * 오색실이 무엇인가 — **두 줄.**
 *
 * 형: 「덜 오글거리게 간략하게」. 앞서 적은 「소원이 건너간다고
 * 합니다」가 그 오글거림이었다. 뜻은 끊어질 때 뜨는 願成就 가 이미
 * 지고 있다 — 여기서는 **셈만** 말한다.
 */
function 실풀이() {
  return (
    <p className="hip-sil-why">
      수행할수록 바랩니다. 쉬면 그대로입니다.
      <br />
      끊어지면 새로 맵니다 — 빨라도 삼칠일.
    </p>
  );
}

export default function Osaeksil() {
  const [s, setS] = useState<실 | null>(null);
  const [총, 총잡기] = useState(0);
  const [쓰기, 쓰기잡기] = useState(false);
  const [소원, 소원잡기] = useState("");
  const [풀이, 풀이잡기] = useState(false);
  /** 소원 고치는 중인가 — 고쳐도 닳음은 안 되감긴다 */
  const [고침, 고침잡기] = useState(false);

  const 읽기 = useCallback(() => {
    setS(실읽기());
    총잡기(loadMerit().total);
  }, []);

  useEffect(() => {
    읽기();
    window.addEventListener(MERIT_EVENT, 읽기);
    window.addEventListener(SIL_EVENT, 읽기);
    return () => {
      window.removeEventListener(MERIT_EVENT, 읽기);
      window.removeEventListener(SIL_EVENT, 읽기);
    };
  }, [읽기]);

  // 아직 맨 적이 없다 — 한 줄짜리 들머리
  if (!s || 쓰기) {
    return (
      <div className="hip-sil hip-sil-new">
        <SilCord wear={0} className="hip-sil-cord" />
        {쓰기 ? (
          <div className="hip-sil-ask">
            <input
              autoFocus
              maxLength={20}
              value={소원}
              onChange={(e) => 소원잡기(e.target.value)}
              placeholder="소원 한 줄"
              onKeyDown={(e) => {
                if (e.key === "Enter" && 소원.trim()) {
                  실매기(소원, loadMerit().total);
                  쓰기잡기(false);
                  소원잡기("");
                }
              }}
            />
            <button
              disabled={!소원.trim()}
              onClick={() => {
                실매기(소원, loadMerit().total);
                쓰기잡기(false);
                소원잡기("");
              }}
            >
              매기
            </button>
          </div>
        ) : (
          <>
            <button className="hip-sil-go" onClick={() => 쓰기잡기(true)}>
              五色絲 · 실 받기
              <i
                role="button"
                tabIndex={0}
                aria-label="오색실이란"
                onClick={(e) => { e.stopPropagation(); 풀이잡기((v) => !v); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); 풀이잡기((v) => !v); } }}
              >
                ⓘ
              </i>
            </button>
            {풀이 && <실풀이 />}
          </>
        )}
      </div>
    );
  }

  const d = 닳음(s, 총);
  return (
    <div className="hip-sil" data-cut={결(d) >= 5 ? "1" : undefined}>
      <p className="hip-sil-lab">
        五色絲
        <button
          type="button"
          className="hip-info-key"
          onClick={() => 풀이잡기((v) => !v)}
          aria-expanded={풀이}
          aria-label="오색실이란"
        >
          ⓘ
        </button>
      </p>
      {풀이 && <실풀이 />}
      <SilCord wear={d} className="hip-sil-cord" />
      {고침 ? (
        <div className="hip-sil-ask">
          <input
            autoFocus
            maxLength={20}
            defaultValue={s.wish}
            onChange={(e) => 소원잡기(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { 소원고치기(소원 || s.wish); 고침잡기(false); }
              if (e.key === "Escape") 고침잡기(false);
            }}
          />
          <button onClick={() => { 소원고치기(소원 || s.wish); 고침잡기(false); }}>고침</button>
        </div>
      ) : (
        /* 소원을 누르면 고친다. 연필 아이콘을 따로 달지 않는다 —
           고칠 것이 글자 하나뿐이면 그 글자가 곧 단추다 */
        <button
          type="button"
          className="hip-sil-wish"
          onClick={() => { 소원잡기(s.wish); 고침잡기(true); }}
        >
          {s.wish || "소원 적기"}
        </button>
      )}
    </div>
  );
}
