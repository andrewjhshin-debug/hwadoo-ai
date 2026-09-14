"use client";

// ─────────────────────────────────────────────────────────────
// 선지식(善知識)의 한마디 — 화두를 기다리는 동안 기대는 어깨.
// 오늘의 한 구절 + 어록의 서고.
// 내장 어록에 뒷방에서 더한 어록을 합치고, 감춘 것(hiddenIds)과
// 영영 지운 것(removedIds)은 mergeSayings 가 둘 다 걸러 보인다.
// 뒷방에서 고쳐 쓴 어록(edited)은 mergeSayings 가 원문 위에 덮어 읽는다.
// (뒷방의 손질을 읽지 못하면 내장 어록 그대로 조용히 보인다)
//
// 어록 문장은 한 글자도 손대지 않는다 — 그게 이 화면의 내용이다.
// 바꾼 것은 담는 그릇뿐: 한 구절에 카드 하나, 스승은 금빛 뱃지 한 글자,
// 여섯째 구절부터는 <details> 로 접는다. 스물여섯 구절이 한 번에
// 쏟아지면 첫 구절조차 읽히지 않는다. 접은 것은 지운 것이 아니다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Dharmachakra } from "@/components/icons";
import { randomSaying, SAYINGS, splitSentences, type Saying } from "@/lib/sayings";
import { fetchAdminContent, mergeSayings } from "@/lib/adminContent";

// 서고의 갈래 — 기본이 '전체'라서 무엇도 가려지지 않는다
type Land = "all" | "kr" | "cn" | "etc";

const LANDS: [Land, string][] = [
  ["all", "전체"],
  ["kr", "한국"],
  ["cn", "중국"],
  ["etc", "그 밖"],
];

// 시대 글자만 보고 나라를 짚는다. 뒷방에서 더한 어록의 낯선 시대는
// '그 밖'으로 떨어지지만 '전체'에는 언제나 남는다 — 사라지는 구절은 없다.
function landOf(era: string): Exclude<Land, "all"> {
  if (/신라|고구려|백제|고려|조선|한국/.test(era)) return "kr";
  if (/수나라|당|송|위진|남북조|명나라|청나라|원나라|중국/.test(era)) return "cn";
  return "etc";
}

// 금빛 원 안에 스승 이름 첫 글자 — 긴 이름을 다 읽기 전에 누구인지 잡힌다.
// 읽어 주는 것은 옆의 이름이므로 뱃지는 화면 낭독에서 뺀다.
function NameBadge({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gold font-serif text-[12px] leading-none text-ink"
    >
      {name.trim().charAt(0) || "禪"}
    </span>
  );
}

// 어록 한 장 — 카드 하나에 구절 하나. 여백이 곧 읽는 속도다.
function SayingCard({ s }: { s: Saying }) {
  return (
    <figure className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-5">
      <blockquote className="break-keep font-serif text-[15.5px] font-light leading-[1.9] text-hanji">
        {splitSentences(s.text).map((line, j) => (
          <span key={j} className="block">
            {line}
          </span>
        ))}
      </blockquote>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] tracking-widest">
        <NameBadge name={s.name} />
        <span className="text-hanji-dim">{s.name}</span>
        {s.era && <span className="text-hanji-faint">{s.era}</span>}
        {s.source && <span className="text-hanji-faint">『{s.source}』</span>}
      </figcaption>
    </figure>
  );
}

// 접기 전에 몇 장을 펴 둘지 — 다섯이면 서고의 결이 보이고 부담은 없다
const OPEN_COUNT = 5;

