import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "간화선이란? — 화두",
  description:
    "간화선(看話禪)을 아주 쉽게 — 질문 하나를 품고 사는 한국 고유의 수행법. 구체적인 방법까지.",
};

// 간화선이란? — 아주 아주 쉽게 풀어 쓴 설명 + 방법론 도해
export default function GanhwaseonPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        看話禪 · 간화선이란?
      </h1>

      {/* 한 문장 정의 */}
      <p className="question-glow rise rise-d1 mt-12 text-center font-serif text-xl font-light leading-[1.9] text-hanji sm:text-2xl">
        질문 하나를 품고 사는 것.
        <br />
        그게 전부입니다.
      </p>

      <div className="rise rise-d2 mt-12 space-y-10 text-[15px] font-light leading-9 text-hanji-dim">
        {/* 아주 쉽게 */}
        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            명상과 무엇이 다른가
          </h2>
          <p className="mt-4">
            흔히 아는 명상은 <span className="text-hanji">마음을 비우는</span>{" "}
            연습입니다. 간화선은 반대로{" "}
            <span className="text-hanji">질문 하나를 채우는</span> 연습입니다.
          </p>
          <p className="mt-3">
            &ldquo;나는 누구인가.&rdquo; 이런 질문을 하나 받아서, 풀지 않고,
            검색하지 않고, 그냥 <span className="text-hanji">품고 삽니다</span>.
            밥 먹을 때도, 걸을 때도, 잠들기 전에도 그 질문이 마음 한구석에
            있는 상태 — 그게 간화선입니다.
          </p>
        </section>

        {/* 한국 특유 */}
        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            지금은 한국에만 남은 수행
          </h2>
          <p className="mt-4">
            천 년 전 중국에서 시작됐지만, 오늘날 이 수행이{" "}
            <span className="text-hanji">일상으로 살아 있는 나라는 사실상
            한국뿐</span>입니다. 지금 이 순간에도 전국 선원에서 수백 명의
            수행자가 화두 하나를 들고 앉아 있습니다. 고려의 지눌 스님이 뿌리를
            내렸고, 그 맥이 끊기지 않고 오늘까지 왔습니다. 케이팝보다 훨씬
            오래된, 한국의 오리지널입니다.
          </p>
        </section>

        {/* 방법론 — 도해 */}
        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            하는 법 — 여섯 걸음
          </h2>
          <div className="mt-6 flex flex-col items-stretch gap-0">
            {[
              {
                n: "一",
                title: "질문을 하나 받는다",
                desc: "이것을 '화두'라 부릅니다. 예 — 나는 누구인가.",
              },
              {
                n: "二",
                title: "답을 찾지 않는다",
                desc: "검색 금지. 책 금지. 남에게 묻기 금지. 이 질문의 답은 밖에 없습니다.",
              },
              {
                n: "三",
                title: "그냥 자주 떠올린다",
                desc: "설거지하다가, 지하철에서, 자기 전에 — \"...그래서, 나는 누구지?\"",
              },
              {
                n: "四",
                title: "떠오른 답을 붙잡지 않는다",
                desc: "그럴듯한 답이 떠오르면 놓아줍니다. 생각으로 찾아낸 것은 답이 아닙니다.",
              },
              {
                n: "五",
                title: "궁금함이 커지게 둔다",
                desc: "풀리지 않아 답답한 것 — 그게 잘못이 아니라 그게 공부입니다. 옛 스승들은 이것을 '의심 덩어리'라 불렀습니다.",
              },
              {
                n: "六",
                title: "끝까지 든다",
                desc: "하루, 사흘, 몇 해. 어느 날 생각이 아닌 곳에서 무언가 열립니다.",
              },
            ].map((step, i) => (
              <div key={step.n} className="flex flex-col items-center">
                {i > 0 && (
                  <div className="h-6 w-px bg-gradient-to-b from-gold/40 to-gold/10" />
                )}
                <div className="w-full border border-ink-3 bg-ink-2/60 px-6 py-5">
                  <p className="flex items-baseline gap-3">
                    <span className="font-serif text-gold-soft">{step.n}</span>
                    <span className="text-hanji">{step.title}</span>
                  </p>
                  <p className="mt-2 text-sm leading-7">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 이게 왜 좋은가 */}
        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            왜 이걸 하는가
          </h2>
          <p className="mt-4">
            질문 하나가 마음에 자리 잡으면, 잡념이 들어올 자리가 줄어듭니다.
            남의 답 — 검색 결과, 알고리즘, AI — 에 기대는 버릇이 멈추고,{" "}
            <span className="text-hanji">스스로 겪어서 아는 힘</span>이
            자랍니다. 천 년 동안 이 수행이 살아남은 이유입니다.
          </p>
        </section>

        <section className="border-t border-ink-3 pt-8">
          <p className="text-sm leading-8 text-hanji-faint">
            이 도량은 특정 종단과 무관하며, 전통 수행의 형식을 빌린 사유의
            공간입니다. 본격적인 참선은 가까운 선원이나 템플스테이에서 경험할
            수 있습니다.
          </p>
        </section>
      </div>

      <p className="rise rise-d3 mt-12 text-center">
        <Link
          href="/"
          className="btn-obang inline-block px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          새 화두 받기
        </Link>
      </p>
    </div>
  );
}
