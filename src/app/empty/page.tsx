// ─────────────────────────────────────────────────────────────
// 비움(空) — 무지출 · 무소유 · 무집착 · 무살생.
// 지금은 조용한 소개의 방이다 — 네 가지 비움이 무엇인지 안내하고,
// 함께 비우는 자리는 곧 이곳에 열린다. (추적·기록 없음, 정적 화면)
// ─────────────────────────────────────────────────────────────

type Emptying = {
  hanja: string;
  name: string;
  lines: string[]; // 두어 줄의 담백한 안내
};

const EMPTYINGS: Emptying[] = [
  {
    hanja: "無支出",
    name: "무지출",
    lines: [
      "오늘 하루, 꼭 필요한 것 외에는 쓰지 않습니다.",
      "지갑을 열기 전에 한 번 묻습니다 — 이것이 없으면 안 되는가.",
    ],
  },
  {
    hanja: "無所有",
    name: "무소유",
    lines: [
      "쓰지 않는 물건을 하나씩 내보냅니다.",
      "비운 자리만큼 마음도 가벼워집니다.",
    ],
  },
  {
    hanja: "無執着",
    name: "무집착",
    lines: [
      "마음에 걸리는 일 하나를 붙들지 않고 흘려보냅니다.",
      "붙드는 마음을 알아차리면, 이미 반은 놓은 것입니다.",
    ],
  },
  {
    hanja: "無殺生",
    name: "무살생",
    lines: [
      "오늘 한 끼는 고기와 생선 없이 — 절밥처럼 담백하게.",
      "밥상에서 덜어낸 생명만큼, 마음이 너그러워집니다.",
    ],
  },
];

export default function EmptyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-16 pt-8 text-center md:pt-12">
      <p className="rise text-xs tracking-[0.5em] text-gold-soft">空 · 비움</p>

      <p className="question-glow rise rise-d1 mt-7 font-serif text-xl font-light leading-[1.9] text-hanji">
        쥐고 있던 것을 하나 내려놓습니다.
        <br />
        <span className="text-gold-grad">덜어냄도 수행입니다.</span>
      </p>
      <p className="rise rise-d2 mt-6 break-keep text-[14px] leading-7 text-hanji-dim">
        비움에는 네 갈래가 있습니다 — 쓰지 않는 것, 갖지 않는 것, 붙들지 않는
        것, 해치지 않는 것.
      </p>

      {/* ── 세 가지 비움 — 조용한 소개 ── */}
      <div className="rise rise-d3 mt-10 flex w-full flex-col gap-4">
        {EMPTYINGS.map((e) => (
          <section
            key={e.hanja}
            className="border border-ink-3 bg-ink-2/50 px-7 py-8"
          >
            <p className="text-xs tracking-[0.5em] text-hanji-faint">
              {e.hanja}
            </p>
            <h2 className="mt-3 font-serif text-lg font-light tracking-[0.25em] text-hanji">
              {e.name}
            </h2>
            <div className="mt-4 space-y-1">
              {e.lines.map((line) => (
                <p
                  key={line}
                  className="break-keep text-[13px] font-light leading-7 text-hanji-dim"
                >
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-5 text-[11px] tracking-[0.25em] text-gold-soft">
              곧, 이곳에서 함께 비웁니다
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
