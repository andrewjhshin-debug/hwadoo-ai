import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, SLOGAN } from "@/lib/config";

export const metadata: Metadata = {
  title: "서비스 소개 — 화두",
  description: SLOGAN,
};

// 서비스 소개 — 구구절절하지 않게. 네 문장이면 충분하다.
export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-14">
      <p className="question-glow rise text-center font-serif text-xl font-light leading-[2] text-hanji sm:text-2xl">
        &ldquo;{SLOGAN}&rdquo;
      </p>

      <div className="rise rise-d1 mt-16 space-y-7 text-center font-serif text-lg font-light leading-9 text-hanji">
        <p>질문 하나를 드립니다.</p>
        <p className="text-hanji-dim">며칠 밤낮, 스스로 품으십시오.</p>
        <p>깨달은 것을 쓰십시오.</p>
        <p className="text-hanji-dim">다음 화두가 옵니다.</p>
      </div>

      <p className="rise rise-d2 mt-16 text-center text-xs leading-7 text-hanji-faint">
        기록은 내 브라우저에만 남습니다.
        <br />이 도량은 특정 종단과 무관합니다.
      </p>

      <p className="rise rise-d3 mt-10 text-center text-xs text-hanji-faint">
        문의 —{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline decoration-gold/25 underline-offset-4 transition-colors hover:text-hanji-dim"
        >
          {CONTACT_EMAIL}
        </a>
      </p>

      <p className="mt-10 text-center">
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