export default function MastersPage() {
  const [saying, setSaying] = useState<Saying | null>(null);
  const [pool, setPool] = useState<Saying[]>(SAYINGS);
  const [land, setLand] = useState<Land>("all");

  useEffect(() => {
    // 우선 내장 어록으로 첫 한마디 — 뒷방의 손질(더함·감춤)이 오면 합쳐 잇는다
    setSaying(randomSaying());
    fetchAdminContent()
      .then((c) => {
        const merged = mergeSayings(c.sayings);
        // 모두 감춰져 비었으면 내장 그대로 둔다 — 빈 서고는 아무도 돕지 못한다
        if (merged.length === 0) return;
        setPool(merged);
        // 지금 걸린 한마디가 감춰진 것이면 합쳐진 어록에서 다시 뽑는다
        setSaying((cur) =>
          cur && merged.some((s) => s.text === cur.text)
            ? cur
            : merged[Math.floor(Math.random() * merged.length)]
        );
      })
      .catch(() => {});
  }, []);

  // 아무 한마디나 — 직전 것과는 겹치지 않게 (합쳐진 어록에서)
  const another = () => {
    setSaying((cur) => {
      const rest = cur ? pool.filter((s) => s.text !== cur.text) : pool;
      return rest.length > 0
        ? rest[Math.floor(Math.random() * rest.length)]
        : cur;
    });
  };

  // 갈래에 걸린 구절만 — '전체'면 손대지 않는다
  const shelf =
    land === "all" ? pool : pool.filter((s) => landOf(s.era) === land);
  const opened = shelf.slice(0, OPEN_COUNT);
  const folded = shelf.slice(OPEN_COUNT);

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      {/* 머리는 두 겹까지만 — 한자 한 마디와 이름 */}
      <header className="rise text-center">
        <p className="text-[11px] tracking-[0.5em] text-gold-soft">善知識</p>
        <h1 className="mt-3 font-serif text-[26px] font-light text-hanji">
          선지식의 한마디
        </h1>
      </header>

      {/* 오늘의 한마디 — 누를 때마다 다른 말 */}
      {saying && (
        <section className="rise rise-d1 mt-10">
          {/* 말의 길이가 제각각이라 카드가 들쎄거리면 아래 단추가 따라 움직인다.
              누를 자리가 움직이면 손이 헛돈다 — 카드 키를 박아 둘다.
              긴 말은 안에서 스스로 흘러 내린다. */}
          <div className="flex min-h-[260px] flex-col items-center justify-center overflow-y-auto rounded-[14px] border border-ink-3 bg-ink-2/50 px-6 py-10 text-center sm:min-h-[300px]">
            <blockquote className="question-glow break-keep font-serif text-lg font-light leading-[1.85] text-hanji sm:text-xl">
              {splitSentences(saying.text).map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </blockquote>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5">
              <NameBadge name={saying.name} />
              <p className="text-[11.5px] tracking-widest text-hanji-dim">
                {saying.name}
                {saying.era && (
                  <span className="text-hanji-faint"> · {saying.era}</span>
                )}
                {saying.source && (
                  <span className="text-hanji-faint"> · 『{saying.source}』</span>
                )}
              </p>
            </div>
          </div>

          {/* 이 화면의 주 단추 — 알약으로 크게 잡는다 */}
          <button
            onClick={another}
            className="btn-obang mt-4 w-full rounded-full py-3.5 text-[13px] tracking-[0.25em] text-hanji transition-opacity hover:opacity-90"
          >
            다른 한마디
          </button>
        </section>
      )}

      <div className="rise rise-d2 my-12 flex items-center justify-center gap-3.5 text-gold-soft opacity-70">
        <div className="h-px w-[90px] bg-gradient-to-r from-transparent to-gold/40" />
        <Dharmachakra className="h-4 w-4" />
        <div className="h-px w-[90px] bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 어록의 서고 */}
      <section className="rise rise-d2">
        <p className="text-[11px] tracking-[0.34em] text-hanji-faint">
          어록의 서고
        </p>
        {/* 몇 구절이 쌓였는지를 크게 — 서고가 살아 있다는 표시 */}
        <p className="mt-1.5 font-serif text-[56px] font-light leading-none text-hanji">
          {shelf.length}
          <span className="ml-2 font-sans text-[12px] tracking-[0.2em] text-hanji-faint">
            구절
          </span>
        </p>

        {/* 갈래 — 고른 쪽만 먹으로 채운다 */}
        <div className="mt-6 flex rounded-full border border-ink-3 bg-ink-2/50 p-1">
          {LANDS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setLand(k)}
              aria-pressed={land === k}
              className={`flex-1 rounded-full py-2 text-[12.5px] tracking-[0.15em] transition-colors ${
                land === k
                  ? "bg-hanji text-ink"
                  : "text-hanji-faint hover:text-hanji-dim"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {shelf.length === 0 ? (
          <p className="mt-8 text-center text-[13px] text-hanji-faint">
            이 갈래엔 아직 구절이 없어요.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3.5">
            {opened.map((s, i) => (
              <SayingCard key={`${s.name}-${i}`} s={s} />
            ))}
          </div>
        )}

        {/* 나머지는 접어 둔다 — 지운 것이 아니라 펴면 그대로 있다.
            갈래를 바꾸면 key 가 달라져 다시 접힌다. */}
        {folded.length > 0 && (
          <details key={land} className="mt-3.5">
            <summary className="cursor-pointer list-none rounded-full border border-ink-3 bg-ink-2/50 px-5 py-3 text-center text-[12.5px] tracking-[0.15em] text-hanji-dim transition-colors marker:hidden hover:text-hanji">
              <span className="text-gold-soft">＋</span> 남은 {folded.length}구절
            </summary>
            <div className="mt-3.5 flex flex-col gap-3.5">
              {folded.map((s, i) => (
                <SayingCard key={`${s.name}-${i}`} s={s} />
              ))}
            </div>
          </details>
        )}

        <p className="mt-10 text-center text-[11px] leading-5 text-hanji-faint">
          전승된 어록과 경전을 우리말로 풀어 옮긴 것입니다.
        </p>
      </section>
    </div>
  );
}
