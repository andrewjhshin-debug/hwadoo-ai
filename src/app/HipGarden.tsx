"use client";

// ─────────────────────────────────────────────────────────────
// 뜰 — 폰 판.
//
// 형: 「핵심은 단순 흰색도 아니고 오리지널의 변주도 아니고
//      아예 미니멀 힙 새로운, 동영상 같은 느낌의 그런 걸 만드는 거야」
//
// 그래서 옛 화면을 칠하지 않는다. **판을 새로 짠다.**
// 참고 영상(김부따)에서 가져올 뼈대는 넷뿐이다 —
//   ① 화면 하나에 **큰 것 하나**. 그게 곧 그 화면이다
//   ② 글자는 **한 줄**. 나머지는 지운다
//   ③ 떠 있는 둥근 것들 — 알약 하나, 동그라미 하나
//   ④ 아래는 **점만**. 라벨도 테도 없다
// 결은 우리 것으로 — 흰 종이에 연꽃 분홍과 민트가 번지고, 큰 것은
// 오브제가 아니라 **물음 그 자체**다. 그게 화두다.
//
// 두 자리 —
//   비었을 때 : 연꽃 하나가 크게 뜨고, 검은 알약 하나
//   들었을 때 : 물음이 화면을 채우고, 달이 차오르는 실 한 올
//
// 기능은 한 줄도 새로 안 짰다. 뽑기·회향·초안·홀딩은 전부 page.tsx 가
// 쥐고 있고 여기는 받아 그린다 — 통째로 지워도 앱은 예전대로 돈다.
// ─────────────────────────────────────────────────────────────

import HipShell from "@/components/HipShell";

/** 비어 있는 뜰 — 연꽃 하나와 단추 하나 */
export function HipGardenEmpty({
  audience,
  onAudience,
  onReceive,
}: {
  audience: "adult" | "student";
  onAudience: (a: "adult" | "student") => void;
  onReceive: () => void;
}) {
  return (
    <HipShell here="/">
    <div className="hip-screen md:hidden">
      <span aria-hidden className="hip-bloom hip-bloom-a" />
      <span aria-hidden className="hip-bloom hip-bloom-b" />

      <header className="hip-screen-top">
        <span className="hip-kicker">話頭</span>
        {/* 누구의 물음인가 — 알약 하나로 말 없이 */}
        <div className="hip-seg" role="group" aria-label="누구의 화두">
          {(
            [
              ["adult", "성인"],
              ["student", "어린이"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => onAudience(k)}
              aria-pressed={audience === k}
              data-on={audience === k ? "1" : undefined}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className="hip-screen-mid">
        {/* 큰 것 하나 — 코드로 그린 연꽃. 숨 쉬듯 아주 느리게 돈다 */}
        <span aria-hidden className="hip-lotus">
          <svg viewBox="0 0 200 200">
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse
                key={i}
                cx="100"
                cy="62"
                rx="21"
                ry="43"
                transform={`rotate(${i * 45} 100 100)`}
              />
            ))}
            <circle cx="100" cy="100" r="11" />
          </svg>
        </span>
        <p className="hip-ask">
          오늘의 물음을
          <br />
          받으시겠습니까
        </p>
      </div>

      <button onClick={onReceive} className="hip-strike">
        새 화두 받기
      </button>
    </div>
    </HipShell>
  );
}

/** 화두를 들고 있는 뜰 — 물음이 곧 화면이다 */
export function HipGardenHolding({
  question,
  source,
  day,
  unlocked,
  pct,
  remaining,
  onOpen,
  onNotes,
  onFocus,
}: {
  question: string;
  source?: string | null;
  day: number;
  unlocked: boolean;
  /** 달이 차오른 정도 0~100 */
  pct: number;
  /** 남은 시간 한 마디 (예: 「2일 4시간」) */
  remaining: string;
  onOpen: () => void;
  onNotes: () => void;
  onFocus: () => void;
}) {
  const n = question.replace(/\s+/g, " ").trim().length;
  const size = n <= 26 ? "a" : n <= 52 ? "b" : "c";
  return (
    <HipShell here="/">
    <div className="hip-screen md:hidden">
      <span aria-hidden className="hip-bloom hip-bloom-a" />
      <span aria-hidden className="hip-bloom hip-bloom-b" />

      <header className="hip-screen-top">
        <span className="hip-kicker">第 {day} 日</span>
        <button onClick={onFocus} aria-label="물음만 보기" className="hip-more">
          ○
        </button>
      </header>

      <div className="hip-screen-mid">
        {/* 큰 것 하나 — 오브제가 아니라 **물음**이다 */}
        <p className={`hip-q hip-q-${size}`}>{question}</p>
        {source && <p className="hip-q-by">{source}</p>}
      </div>

      {/* 달 — 막대가 아니라 실 한 올. 차면 금이 끝까지 간다 */}
      <div className="hip-moon" aria-label={unlocked ? "달이 찼습니다" : `${remaining} 남음`}>
        <i style={{ width: `${unlocked ? 100 : pct}%` }} />
      </div>
      <p className="hip-under">{unlocked ? "달이 찼습니다" : remaining}</p>

      <button onClick={unlocked ? onOpen : onNotes} className="hip-strike">
        {unlocked ? "붓을 들다" : "사유의 방"}
      </button>
    </div>
    </HipShell>
  );
}
