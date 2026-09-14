import type { Metadata } from "next";
import Link from "next/link";
import { dongja } from "@/lib/dongja";

export const metadata: Metadata = {
  title: "간화선이란? — 화두",
  description:
    "간화선(看話禪) — 질문 하나를 품고 사는 한국 고유의 수행법. 여섯 걸음과 구체적인 좌선법까지.",
  alternates: { canonical: "/ganhwaseon" },
};

// 간화선 — 가볍게 치부할 자리가 아니다. 첫 화면은 숨 쉴 만큼 비우되,
// 내용은 온전히 남긴다. 깊은 대목은 <details> 로 접어 읽을 사람이 편다.

const STEPS = [
  {
    n: "一",
    t: "질문을 하나 받는다",
    d: "이것을 화두(話頭)라 부릅니다. 스스로 고른 것이 아니라 받는다는 데 뜻이 있어요.",
  },
  {
    n: "二",
    t: "답을 찾지 않는다",
    d: "검색 금지, 책 금지, 남에게 묻기 금지. 이 질문의 답은 밖에 없습니다.",
  },
  {
    n: "三",
    t: "자주 떠올린다",
    d: "설거지하다가, 지하철에서, 잠들기 전에 — 문득 다시 듭니다.",
  },
  {
    n: "四",
    t: "떠오른 답은 놓아준다",
    d: "그럴듯한 답이 오면 붙잡지 않습니다. 생각으로 찾아낸 것은 답이 아니에요.",
  },
  {
    n: "五",
    t: "궁금함이 커지게 둔다",
    d: "풀리지 않아 답답한 것 — 그게 잘못이 아니라 그게 공부입니다. 옛 스승들은 이를 의심 덩어리라 불렀어요.",
  },
  {
    n: "六",
    t: "끝까지 든다",
    d: "하루, 사흘, 몇 해. 어느 날 생각이 아닌 곳에서 무언가 열립니다.",
  },
];

const SITTING = [
  {
    n: "坐",
    t: "바른 자세로 앉기 — 좌선",
    d: "조용한 자리에 방석을 놓고 가부좌나 반가부좌로 바르게 앉습니다. 허리는 곧게 세우고 턱은 살짝 당기고, 눈은 반쯤 감아 시선을 한두 걸음 앞 바닥에 가만히 둡니다. 어깨의 힘을 빼고 호흡이 고요해질 때까지 잠시 기다립니다.",
  },
  {
    n: "話",
    t: "화두를 정하고 들기",
    d: "처음이라면 무(無)나 ‘이뭣고’ 같은 대표 화두가 좋습니다. 지식이나 논리로 답을 찾으려 하지 말고, “이게 무엇이지?” 하는 순수한 궁금증과 의심만 오롯이 붙듭니다.",
  },
  {
    n: "疑",
    t: "생각을 끊고 의심을 잇기",
    d: "잡생각이 일어나면 따라가지 말고 조용히 화두의 의심으로 돌아옵니다. 물음과 내가 하나가 되도록, 모르는 답답함 속으로 깊이 들어갑니다.",
  },
  {
    n: "行",
    t: "일상으로 잇기",
    d: "앉아 있을 때만이 아니라 걷고 일하고 말할 때도 의심이 끊어지지 않게 합니다. 자리에서 일어나는 순간 공부가 끝나는 게 아니라, 거기서부터가 본 공부입니다.",
  },
];

