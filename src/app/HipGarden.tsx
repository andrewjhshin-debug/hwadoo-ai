"use client";

// ─────────────────────────────────────────────────────────────
// 뜰 — 폰 판. 한지 활자.
//
// 형: 「이 느낌 존나 좋았거든 빼지 말고 넣고」
//     (한지 바탕 · 세로 話頭 · 第 十七 日 · 큰 세리프 물음 · 趙州 從諗 ·
//      얇은 선 하나 · 사흘째 품는 중 / 답하기)
//
// 그래서 화두 갈래만 **결을 갈랐다.** 공덕은 흰 종이에 분홍과 민트로 놀고,
// 화두는 한지에 먹으로 가라앉는다. 한 앱에 두 얼굴이 아니라, 두 마음이다 —
// 치는 일은 즐겁고 묻는 일은 고요하다. 같은 낯으로 둘 이유가 없다.
//
// 참고 시안에서 가져온 뼈대 다섯 —
//   ① 한지 바탕(#f1eee6)에 먹 글자. 분홍은 아주 옅은 홍조로만 남는다
//   ② 좌상단에 **話頭 세로 워터마크** — 크게, 거의 안 보이게. 화면의 결
//   ③ 우상단 **第 三 日** — 아라비아가 아니라 한자로 센다
//   ④ 큰 세리프 물음 하나. 출처는 한자로 자간을 벌려 한 줄
//   ⑤ 바닥에 **얇은 선 하나** — 그 선이 곧 달이다. 차오른 만큼 먹이 간다.
//      선 아래 왼쪽은 남은 때, 오른쪽은 할 일 하나
//
// 막대도 알약도 없앴다. 시안에 없던 것은 넣지 않는다.
//
// 기능은 한 줄도 새로 안 짰다. 뽑기·회향·초안·홀딩은 전부 page.tsx 가
// 쥐고 있고 여기는 받아 그린다 — 통째로 지워도 앱은 예전대로 돈다.
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import HipShell from "@/components/HipShell";
import HipTop from "@/components/HipTop";
import { durationLabel } from "@/lib/store";

/** 글자 크기 — **가장 긴 한 줄**로 고른다.
    brief 는 줄을 손으로 끊어 두었으니, 통글자수로 재면 두 줄짜리가
    공연히 쪼그라든다. 화면을 채우는 건 결국 제일 긴 줄이다. */
function qSize(q: string): "a" | "b" | "c" {
  const lines = q.trim().split(/\n/);
  const w = Math.max(...lines.map((l) => l.trim().length));
  const all = q.replace(/\s+/g, " ").trim().length;
  if (w <= 15 && all <= 34) return "a";
  if (w <= 22 && all <= 60) return "b";
  return "c";
}

/** 며칠째 품고 있나 — 우리말로. 시안의 「사흘째 품는 중」 그 자리다.
    초까지 세는 숫자는 이 결에 시끄럽다. 남은 때는 바닥의 선이 이미
    말하고 있으니, 글은 며칠째인지만 말한다. */
const NAL = ["", "하루", "이틀", "사흘", "나흘", "닷새", "엿새", "이레", "여드레", "아흐레", "열흘"];
function nalcha(n: number): string {
  return n >= 1 && n <= 10 ? `${NAL[n]}째` : `${n}일째`;
}

/** 날을 한자로 — 第 三 日. 아라비아 숫자는 이 결에 안 맞는다 */
const HAN = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
function hanja(n: number): string {
  if (n <= 0) return HAN[0];
  if (n < 10) return HAN[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return (t > 1 ? HAN[t] : "") + "十" + (o ? HAN[o] : "");
  }
  return String(n);
}

/** 화면의 결 — 세로로 눕힌 話頭. 크고, 거의 안 보이게.
    줄바꿈을 넣으면 안 된다 — 세로쓰기에서 <br> 은 **칸**을 가르고
    칸은 오른쪽부터 읽혀서 頭話 가 된다. 한 칸에 두 글자를 넣으면
    저절로 위에서 아래로 앉는다. */
function Mark() {
  return (
    <span aria-hidden className="hip-mark">
      話頭
    </span>
  );
}

