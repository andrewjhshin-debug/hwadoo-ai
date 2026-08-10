import type { Metadata } from "next";
import Link from "next/link";
import { Lotus } from "@/components/icons";

export const metadata: Metadata = {
  title: "커뮤니티 — 화두",
};

// 커뮤니티(선방) — 아직 문을 열지 않았다.
// 로그인/DB가 붙는 다음 단계에서 연다.
export default function CommunityPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rise opacity-60">
        <Lotus className="h-10 w-10" stroke="#B99A54" />
      </div>
      <h1 className="rise rise-d1 mt-8 text-xs tracking-[0.5em] text-gold-soft">
        禪房 · 커뮤니티
      </h1>
      <p className="rise rise-d1 mt-7 font-serif text-lg font-light leading-9 text-hanji">
        선방(禪房)은 아직 문을 열지 않았습니다.
      </p>
      <p className="rise rise-d2 mt-4 max-w-md text-[13.5px] leading-8 text-hanji-dim">
        같은 화두를 품은 이들의 회향을 익명으로 나누는 방을 준비하고 있습니다.
        <br />
        서로의 답을 평가하지 않고, 다만 곁에 놓아두는 곳 —
        <br />
        문이 열리면 이 자리에서 알려드리겠습니다.
      </p>
      <Link
        href="/"
        className="btn-obang rise rise-d3 mt-10 px-8 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
      >
        그동안, 화두 받기
      </Link>
    </div>
  );
}
