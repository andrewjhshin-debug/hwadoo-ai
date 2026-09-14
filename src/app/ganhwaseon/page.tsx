import type { Metadata } from "next";
import Link from "next/link";
import Dudu from "@/components/Dudu";

export const metadata: Metadata = {
  title: "간화선이란? — 화두",
  description:
    "간화선(看話禪) — 질문 하나를 품고 사는 한국 고유의 수행법. 여섯 걸음과 구체적인 좌선법까지.",
  alternates: { canonical: "/ganhwaseon" },
};

// 간화선은 가볍게 치부할 자리가 아니다. 그래서 글은 한 글자도 덜어내지 않았다.
// 대신 첫 화면에 다 쏟아붓지 않는다 — 정체를 알리는 한 대목만 펴 두고
// 나머지 두 대목(한국에만 남은 수행 · 왜 하는가)은 <details> 로 접었다.
// 사람이 헷갈리는 건 글이 길어서가 아니라 한 번에 다 보여서다.

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
      {/* 머리글은 한자 라벨 한 겹으로 끝낸다. 큰 카피가 곧 부제 노릇을 한다. */}
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        看話禪 · 간화선
      </h1>

      {/* 첫 화면 — 나무 하나와 한 문장. 여기서는 더 읽히려 하지 않는다. */}
      <div className="rise rise-d1 mt-10 flex flex-col items-center">
        <Dudu stage={0} uid="gh" className="h-[112px] w-[112px]" />
        <p className="question-glow mt-5 break-keep text-center font-serif text-[26px] font-light leading-[1.55] text-hanji">
          질문 하나를 품고 사는 것.
          <br />
          그게 전부입니다.
        </p>
      </div>

      {/* 명상과의 차이는 이 페이지에서 제일 먼저 풀려야 할 오해다.
          본문에 이미 있던 '비우는 / 채우는'을 글자 크기로 끌어올려
          문단을 읽기 전에 눈으로 먼저 알아채게 했다. */}
      <h2 className="rise rise-d2 mt-12 text-[11px] tracking-[0.3em] text-hanji-faint">
        명상과 무엇이 다른가
      </h2>
      <div className="rise rise-d2 mt-3 grid grid-cols-2 overflow-hidden rounded-[14px] border border-ink-3 bg-ink-2/50">
        <div className="border-r border-ink-3 px-4 py-7 text-center">
          <p className="text-[11px] tracking-[0.25em] text-hanji-faint">명상</p>
          <p className="mt-2.5 font-serif text-[34px] font-light leading-none text-hanji-dim">
            비움
          </p>
        </div>
        <div className="px-4 py-7 text-center">
          <p className="text-[11px] tracking-[0.25em] text-gold-soft">간화선</p>
          <p className="mt-2.5 font-serif text-[34px] font-light leading-none text-gold">
            채움
          </p>
        </div>
      </div>

      <p className="rise rise-d2 mt-5 break-keep text-[14.5px] font-light leading-8 text-hanji-dim">
        흔히 아는 명상은 <span className="text-hanji">마음을 비우는</span>{" "}
        연습입니다. 간화선은 반대로{" "}
        <span className="text-hanji">질문 하나를 채우는</span> 연습이에요. “나는
        누구인가.” 이런 질문을 하나 받아서 풀지 않고, 검색하지 않고, 그냥{" "}
        <span className="text-hanji">품고 삽니다</span>. 밥 먹을 때도 걸을 때도
        잠들기 전에도 그 질문이 마음 한구석에 있는 상태 — 그게 간화선입니다.
      </p>

      {/* 나머지 두 대목은 한 글자도 줄이지 않고 접기만 했다.
          첫 화면에서 벽처럼 서던 글이 한 줄로 눕는다. */}
      <details className="rise rise-d2 mt-5 rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5">
        <summary className="cursor-pointer list-none text-[14px] text-hanji-dim marker:hidden">
          <span className="text-gold-soft">＋</span> 어디서 왔고, 왜 하는가
        </summary>
        <div className="mt-4 space-y-6 border-t border-ink-3 pt-4 text-[14.5px] font-light leading-8 text-hanji-dim">
          <section>
            <h3 className="font-serif text-[15.5px] text-gold-soft">
              지금은 한국에만 남은 수행
            </h3>
            <p className="mt-2 break-keep">
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
            <h3 className="font-serif text-[15.5px] text-gold-soft">왜 하는가</h3>
            <p className="mt-2 break-keep">
              질문 하나가 마음에 자리 잡으면 잡념이 들어올 자리가 줄어듭니다.
              남의 답 — 검색 결과, 알고리즘, AI — 에 기대는 버릇이 멈추고,{" "}
              <span className="text-hanji">스스로 겪어서 아는 힘</span>이
              자랍니다. 천 년 동안 이 수행이 살아남은 이유예요.
            </p>
          </section>
        </div>
      </details>

      {/* 여섯 걸음 — 카드 여섯 장은 테두리가 여섯 겹이라 시끄러웠다.
          금색 한자 뱃지와 세로 실선 하나로 꿰어 '순서'가 보이게 했다. */}
      <div className="rise rise-d3 mt-12 flex items-baseline justify-between">
        <h2 className="text-[11px] tracking-[0.3em] text-hanji-faint">하는 법</h2>
        <span className="font-serif text-[13px] text-gold-soft">여섯 걸음</span>
      </div>

      <ol className="rise rise-d3 mt-5">
        {STEPS.map((s, i) => (
          <li key={s.n} className="relative flex gap-4 pb-7 last:pb-0">
            {/* 마지막 걸음 뒤에는 실선을 긋지 않는다 — 길이 끝났으므로 */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute bottom-1 left-[15px] top-9 w-px bg-ink-3"
              />
            )}
            <span className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border border-ink-3 font-serif text-[13px] text-gold-soft">
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15.5px] leading-[31px] text-hanji">{s.t}</p>
              <p className="mt-1 break-keep text-[13px] leading-7 text-hanji-dim">
                {s.d}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* 제대로 앉기 — 읽을 사람이 편다 */}
      <details className="rise rise-d3 mt-7 rounded-[14px] border border-ink-3 bg-ink-2/50 px-4 py-3.5">
        <summary className="cursor-pointer list-none text-[14px] text-hanji-dim marker:hidden">
          <span className="text-gold-soft">＋</span> 제대로 앉아서 해보고 싶다면
        </summary>
        <div className="mt-4 space-y-5 border-t border-ink-3 pt-4">
          <p className="break-keep text-[13.5px] leading-7 text-hanji-dim">
            여섯 걸음이 뼈대라면, 아래는 처음 앉는 분을 위한 살입니다.
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
          <p className="break-keep border-t border-ink-3 pt-3.5 text-[12.5px] leading-7 text-hanji-faint">
            화두는 특정 종단과 무관한, 전통 수행의 형식을 빌린 사유의
            공간입니다. 본격적인 참선은 가까운 선원이나 템플스테이에서 경험할 수
            있어요.
          </p>
        </div>
      </details>

      <p className="rise rise-d4 mt-10 text-center">
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