/** 비어 있는 뜰 — 연꽃을 광배 삼아 앉은 상 하나와 단추 하나 */
export function HipGardenEmpty({
  audience,
  onAudience,
  onReceive,
  join,
}: {
  audience: "adult" | "student";
  onAudience: (a: "adult" | "student") => void;
  onReceive: () => void;
  /** 손님이 단추를 눌렀을 때 — 문을 연다. 아니면 null */
  join?: {
    busy: boolean;
    error: string;
    onJoin: () => void;
    onClose: () => void;
  } | null;
}) {
  return (
    <HipShell here="/">
      <div className="hip-screen hip-hanji">
        <span aria-hidden className="hip-bloom hip-bloom-a" />
        <Mark />

        <header className="hip-screen-top">
          <HipTop />
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
          {/* ── 큰 것 하나 — 연꽃 ──
              형: 「오늘의 물음을 받으시겠습니까에서 불상 치워버리고」.
              상을 앉혀 봤는데, 물음을 받기 **전**에 누가 먼저 앉아 있으면
              그 화면의 주인이 바뀐다. 여기 주인은 아직 오지 않은 물음이다.
              그래서 연꽃 하나만 천천히 돈다 — 빈 자리로 둔다. */}
          <span aria-hidden className="hip-seat">
            <span className="hip-lotus">
              {/* 형: 「난 이거 좋았다, 이걸로 가되 가운데 노란색 부분만
                  신경 써 봐」 「뾰족 튀어나온 부분까지도」

                  잎 여덟이 **다** 겹치는 자리만 채웠더니 점 하나가 됐다.
                  형이 그려 준 건 뾰족한 별이다. 그 별의 정체는 —
                  **마주 보는 잎 둘이 겹치는 자리**다. 잎은 가운데를 살짝
                  지나 반대편까지 뻗으니, 마주 본 한 쌍은 한가운데에서
                  길쭉한 씨 모양으로 겹친다. 그 씨가 네 쌍이면 여덟 갈래
                  별이 된다. 새로 그리는 게 아니라 꽃이 스스로 만든 자리다. */}
              <svg viewBox="0 0 200 200">
                {Array.from({ length: 8 }, (_, i) => (
                  <ellipse
                    key={i}
                    cx="100"
                    cy="62"
                    rx="15"
                    ry="45"
                    transform={`rotate(${i * 45} 100 100)`}
                  />
                ))}
                {/* 가운데 별 — 잎이 겹치는 자리는 너무 얇아서 점이 됐다.
                    형이 그려 준 그 별을 **그대로 그린다.** 뾰족한 끝 여덟이
                    잎이 뻗는 방향과 같으니, 꽃이 만든 자리처럼 앉는다. */}
                <path className="hip-lotus-core" d="M100.0 66.0 L105.2 87.5 L124.0 76.0 L112.5 94.8 L134.0 100.0 L112.5 105.2 L124.0 124.0 L105.2 112.5 L100.0 134.0 L94.8 112.5 L76.0 124.0 L87.5 105.2 L66.0 100.0 L87.5 94.8 L76.0 76.0 L94.8 87.5 Z" />
              </svg>
            </span>
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

        {/* ── 문 ──
            형: 「로그인 화면은 오늘의 물음을 받으시겠습니까가 좋겠다.
            대신 그거 로그인 안 한 상태에서 눌리면 가입부터 유도」.
            화면을 따로 만들지 않는다. 이 화면이 곧 로그인 화면이고,
            손님이 단추를 눌렀을 때에야 문이 열린다 — 들어오기 전에
            문지기부터 만나는 앱은 되고 싶지 않다. */}
        {join && (
          <div className="hip-gate" role="dialog" aria-label="시작하기">
            <button
              className="hip-gate-veil"
              onClick={join.onClose}
              aria-label="닫기"
            />
            <div className="hip-gate-card">
              {/* 형: 「이 말 없애고」 — 「물음은 받는 이가 있어야 건네집니다」.
                  바로 위에 「오늘의 물음을 받으시겠습니까」가 이미 있는데
                  그 아래 또 한 마디를 얹고 있었다. 같은 말을 두 번 하면
                  둘 다 안 읽힌다. 단추 하나면 족하다. */}
              <button
                onClick={join.onJoin}
                disabled={join.busy}
                className="hip-strike"
              >
                {join.busy ? "여는 중" : "구글로 시작하기"}
              </button>
              {join.error && <p className="hip-gate-bad">{join.error}</p>}
              <button onClick={join.onClose} className="hip-gate-later">
                다음에
              </button>
            </div>
          </div>
        )}
      </div>
    </HipShell>
  );
}

