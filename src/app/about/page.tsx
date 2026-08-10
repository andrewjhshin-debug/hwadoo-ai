import type { Metadata } from "next";
import Link from "next/link";
import Donation from "@/components/Donation";
import { CONTACT_EMAIL, SLOGAN } from "@/lib/config";

export const metadata: Metadata = {
  title: "서비스 소개 — 화두",
  description: SLOGAN,
};

// 서비스 소개 — 마케팅의 얼굴
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <h1 className="rise text-center text-xs tracking-[0.5em] text-gold-soft">
        道場 · 이 도량에 대해
      </h1>

      <p className="question-glow rise rise-d1 mt-12 text-center font-serif text-xl font-light leading-[1.9] text-hanji sm:text-2xl">
        {SLOGAN}
      </p>

      <div className="rise rise-d2 mt-12 space-y-8 text-[15px] font-light leading-9 text-hanji-dim">
        <p>
          AI의 시대, 답은 어디에나 넘칩니다. 묻는 법을 잃어버린 것은
          우리입니다. 그래서 이곳의 AI는 답하지 않습니다.{" "}
          <span className="text-gold-soft">다만 묻습니다.</span>
        </p>
        <p>
          화두(話頭)는 천 년 넘게 이어져 온 한국 선(禪)의 물음입니다. 옛
          수행자들은 물음 하나를 몇 해씩 품고 다녔습니다. 이곳은 그 수행을
          아주 작게, 그러나 진지하게 옮겨 놓은 도량입니다.
        </p>
      </div>

      <div className="rise rise-d3 mt-12 border-t border-ink-3 pt-9">
        <h2 className="text-xs tracking-[0.5em] text-hanji-faint">이곳의 법도</h2>
        <ol className="mt-6 space-y-4 text-sm font-light leading-8 text-hanji-dim">
          <li>
            <span className="text-gold-soft">하나.</span> 화두를 받습니다.
            하루, 사흘, 이레, 혹은 스스로 정한 때 — 물음과 함께할 시간을
            정합니다.
          </li>
          <li>
            <span className="text-gold-soft">둘.</span> 그 시간이 지나기 전에는
            답을 쓸 수 없습니다. 스치는 생각은 사유의 방에 단상으로 남깁니다.
          </li>
          <li>
            <span className="text-gold-soft">셋.</span> 때가 되면 붓을 들어,
            보인 것을 기록합니다. 이것을 회향(回向)이라 부릅니다.
          </li>
          <li>
            <span className="text-gold-soft">넷.</span> 그때에야 옛 스승들의
            답이 열립니다. 그대의 답과 견주어 보십시오 — 정답은 없습니다.
          </li>
        </ol>
      </div>

      <div className="rise rise-d3 mt-12 border-t border-ink-3 pt-9">
        <h2 className="text-xs tracking-[0.5em] text-hanji-faint">
          몇 가지 말씀
        </h2>
        <ul className="mt-6 space-y-3.5 text-sm font-light leading-8 text-hanji-dim">
          <li>
            기록은 그대의 브라우저에만 남습니다. 우리는 그대의 깨달음을 읽지
            않습니다.
          </li>
          <li>
            어록은 무문관·벽암록·조주록 등 전승된 선어록을 우리말로 풀어 옮긴
            것입니다.
          </li>
          <li>
            이 도량은 특정 종단과 무관하며, 수행의 형식을 빌린 사유의
            공간입니다.
          </li>
        </ul>
      </div>

      <div className="rise rise-d4 mt-12">
        <Donation />
      </div>

      <p className="rise rise-d4 mt-10 text-center text-xs text-hanji-faint">
        문의 —{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline decoration-gold/25 underline-offset-4 transition-colors hover:text-hanji-dim"
        >
          {CONTACT_EMAIL}
        </a>
      </p>

      <p className="mt-12 text-center">
        <Link
          href="/"
          className="btn-obang inline-block px-9 py-3 text-xs tracking-[0.3em] text-hanji transition-opacity hover:opacity-90"
        >
          화두 받기
        </Link>
      </p>
    </div>
  );
}
