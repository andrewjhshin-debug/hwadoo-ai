"use client";

// 실이 끊어진 순간 — 어느 화면에 있든 한 번 뜬다.
// 끊어지는 것이 이 기능의 **보상**이라, 我 탭에 들어가야만 알 수 있으면
// 아무 일도 안 일어난 것과 같다.
//
// 글자는 셋뿐이다 — 願成就 · 소원 · 공덕. 설명하지 않는다.

import { useCallback, useEffect, useState } from "react";
import { addMerit, MERIT_EVENT, loadMerit } from "@/lib/merit";
import { SIL_EVENT, 결, 닳음, 실매기, 실읽기, 실쓰기 } from "@/lib/sil";
import { SilCord } from "@/components/Osaeksil";

export default function SilCut() {
  const [열림, 열림잡기] = useState(false);
  const [소원, 소원잡기] = useState("");
  const [빈소원, 빈소원잡기] = useState("");

  const 살피기 = useCallback(() => {
    const s = 실읽기();
    if (!s || s.cut) return;
    if (결(닳음(s, loadMerit().total)) < 5) return;
    // 끊어진 것을 장부에 먼저 적는다 — 다시 그려도 두 번 안 터지게
    실쓰기({ ...s, cut: true });
    소원잡기(s.wish);
    열림잡기(true);
    addMerit("daily"); // 실 한 가닥 몫 — 하루 갈래로 적는다
  }, []);

  useEffect(() => {
    살피기();
    window.addEventListener(MERIT_EVENT, 살피기);
    window.addEventListener(SIL_EVENT, 살피기);
    return () => {
      window.removeEventListener(MERIT_EVENT, 살피기);
      window.removeEventListener(SIL_EVENT, 살피기);
    };
  }, [살피기]);

  if (!열림) return null;
  return (
    <div className="hip-silcut" role="dialog" aria-label="실이 끊어졌습니다">
      <div className="hip-silcut-box">
        <p className="hip-silcut-k">願 成 就</p>
        <SilCord wear={1} className="hip-silcut-cord" />
        <p className="hip-silcut-wish">{소원}</p>
        <div className="hip-silcut-ask">
          <input
            maxLength={20}
            value={빈소원}
            onChange={(e) => 빈소원잡기(e.target.value)}
            placeholder="다음 소원"
          />
          <button
            disabled={!빈소원.trim()}
            onClick={() => {
              실매기(빈소원, loadMerit().total);
              열림잡기(false);
              빈소원잡기("");
            }}
          >
            맨다
          </button>
        </div>
        <button className="hip-silcut-later" onClick={() => 열림잡기(false)}>
          나중에
        </button>
      </div>
    </div>
  );
}