/** 물음만 — 다른 것은 아무것도 없다.
    형: 「화두만 보기 넣어주고」. 아래 염주까지 걷는다 — 이 화면에는
    물음과 되돌아가는 자리 하나뿐이다. */
export function HipGardenOnly({
  question,
  onBack,
}: {
  question: string;
  onBack: () => void;
}) {
  const size = qSize(question);
  return (
    <div className="hip-screen hip-hanji hip-only">
      <span aria-hidden className="hip-bloom hip-bloom-a" />
      <div className="hip-screen-mid">
        <p className={`hip-q hip-q-${size}`}>{question}</p>
      </div>
      {/* 형: 「이거도 살짝 어긋난 동그라미 버튼으로」.
          물음만 보기로 들어온 자리와 나가는 자리가 같은 몸짓이라야 한다 */}
      <button onClick={onBack} className="hip-back" aria-label="되돌아가기">
        <i aria-hidden />
      </button>
    </div>
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
  onDrop,
  days,
  dayOptions,
  onDays,
}: {
  question: string;
  source?: string | null;
  day: number;
  unlocked: boolean;
  /** 달이 차오른 정도 0~100 */
  pct: number;
  /** 남은 시간 한 마디 — 읽어 주는 말로만 쓴다(화면에는 며칠째인지만) */
  remaining: string;
  onOpen: () => void;
  onNotes: () => void;
  onFocus: () => void;
  /** 이 화두를 내려놓는다 — 형: 「그대로 가져와서 넣고」.
      확인창은 부모가 띄운다. 무르면 아무 일도 안 일어난다 */
  onDrop?: () => void | Promise<void>;
  /** 품는 날수 — 고르면 지금 화두에 바로 붙는다.
      고를 수 있는 날은 부모의 DAY_OPTIONS 를 그대로 받는다 —
      여기서 [3,7,21] 같은 걸 손으로 적으면 웹과 어긋난다 */
  days?: number;
  dayOptions?: number[];
  onDays?: (d: number) => void | Promise<void>;
}) {
  const size = qSize(question);
  return (
    <HipShell here="/">
      <div className="hip-screen hip-hanji">
        <span aria-hidden className="hip-bloom hip-bloom-a" />
        <Mark />

        {/* 형: 「제 일 일 그거는 지우고, 오른쪽 위에는 음소거 · 쪽지 ·
            내 도량 · 연꽃/공덕 갯수 이렇게 오리지날처럼 따와서 넣자」.
            며칠째인지는 바닥이 이미 말한다 — 같은 말을 두 번 하면
            둘 다 안 읽힌다. */}
        <header className="hip-screen-top">
          <span />
          <HipTop />
        </header>

        <div className="hip-screen-mid">
          {/* 큰 것 하나 — 오브제가 아니라 **물음**이다 */}
          <p className={`hip-q hip-q-${size}`}>{question}</p>
          {source && <p className="hip-q-by">{source}</p>}
          {/* 형: 「내려」 — ○ 를 머리에서 물음 바로 아래로.
              머리 오른쪽에는 이미 넷(연꽃·음소거·쪽지·我)이 서 있어서
              ○ 가 다섯째로 묻혔다. 「물음만 보기」는 **물음에 딸린 일**이니
              물음 밑에 두는 것이 맞다 — 손도 거기서 가깝다. */}
          {/* 형: 「동그라미에 살짝 어슷하게 안에 동그라미 둔 거 좋았다」
                  「동그라미를 정중앙에 두지 말고 살짝 왼쪽 아래로,
                   안 동그라미는 크기 좀만 더 키우고」
              글자 ○ 로는 자리를 못 옮긴다 — 진짜 동그라미로 그린다. */}
          <button onClick={onFocus} aria-label="물음만 보기" className="hip-only-go">
            <i aria-hidden />
          </button>
        </div>

        {/* ── 바닥 ──
            시안에는 막대도 알약도 없었다. **얇은 선 하나**와 그 아래
            두 마디뿐. 그 선이 곧 달이다 — 차오른 만큼 먹이 간다. */}
        <div className="hip-foot">
          {/* 형: 「이건 남기는 게 좋지 않겠냐」 —
              옛 판의 그 칸(달 · 며칠째 · 시·분·초 · 막대)을 그대로 살린다.
              「이틀째 품는 중」 한 줄로 줄여 놨더니, 얼마나 남았는지가
              사라졌다. 기다리는 화면에서 **남은 때**는 군더더기가 아니라
              그 화면의 알맹이다. 세는 숫자가 있어야 기다림이 손에 잡힌다. */}
          <p className="hip-moonline">
            <i
              className="hip-moon-dot"
              data-full={unlocked ? "1" : undefined}
              aria-hidden
            />
            {unlocked ? "달이 찼습니다" : "달이 차오르는 중"}
            <u>·</u>
            {nalcha(day)}
          </p>
          {!unlocked && remaining && (
            <p className="hip-count">
              {remaining.split(" ").map((w, i) => {
                const num = w.match(/^\d+/)?.[0] ?? "";
                return (
                  <span key={i}>
                    <b>{num}</b>
                    {w.slice(num.length)}
                  </span>
                );
              })}
            </p>
          )}
          <div
            className="hip-rule"
            role="img"
            aria-label={unlocked ? "달이 찼습니다" : `${remaining} 남음`}
          >
            <i style={{ width: `${unlocked ? 100 : pct}%` }} />
          </div>
          <div className="hip-foot-row">
            <span>
              {unlocked ? "이제 답을 쓸 수 있어요" : "달이 차면 답을 쓸 수 있어요"}
            </span>
            <button onClick={unlocked ? onOpen : onNotes} className="hip-do">
              {unlocked ? "답 하 기" : "사 유 의 방"}
            </button>
          </div>

          {/* 품는 날수와 내려놓기 — 형: 「이 화두를 내려놓다랑 화두 기간
              기능 그대로 가져와서 넣고」. 글자는 최소로: 숫자 셋과 한 마디 */}
          {((onDays && dayOptions) || onDrop) && (
            <div className="hip-foot-fine">
              {!unlocked && onDays && dayOptions && (
                <span className="hip-days">
                  {dayOptions.map((d) => (
                    <button
                      key={d}
                      /* 취소를 살린다 — 확인창에서 무르면 알약이 안 켜지고
                         그대로 남는다. 여기서 뭘 닫지 않는다 */
                      onClick={() => void onDays(d)}
                      data-on={days === d ? "1" : undefined}
                      aria-pressed={days === d}
                      aria-label={durationLabel(d)}
                    >
                      {d}
                    </button>
                  ))}
                  <i>日</i>
                </span>
              )}
              {onDrop && (
                <button onClick={() => void onDrop()} className="hip-drop">
                  내려놓기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </HipShell>
  );
}

/** 홈으로 — 다른 판들이 머리에 다는 로고. 여기(뜰)는 이미 홈이라 안 단다 */
export function HipHome() {
  return (
    <Link href="/" aria-label="화두 홈" className="hip-home">
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 4.2c1.7 2.4 2.4 4.4 2.4 6.3s-1.1 3.7-2.4 4.9c-1.3-1.2-2.4-3-2.4-4.9s.7-3.9 2.4-6.3z" />
        <path d="M12 15.4c-1.9-1.6-4.6-2.3-7.4-2.2.3 2.6 2.4 4.6 5 5 .9.1 1.7 0 2.4-.3" />
        <path d="M12 15.4c1.9-1.6 4.6-2.3 7.4-2.2-.3 2.6-2.4 4.6-5 5-.9.1-1.7 0-2.4-.3" />
      </svg>
      <b>화두</b>
    </Link>
  );
}
