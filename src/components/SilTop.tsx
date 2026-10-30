"use client";

// ─────────────────────────────────────────────────────────────
// 머리 오른쪽의 오색실 — 내 도량 안에 묻혀 있던 것을 앞으로 뺐다.
//
// 형: 「이거 전면으로 빼자. 포행 OFF 랑 연잎 사이, 오른쪽 위에 오색실 기능으로
//      연동해서 헤지는 것까지. 실 5가닥 정도로 하고 눌리면 팝업으로 뜨도록」
//
// 오색실은 **출석할수록 닳는** 물건이다. 내 도량(我)에 들어가야만 보이면
// 닳는 것이 눈에 안 띈다 — 어느 판에 있든 머리에서 보여야 한다.
//
// 아이콘은 글자 없이 다섯 가닥(흰·노·초·빨·파)이 매듭에 달려 있다.
// 가닥마다 **차례로** 닳는다 — 첫 가닥이 먼저 짧아지고 끝이 풀려 털이 서고,
// 마지막 가닥이 제일 늦게. 하루 온 날수(21일)로 닳으니 출석이 곧 이 그림이다.
// 누르면 팝업이 뜨고, 그 안은 내 도량에 있던 오색실 그대로다(소원·고치기·
// 새 실 받기). 새로 짠 것은 머리 아이콘과 팝업 틀뿐이다.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Osaeksil from "@/components/Osaeksil";
import { MERIT_EVENT } from "@/lib/merit";
import { SIL_EVENT, 닳음, 실읽기 } from "@/lib/sil";

/** 흰 · 노 · 초 · 빨 · 파 — 형이 말한 오색의 순서 */
const 빛 = ["#e9dfc9", "#f2b03a", "#6ba575", "#cf5d5a", "#5b7fae"];
const 자리 = [5.2, 8.6, 12, 15.4, 18.8];

const 눌러 = (v: number) => Math.max(0, Math.min(1, v));

/** 가닥 하나가 얼마나 닳았나 — 앞 가닥이 먼저, 뒤 가닥이 늦게(끝에는 모두) */
function 가닥닳음(wear: number, i: number) {
  return 눌러((wear - i * 0.1) / 0.6);
}

function 실그림({ wear }: { wear: number | null }) {
  const 없음 = wear === null;
  return (
    <svg viewBox="0 0 24 26" aria-hidden>
      {자리.map((x, i) => {
        const w = 없음 ? 0 : 가닥닳음(wear, i);
        const 끝 = 23 - w * 8; // 닳을수록 짧아진다
        const 휨 = i % 2 ? 1.1 : -1.1; // 땋은 듯 엇갈리게
        const 색 = 없음 ? "#cdc2c8" : 빛[i];
        const 투명 = 없음 ? 0.55 : 1 - w * 0.5;
        return (
          <g key={i} style={{ opacity: 투명 }}>
            <path
              d={`M${x} 5.5 C${x + 휨} 10 ${x - 휨} 16 ${x} ${끝}`}
              style={{ stroke: 색, strokeWidth: 2.3, fill: "none", strokeLinecap: "round" }}
            />
            {/* 끝이 풀려 털이 선다 — 어느 정도 닳은 가닥부터 */}
            {w > 0.3 && (
              <g style={{ stroke: 색, strokeWidth: 0.8, fill: "none", strokeLinecap: "round", opacity: 0.85 }}>
                <path d={`M${x} ${끝} l-1.7 2.4`} />
                <path d={`M${x} ${끝} l0.2 2.9`} />
                <path d={`M${x} ${끝} l1.7 2.2`} />
              </g>
            )}
          </g>
        );
      })}
      {/* 매듭 — 다섯 가닥을 한데 묶은 자리 */}
      <rect x="3" y="3" width="18" height="3.4" rx="1.7" style={{ fill: 없음 ? "#d9cfd4" : "#e9a6bd", stroke: "none" }} />
    </svg>
  );
}

export default function SilTop() {
  const [wear, wearSet] = useState<number | null>(null);
  const [열림, 열림잡기] = useState(false);

  const 읽기 = useCallback(() => {
    const s = 실읽기();
    wearSet(s ? 닳음(s) : null);
  }, []);

  useEffect(() => {
    읽기();
    window.addEventListener(SIL_EVENT, 읽기);
    window.addEventListener(MERIT_EVENT, 읽기);
    window.addEventListener("storage", 읽기);
    // 다른 앱에 갔다 돌아오면 날이 바뀌어 있을 수 있다
    document.addEventListener("visibilitychange", 읽기);
    return () => {
      window.removeEventListener(SIL_EVENT, 읽기);
      window.removeEventListener(MERIT_EVENT, 읽기);
      window.removeEventListener("storage", 읽기);
      document.removeEventListener("visibilitychange", 읽기);
    };
  }, [읽기]);

  useEffect(() => {
    if (!열림) return;
    const 닫기 = (e: KeyboardEvent) => e.key === "Escape" && 열림잡기(false);
    window.addEventListener("keydown", 닫기);
    return () => window.removeEventListener("keydown", 닫기);
  }, [열림]);

  return (
    <>
      <button
        type="button"
        className="hip-top-ico hip-sil-top"
        aria-label="오색실"
        aria-expanded={열림}
        onClick={() => 열림잡기((v) => !v)}
      >
        <실그림 wear={wear} />
      </button>

      {/* 통(.hip-screen) 안에 두면 눌리지 않는다 — body 바로 아래로 꺼낸다 */}
      {열림 &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button type="button" className="hip-today-scrim" aria-label="오색실 닫기" onClick={() => 열림잡기(false)} />
            <section className="hip-today-popover hip-sil-pop" role="dialog" aria-modal="true" aria-label="오색실">
              <button type="button" className="hip-sil-pop-x" aria-label="닫기" onClick={() => 열림잡기(false)}>
                ×
              </button>
              <Osaeksil />
            </section>
          </>,
          document.body
        )}
    </>
  );
}
