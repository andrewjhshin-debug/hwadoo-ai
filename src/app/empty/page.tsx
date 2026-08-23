"use client";

// ─────────────────────────────────────────────────────────────
// 비움(空) — 무지출 · 무소유 · 무집착 · 무살생.
// 하루 하나씩, 실천했으면 눌러 둔다 — 조용한 일기장. 추적은 이 기기
// 안에서만(달력·이달의 마음 그래프에 쓰인다), 서버로 올라가지 않는다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { visitDayKey } from "@/components/VisitLedger";
import {
  EMPTYING_KINDS,
  isEmptyingChecked,
  loadEmptyingLog,
  toggleEmptying,
  type EmptyingKind,
} from "@/lib/emptying";

type Emptying = {
  kind: EmptyingKind;
  hanja: string;
  name: string;
  lines: string[]; // 두어 줄의 담백한 안내
};

const EMPTYINGS: Emptying[] = [
  {
    kind: "nospend",
    hanja: "無支出",
    name: "무지출",
    lines: [
      "오늘 하루, 꼭 필요한 것 외에는 쓰지 않습니다.",
      "지갑을 열기 전에 한 번 묻습니다 — 이것이 없으면 안 되는가.",
    ],
  },
  {
    kind: "nopossess",
    hanja: "無所有",
    name: "무소유",
    lines: [
      "쓰지 않는 물건을 하나씩 내보냅니다.",
      "비운 자리만큼 마음도 가벼워집니다.",
    ],
  },
  {
    kind: "noattach",
    hanja: "無執着",
    name: "무집착",
    lines: [
      "마음에 걸리는 일 하나를 붙들지 않고 흘려보냅니다.",
      "붙드는 마음을 알아차리면, 이미 반은 놓은 것입니다.",
    ],
  },
  {
    kind: "nokill",
    hanja: "無殺生",
    name: "무살생",
    lines: [
      "오늘 한 끼는 고기와 생선 없이 — 절밥처럼 담백하게.",
      "밥상에서 덜어낸 생명만큼, 마음이 너그러워집니다.",
    ],
  },
];

export default function EmptyPage() {
  const today = visitDayKey();
  const [checked, setChecked] = useState<Record<EmptyingKind, boolean>>({
    nospend: false,
    nopossess: false,
    noattach: false,
    nokill: false,
  });
  const [monthCount, setMonthCount] = useState<Record<EmptyingKind, number>>({
    nospend: 0,
    nopossess: 0,
    noattach: 0,
    nokill: 0,
  });

  // 화면이 뜬 뒤에만 서랍을 읽는다 — 서버 렌더와 어긋나지 않게
  useEffect(() => {
    const refresh = () => {
      const next = {} as Record<EmptyingKind, boolean>;
      for (const k of EMPTYING_KINDS) next[k.key] = isEmptyingChecked(today, k.key);
      setChecked(next);

      const log = loadEmptyingLog();
      const prefix = today.slice(0, 7); // "YYYY-MM"
      const counts = {} as Record<EmptyingKind, number>;
      for (const k of EMPTYING_KINDS) counts[k.key] = 0;
      for (const [day, kinds] of Object.entries(log)) {
        if (!day.startsWith(prefix)) continue;
        for (const k of kinds) counts[k] = (counts[k] ?? 0) + 1;
      }
      setMonthCount(counts);
    };
    refresh();
  }, [today]);

  const toggle = (kind: EmptyingKind) => {
    toggleEmptying(today, kind);
    setChecked((prev) => ({ ...prev, [kind]: !prev[kind] }));
    setMonthCount((prev) => ({
      ...prev,
      [kind]: prev[kind] + (checked[kind] ? -1 : 1),
    }));
  };

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
        것, 해치지 않는 것. 오늘 실천했으면 눌러 두십시오.
      </p>

      {/* ── 네 가지 비움 — 오늘 실천했는지 눌러 둔다 ── */}
      <div className="rise rise-d3 mt-10 flex w-full flex-col gap-4">
        {EMPTYINGS.map((e) => (
          <section
            key={e.kind}
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
            <button
              onClick={() => toggle(e.kind)}
              aria-pressed={checked[e.kind]}
              className={`mt-5 rounded-[10px] border px-6 py-2.5 text-[12.5px] tracking-[0.15em] transition-colors ${
                checked[e.kind]
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-ink-3 text-hanji-dim hover:border-gold/30 hover:text-hanji"
              }`}
            >
              {checked[e.kind] ? "오늘 비웠습니다 ✓" : "오늘 비우기"}
            </button>
            <p className="mt-2.5 text-[11px] tracking-[0.1em] text-hanji-faint">
              이번 달 {monthCount[e.kind]}일
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
