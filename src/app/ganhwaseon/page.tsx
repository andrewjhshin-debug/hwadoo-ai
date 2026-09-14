import type { Metadata } from "next";
import Link from "next/link";
import { dongja } from "@/lib/dongja";

export const metadata: Metadata = {
  title: "간화선이란? — 화두",
  description:
    "질문 하나를 품고 사는 한국 고유의 수행법, 간화선. 여섯 걸음으로 아주 쉽게.",
  alternates: { canonical: "/ganhwaseon" },
};

// 간화선이란? — 읽는 데 30초. 깊은 이야기는 접어 두고, 궁금한 사람만 편다.
// (긴 판은 git tag v1-dark-verbose 에 남아 있다)

const STEPS = [
  { n: "一", t: "질문 하나를 받는다", d: "이걸 화두라 해요." },
  { n: "二", t: "답을 찾지 않는다", d: "검색도 책도 금지." },
  { n: "三", t: "자주 떠올린다", d: "설거지하다, 지하철에서." },
  { n: "四", t: "떠오른 답은 놓는다", d: "생각으로 찾은 건 답이 아니에요." },
  { n: "五", t: "답답한 채로 둔다", d: "그 답답함이 곧 공부." },
  { n: "六", t: "끝까지 든다", d: "하루, 사흘, 몇 해." },
];

export default function GanhwaseonPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        看話禪 · 간화선
      </h1>

      {/* 한 문장 — 이 페이지의 전부 */}
      <div className="rise rise-d1 mt-8 flex flex-col items-center">
        <span
          className="block h-[92px] w-[92px]"
          dangerouslySetInnerHTML={{ __html: dongja("default", "gh") }}
        />
        <p className="question-glow mt-4 break-keep text-center font-serif text-[22px] font-light leading-[1.7] text-hanji">
          질문 하나를 품고 사는 것.
          <br />
          그게 전부예요.
        </p>
      </div>

      {/* 세 줄 요약 */}
      <div className="rise rise-d2 mt-9 grid gap-2.5">
        {[
          ["명상과 반대", "비우는 게 아니라, 질문 하나를 채워요."],
          ["한국에만 남았어요", "지금도 전국 선원에서 하고 있어요."],
          ["왜 하냐면", "남의 답 말고 내가 겪어 아는 힘이 생겨요."],
        ].map(([t, d]) => (
          <div
            key={t}
            className="rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5"
          >
            <p className="text-[13px] text-gold-soft">{t}</p>
            <p className="mt-1 break-keep text-[14px] leading-6 text-hanji-dim">
              {d}
            </p>
          </div>
        ))}
      </div>

      {/* 여섯 걸음 */}
      <p className="rise rise-d3 mt-10 text-[11px] tracking-[0.3em] text-hanji-faint">
        하는 법 — 여섯 걸음
      </p>
      <ol className="rise rise-d3 mt-3 grid gap-2">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="flex items-baseline gap-3 rounded-[12px] border border-ink-3 px-4 py-3"
          >
            <span className="font-serif text-[13px] text-gold-soft">{s.n}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] text-hanji">{s.t}</span>
              <span className="mt-0.5 block break-keep text-[12.5px] leading-5 text-hanji-faint">
                {s.d}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* 더 깊이 — 궁금한 사람만 편다 */}
      <details className="rise rise-d3 group mt-6 rounded-[14px] border border-ink-3 bg-ink-2/40 px-4 py-3.5">
        <summary className="cursor-pointer list-none text-[13.5px] text-hanji-dim marker:hidden">
          <span className="text-gold-soft">＋</span> 제대로 앉아서 해보고 싶다면
        </summary>
        <div className="mt-4 space-y-4 border-t border-ink-3 pt-4">
          {[
            ["坐", "앉기", "방석에 반가부좌. 허리는 곧게, 턱은 살짝 당기고, 눈은 반쯤 떠 두어 걸음 앞을 봐요."],
            ["話", "화두 들기", "처음이면 '이뭣고'가 좋아요. 논리로 풀지 말고 궁금함만 붙듭니다."],
            ["疑", "의심 잇기", "잡생각이 오면 따라가지 말고 조용히 물음으로 돌아와요."],
            ["行", "일상으로", "앉아 있을 때만이 아니라 걷고 일할 때도. 거기서부터가 진짜예요."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex gap-3">
              <span className="font-serif text-[13px] text-gold-soft">{n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] text-hanji">{t}</span>
                <span className="mt-1 block break-keep text-[13px] leading-6 text-hanji-dim">
                  {d}
                </span>
              </span>
            </div>
          ))}
          <p className="border-t border-ink-3 pt-3 break-keep text-[12px] leading-6 text-hanji-faint">
            화두는 특정 종단과 무관한, 전통 수행의 형식을 빌린 사유의 공간이에요.
            본격적인 참선은 가까운 선원이나 템플스테이에서 할 수 있어요.
          </p>
        </div>
      </details>

      <p className="rise rise-d3 mt-8 text-center">
        <Link
          href="/"
          className="btn-obang inline-block px-9 py-3.5 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          화두 받으러 가기
        </Link>
      </p>
    </div>
  );
}
