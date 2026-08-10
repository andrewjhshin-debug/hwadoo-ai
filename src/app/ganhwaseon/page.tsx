import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "간화선이란 — 화두",
  description:
    "화두(話頭)와 간화선(看話禪)이 무엇인지, 천 년의 수행 전통을 짧게 풀어 설명합니다.",
};

// 간화선이란 — 화두 수행의 전통을 풀어 설명하는 자리
export default function GanhwaseonPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        看話禪 · 간화선이란
      </h1>

      <div className="rise rise-d1 mt-12 space-y-9 text-[15px] font-light leading-9 text-hanji">
        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            화두(話頭) — 말의 머리
          </h2>
          <p className="mt-4 text-hanji-dim">
            화두는 풀라고 주어지는 문제가 아닙니다. 이치로는 뚫리지 않는 물음
            하나를 받아, 온몸으로 품는 것입니다. 「개에게도 불성이 있는가 —
            무(無)」, 「이 뭣고」, 「뜰 앞의 잣나무」 — 천칠백 개의 화두가
            천 년을 건너 전해집니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            간화선(看話禪) — 화두를 보는 선
          </h2>
          <p className="mt-4 text-hanji-dim">
            간(看)은 '본다', 화(話)는 '화두'. 화두를 들고 의심을 일으켜 참구하는
            수행법입니다. 송나라의 대혜 종고가 크게 일으켰고, 고려의 보조
            지눌과 태고 보우를 거쳐 한국 불교의 중심 수행법이 되었습니다.
            지금도 한국의 선원에서는 스님들이 화두 하나를 들고 몇 해씩
            정진합니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            의심 — 공부의 심장
          </h2>
          <p className="mt-4 text-hanji-dim">
            간화선의 핵심은 답이 아니라{" "}
            <span className="text-hanji">의심(疑心)</span>입니다. 옛 스승들은
            「큰 의심 아래 반드시 큰 깨달음이 있다(大疑之下 必有大悟)」
            하였습니다. 화두가 곧장 풀리지 않아 답답한 것 — 그 답답함이
            잘못된 것이 아니라, 그것이 바로 공부입니다.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-gold-soft">
            이 도량에서는
          </h2>
          <ol className="mt-4 space-y-4 text-hanji-dim">
            <li>
              <span className="text-gold-soft">하나.</span> 화두를 받고, 물음과
              함께할 시간을 정합니다 — 하루, 사흘, 이레, 혹은 스스로.
            </li>
            <li>
              <span className="text-gold-soft">둘.</span> 그 시간 동안 답을 쓸
              수 없습니다. 검색하지 말고, 묻지 말고, 품고 지내십시오. 스치는
              생각은{" "}
              <Link href="/room" className="text-hanji underline decoration-gold/30 underline-offset-4">
                사유의 방
              </Link>
              에 단상으로 적어 둘 수 있습니다.
            </li>
            <li>
              <span className="text-gold-soft">셋.</span> 때가 되면 붓을 들어
              그대의 답을 씁니다. 이를 회향(回向)이라 부릅니다.
            </li>
            <li>
              <span className="text-gold-soft">넷.</span> 그 뒤에야 옛 스승들의
              답이 열립니다. 견주되, 정답으로 삼지 마십시오 — 정답은 없습니다.
            </li>
          </ol>
        </section>

        <section className="border-t border-ink-3 pt-8">
          <p className="text-sm leading-8 text-hanji-faint">
            이 도량은 특정 종단과 무관하며, 전통 수행의 형식을 빌린 사유의
            공간입니다. 본격적인 참선 수행을 원하시면 가까운 선원이나
            템플스테이를 찾아보시기를 권합니다.
          </p>
        </section>
      </div>

      <p className="rise rise-d2 mt-12 text-center">
        <Link
          href="/"
          className="btn-obang inline-block px-9 py-3 text-[13px] tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          화두 받기
        </Link>
      </p>
    </div>
  );
}
