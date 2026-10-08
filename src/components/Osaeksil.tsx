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
import { SIL_EVENT, 결, 닳음, 실매기, 실읽기, type 실 } from "@/lib/sil";

/** 꼬인 끈 한 가닥. 가닥마다 같은 물결에 위상만 달리 태워 서로 꼬이게 한다 */
export function SilCord({ wear, className = "" }: { wear: number; className?: string }) {
  const W = 330, H = 62, cy = 31;
  const 색 = ["#d7342f", "#1b3a7a", "#e8c33a", "#ffffff", "#2f8f4e"]; // 적·청·황·백·녹
  const g = 결(wear);
  const 바램 = [0, 0.2, 0.4, 0.6, 0.76, 0.82][g];
  const 풀림 = [0, 0.6, 1.4, 2.4, 3.6, 4][g];
  const 끊김 = g >= 5;
  const 꼬임 = 7;
  const 남은색 = Math.round((1 - 바램) * 100);
  const 점 = (i: number, t: number) =>
    cy + Math.sin(t * Math.PI * 2 * 꼬임 + (i / 색.length) * Math.PI * 2) * (3.4 + 풀림 * 1.9);
  const 줄 = (i: number, a: number, b: number, 벌림 = 0) => {
    let d = "";
    for (let k = 0; k <= 44; k++) {
      const t = a + ((b - a) * k) / 44;
      const x = 8 + (W - 16) * t;
      const y = 점(i, t) + 벌림 * (i - 2) * 1.6;
      d += `${k ? " L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      {색.map((c, i) => {
        const col = `color-mix(in srgb, ${c} ${남은색}%, #efeae0)`;
        const w = c === "#ffffff" ? 3.1 : 2.8;
        return (
          <g key={i}>
            <path d={줄(i, 0, 끊김 ? 0.42 : 1)} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />
            {끊김 && (
              <path d={줄(i, 0.58, 1, 1)} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />
            )}
          </g>
        );
      })}
      {/* 삐져나온 올 — 이것이 「낡았다」를 말한다. 글로 안 적는 까닭 */}
      {!끊김 &&
        g >= 3 &&
        [[0.3, -1], [0.55, 1], [0.78, -1]].slice(0, g - 2).map(([f, dir], k) => {
          const x = 8 + (W - 16) * f;
          const y = cy + dir * 6;
          return (
            <path
              key={`f${k}`}
              d={`M${x} ${y} q 7 ${dir * 6}, 15 ${dir * 4}`}
              fill="none"
              stroke={`color-mix(in srgb, ${색[(k * 2) % 5]} ${남은색}%, #efeae0)`}
              strokeWidth="1.7"
              strokeLinecap="round"
              opacity=".9"
            />
          );
        })}
      {(끊김 ? [0.16] : [0.16, 0.44, 0.74]).map((f) => (
        <rect
          key={f}
          x={8 + (W - 16) * f - 5.5}
          y={cy - 10}
          width="11"
          height="20"
          rx="5"
          fill="none"
          stroke={`color-mix(in srgb,#8d8378 ${Math.round((1 - 바램) * 80 + 20)}%, #efeae0)`}
          strokeWidth="2.3"
        />
      ))}
    </svg>
  );
}

export default function Osaeksil() {
  const [s, setS] = useState<실 | null>(null);
  const [총, 총잡기] = useState(0);
  const [쓰기, 쓰기잡기] = useState(false);
  const [소원, 소원잡기] = useState("");

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
              맨다
            </button>
          </div>
        ) : (
          <button className="hip-sil-go" onClick={() => 쓰기잡기(true)}>
            五色絲 · 실 받기
          </button>
        )}
      </div>
    );
  }

  const d = 닳음(s, 총);
  return (
    <div className="hip-sil" data-cut={결(d) >= 5 ? "1" : undefined}>
      <p className="hip-sil-lab">五色絲</p>
      <SilCord wear={d} className="hip-sil-cord" />
      <p className="hip-sil-wish">{s.wish || " "}</p>
    </div>
  );
}
