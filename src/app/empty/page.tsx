// ─────────────────────────────────────────────────────────────
// 비움(空) — 무지출 · 무소유 · 무집착 · 무살생.
// 조용한 소개의 방이다. 추적·기록 없음, 정적 화면.
//
// 리뉴얼 의도: 예전에는 네 갈래의 안내문 여덟 줄이 한꺼번에 펼쳐져 있어
// 무엇부터 읽어야 할지 알 수 없었다. 그래서 카드마다 한 줄만 남기고
// 원문 두 줄은 <details> 로 접었다 — 글은 지우지 않는다, 접을 뿐이다.
// ─────────────────────────────────────────────────────────────

type Emptying = {
  hanja: string; // 無支出 — 작게 남겨 두는 원래 한자
  name: string;
  hook: string; // 접혀 있을 때 보이는 한 줄 — 짧고 세게
  lines: string[]; // 원문 그대로. 뜻이 빠지면 안 되므로 한 자도 손대지 않는다
};

const EMPTYINGS: Emptying[] = [
  {
    hanja: "無支出",
    name: "무지출",
    hook: "없으면 안 되는가.",
    lines: [
      "오늘 하루, 꼭 필요한 것 외에는 쓰지 않습니다.",
      "지갑을 열기 전에 한 번 묻습니다 — 이것이 없으면 안 되는가.",
    ],
  },
  {
    hanja: "無所有",
    name: "무소유",
    hook: "안 쓰는 것은 내보냅니다.",
    lines: [
      "쓰지 않는 물건을 하나씩 내보냅니다.",
      "비운 자리만큼 마음도 가벼워집니다.",
    ],
  },
  {
    hanja: "無執着",
    name: "무집착",
    hook: "붙들지 않고 흘려보냅니다.",
    lines: [
      "마음에 걸리는 일 하나를 붙들지 않고 흘려보냅니다.",
      "붙드는 마음을 알아차리면, 이미 반은 놓은 것입니다.",
    ],
  },
  {
    hanja: "無殺生",
    name: "무살생",
    hook: "오늘 한 끼는 절밥처럼.",
    lines: [
      "오늘 한 끼는 고기와 생선 없이 — 절밥처럼 담백하게.",
      "밥상에서 덜어낸 생명만큼, 마음이 너그러워집니다.",
    ],
  },
];

// 카드가 한꺼번에 떠오르면 무게가 없다 — 한 장씩 차례로 올라오게 한다
const DELAYS = ["rise-d1", "rise-d2", "rise-d3", "rise-d4"];

// 접힘 표시 — 이모지 대신 직접 그린 꺾쇠
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0 text-hanji-faint transition-transform duration-200 group-open:rotate-180"
      aria-hidden
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export default function EmptyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-16 pt-10 text-center md:pt-14">
      {/* 머리글은 두 겹만 — 큰 글자 하나와 짧은 표제 */}
      <p className="rise font-serif text-[68px] font-light leading-none text-gold-grad">
        空
      </p>
      <p className="rise mt-5 text-[11px] tracking-[0.5em] text-gold-soft">
        비움 — 네 갈래
      </p>

      <p className="question-glow rise rise-d1 mt-7 font-serif text-xl font-light leading-[1.9] text-hanji">
        쥐고 있던 것 하나를 내려놓습니다.
        <br />
        <span className="text-gold-grad">덜어냄도 수행입니다.</span>
      </p>

      {/* 네 갈래를 눈으로 먼저 보여 주는 금색 마디 — 글로 설명하지 않는다 */}
      <div
        className="rise rise-d1 mt-8 flex w-full max-w-[220px] gap-1.5"
        aria-hidden
      >
        {EMPTYINGS.map((e) => (
          <span
            key={e.hanja}
            className="h-[3px] flex-1 rounded-full bg-gold/45"
          />
        ))}
      </div>

      {/* ── 네 가지 비움 — 한 줄만 보이고, 원문은 접어 둔다 ── */}
      <div className="mt-10 flex w-full flex-col gap-3">
        {EMPTYINGS.map((e, i) => (
          <details
            key={e.hanja}
            className={`rise ${DELAYS[i]} group rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5 text-left transition-colors hover:border-gold/30`}
          >
            <summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden">
              {/* 네 갈래가 모두 '없을 無' 라는 걸 넉 장의 같은 고리로 보인다 */}
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/30 font-serif text-[17px] leading-none text-gold"
              >
                無
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-serif text-base font-light tracking-[0.2em] text-hanji">
                    {e.name}
                  </span>
                  <span className="text-[10px] tracking-[0.3em] text-hanji-faint">
                    {e.hanja}
                  </span>
                </span>
                <span className="mt-1.5 block break-keep text-[13px] font-light leading-6 text-hanji-dim">
                  {e.hook}
                </span>
              </span>
              <Chevron />
            </summary>

            <div className="mt-4 space-y-1 border-t border-ink-3 pt-4 sm:pl-[60px]">
              {e.lines.map((line) => (
                <p
                  key={line}
                  className="break-keep text-[13px] font-light leading-7 text-hanji-dim"
                >
                  {line}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>

      {/* 예전엔 카드마다 같은 예고가 네 번 붙어 있었다 — 한 번이면 족하다 */}
      <p className="rise rise-d4 mt-9 text-[11px] tracking-[0.3em] text-gold-soft">
        함께 비우는 자리는 곧 열립니다
      </p>
    </div>
  );
}
