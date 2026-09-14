import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SLOGAN } from "@/lib/config";

export const metadata: Metadata = {
  title: "서비스 소개 — 화두",
  description: SLOGAN,
};

// ─────────────────────────────────────────────────────────────
// 서비스 소개 — 이 화면이 하는 일은 하나뿐이다.
// "여기가 무엇 하는 곳인가"를 한 번에 꽂는 것.
//
// · 머리글을 두 겹으로 줄였다(한자 어깨글 + 슬로건). 설명문을 한 겹
//   더 얹으면 첫 화면에서 눈이 갈 곳을 잃는다.
// · 이 서비스의 전부인 "묻는 쪽이 뒤집힌다"는 문장으로 풀지 않고
//   두 줄 대조로 보여 준다. 읽는 것보다 보는 게 빠르다.
// · 네 걸음 문장은 한 글자도 손대지 않았다. 순서 자체가 서비스라서.
//   대신 一二三四 뱃지를 붙여 눈이 걸리게만 했다.
// · 긴 이야기(간화선·손잡고 절로·공덕·두두·부적)는 지우지 않고
//   <details> 로 접었다. 궁금한 사람만 펴면 된다.
// ─────────────────────────────────────────────────────────────

// 네 걸음 — 원문 그대로. 여기가 이 도량의 뼈대다.
const STEPS = [
  { n: "一", t: "질문 하나를 드립니다." },
  { n: "二", t: "며칠 밤낮, 스스로 품어 보세요." },
  { n: "三", t: "깨달은 것을 써 보세요." },
  { n: "四", t: "다음 화두가 옵니다." },
];

// 흐름 화살표 — 이모지를 쓰지 않으므로 직접 그린다
function Flow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-2 w-[22px] ${className}`}
    >
      <path d="M1 4h19" />
      <path d="M16.5 1.5 20 4l-3.5 2.5" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-16 pt-12 sm:pt-16">
      {/* ── 머리 — 두 겹으로 끝낸다 ── */}
      <p className="rise text-center text-[11.5px] tracking-[0.6em] text-gold-soft">
        話頭
      </p>
      <h1 className="question-glow rise rise-d1 mt-5 text-balance text-center font-serif text-[25px] font-light leading-[1.7] text-hanji sm:text-[29px]">
        {SLOGAN}
      </h1>

      {/* ── 묻는 쪽이 뒤집힌다 — 이 서비스의 전부를 두 줄로 ── */}
      <div className="rise rise-d1 mt-11 overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="w-[52px] shrink-0 text-[11px] tracking-[0.12em] text-hanji-faint">
            여느 AI
          </span>
          <span className="flex items-center gap-2.5 text-[14px] text-hanji-faint">
            <span>사람</span>
            <Flow />
            <span>AI</span>
          </span>
          <span className="ml-auto shrink-0 text-[12px] text-hanji-faint">
            내가 묻는다
          </span>
        </div>
        <div className="flex items-center gap-3 border-t border-ink-3 px-5 py-4">
          <span className="w-[52px] shrink-0 text-[11px] tracking-[0.12em] text-gold">
            화두
          </span>
          <span className="flex items-center gap-2.5 font-serif text-[15px] text-hanji">
            <span>화두</span>
            <Flow className="text-gold" />
            <span>사람</span>
          </span>
          <span className="ml-auto shrink-0 text-[12px] text-hanji">
            내가 답한다
          </span>
        </div>
      </div>

      {/* ── 네 걸음 ── */}
      <ol className="rise rise-d2 mt-10">
        {STEPS.map((s, i) => (
          <li
            key={s.n}
            className={`flex items-center gap-4 py-3.5 ${
              i > 0 ? "border-t border-ink-3" : ""
            }`}
          >
            <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-ink-3 font-serif text-[11.5px] text-gold">
              {s.n}
            </span>
            <span className="break-keep font-serif text-[15.5px] font-light leading-8 text-hanji">
              {s.t}
            </span>
          </li>
        ))}
      </ol>

      {/* ── 둘째 축 — 절로 가는 길. 한 줄만 내놓고 길을 열어 둔다 ── */}
      <Link
        href="/pilgrimage"
        className="rise rise-d2 group mt-9 flex items-center justify-between gap-4 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4 transition-colors hover:border-gold/30"
      >
        <span className="break-keep font-serif text-[14.5px] text-hanji">
          물음은 혼자, 절은 둘이
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[12px] text-gold-soft">
          손잡고 절로
          <Flow className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      {/* ── 더 긴 이야기 — 줄이지 않고 접었다 ── */}
      <details className="rise rise-d3 group mt-3 rounded-[14px] border border-ink-3 bg-ink-2/50 px-5 py-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[12.5px] text-hanji-dim marker:hidden">
          <span>이 도량에 대해 조금 더</span>
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-gold-soft transition-transform group-open:rotate-180"
          >
            <path d="M3 4.5 6 7.5 9 4.5" />
          </svg>
        </summary>
        <div className="mt-4 space-y-4 border-t border-ink-3 pt-4 text-[13px] leading-7 text-hanji-dim">
          <p className="break-keep">
            화두(話頭)는 풀어야 할 문제가 아니라 품는 물음입니다. 검색해서 얻은
            답은 남의 것이고, 며칠을 품고 있다 문득 올라온 한 줄이 내 것입니다.
            이 공부를 간화선(看話禪)이라 합니다.{" "}
            <Link
              href="/ganhwaseon"
              className="text-gold-soft underline decoration-gold/25 underline-offset-4 transition-colors hover:text-gold"
            >
              간화선이란?
            </Link>
          </p>
          <p className="break-keep">
            화두가 여덟 할, 나머지는 절로 가는 길입니다. 같은 물음을 품은
            사람과 함께 절에 가는{" "}
            <Link
              href="/pilgrimage"
              className="text-gold-soft underline decoration-gold/25 underline-offset-4 transition-colors hover:text-gold"
            >
              손잡고 절로
            </Link>
            , 그리고 절의 일손을 거드는 운력이 그것입니다.
          </p>
          <p className="break-keep">
            한 걸음마다 공덕(功德)이 쌓입니다. 단위는 108이고, 남에게 회향해도
            내 것이 줄지 않습니다 — 나눌수록 커지는 것이 대승의 셈법입니다.
            곁의 두두는 童에서 佛까지 함께 자라고, 해낸 자리에는 부적을
            드립니다. 부적은 팔지 않습니다.
          </p>
        </div>
      </details>

      <p className="rise rise-d3 mt-10 text-center text-xs leading-7 text-hanji-faint">
        기록은 내 브라우저에만 남습니다.
        <br />이 도량은 특정 종단과 무관합니다.
      </p>

      <p className="rise rise-d3 mt-4 text-center text-xs text-hanji-faint">
        문의 —{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline decoration-gold/25 underline-offset-4 transition-colors hover:text-hanji-dim"
        >
          {CONTACT_EMAIL}
        </a>
      </p>

      <p className="mt-9 text-center">
        <Link
          href="/"
          className="btn-obang inline-block px-9 py-3 text-xs tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          새 화두 받기
        </Link>
      </p>
    </div>
  );
}