export default function GanhwaseonPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        看話禪 · 간화선
      </h1>

      {/* 한 문장 — 이 수행의 전부 */}
      <div className="rise rise-d1 mt-8 flex flex-col items-center">
        <span
          className="block h-[96px] w-[96px]"
          dangerouslySetInnerHTML={{ __html: dongja("default", "gh") }}
        />
        <p className="question-glow mt-4 break-keep text-center font-serif text-[23px] font-light leading-[1.65] text-hanji">
          질문 하나를 품고 사는 것.
          <br />
          그게 전부입니다.
        </p>
      </div>

      {/* 무엇인가 — 세 대목 */}
      <div className="rise rise-d2 mt-10 space-y-7 text-[14.5px] font-light leading-8 text-hanji-dim">
        <section>
          <h2 className="font-serif text-[16px] text-gold-soft">
            명상과 무엇이 다른가
          </h2>
          <p className="mt-2.5 break-keep">
            흔히 아는 명상은 <span className="text-hanji">마음을 비우는</span>{" "}
            연습입니다. 간화선은 반대로{" "}
            <span className="text-hanji">질문 하나를 채우는</span> 연습이에요.
            “나는 누구인가.” 이런 질문을 하나 받아서 풀지 않고, 검색하지 않고,
            그냥 <span className="text-hanji">품고 삽니다</span>. 밥 먹을 때도
            걸을 때도 잠들기 전에도 그 질문이 마음 한구석에 있는 상태 — 그게
            간화선입니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[16px] text-gold-soft">
            지금은 한국에만 남은 수행
          </h2>
          <p className="mt-2.5 break-keep">
            천 년 전 중국에서 시작됐지만, 오늘날 이 수행이{" "}
            <span className="text-hanji">
              일상으로 살아 있는 나라는 사실상 한국뿐
            </span>
            입니다. 지금 이 순간에도 전국 선원에서 수백 명의 수행자가 화두
            하나를 들고 앉아 있어요. 고려의 지눌 스님이 뿌리를 내렸고, 그 맥이
            끊기지 않고 오늘까지 왔습니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[16px] text-gold-soft">왜 하는가</h2>
          <p className="mt-2.5 break-keep">
            질문 하나가 마음에 자리 잡으면 잡념이 들어올 자리가 줄어듭니다. 남의
            답 — 검색 결과, 알고리즘, AI — 에 기대는 버릇이 멈추고,{" "}
            <span className="text-hanji">스스로 겪어서 아는 힘</span>이
            자랍니다. 천 년 동안 이 수행이 살아남은 이유예요.
          </p>
        </section>
      </div>

      {/* 여섯 걸음 */}
      <p className="rise rise-d3 mt-10 text-[11px] tracking-[0.3em] text-hanji-faint">
        하는 법 — 여섯 걸음
      </p>
      <ol className="rise rise-d3 mt-3 grid gap-2">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="flex items-baseline gap-3 rounded-[12px] border border-ink-3 bg-ink-2/40 px-4 py-3.5"
          >
            <span className="font-serif text-[13px] text-gold-soft">{s.n}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-hanji">{s.t}</span>
              <span className="mt-1 block break-keep text-[13px] leading-6 text-hanji-dim">
                {s.d}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* 제대로 앉기 — 읽을 사람이 편다 */}
      <details className="rise rise-d3 mt-6 rounded-[14px] border border-ink-3 bg-ink-2/40 px-4 py-3.5">
        <summary className="cursor-pointer list-none text-[14px] text-hanji-dim marker:hidden">
          <span className="text-gold-soft">＋</span> 제대로 앉아서 해보고 싶다면
          — 구체적인 수행 방법
        </summary>
        <div className="mt-4 space-y-5 border-t border-ink-3 pt-4">
          <p className="break-keep text-[13.5px] leading-7 text-hanji-dim">
            여섯 걸음이 뼈대라면, 아래는 처음 앉는 분을 위한 살입니다. 그대로
            따라 해 보셔도 좋아요.
          </p>
          {SITTING.map((x) => (
            <div key={x.n} className="border-l border-ink-3 pl-4">
              <p className="flex items-baseline gap-2.5">
                <span className="font-serif text-[13px] text-gold-soft">
                  {x.n}
                </span>
                <span className="text-[14.5px] text-hanji">{x.t}</span>
              </p>
              <p className="mt-1.5 break-keep text-[13px] leading-7 text-hanji-dim">
                {x.d}
              </p>
            </div>
          ))}
          <p className="border-t border-ink-3 pt-3.5 break-keep text-[12.5px] leading-7 text-hanji-faint">
            화두는 특정 종단과 무관한, 전통 수행의 형식을 빌린 사유의
            공간입니다. 본격적인 참선은 가까운 선원이나 템플스테이에서 경험할 수
            있어요.
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
