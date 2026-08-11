import type { Metadata } from "next";
import Link from "next/link";
import Enso from "@/components/Enso";

export const metadata: Metadata = {
  title: "호흡 명상 — 화두",
  description: "숨을 고르는 자리. 곧 문을 엽니다.",
};

// 호흡 명상 — 아직 준비 중인 방
export default function BreathPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rise opacity-70">
        <Enso size={110} />
      </div>

      <p className="rise rise-d1 mt-8 text-[11px] tracking-[0.5em] text-gold-soft">
        調息 · 호흡 명상
      </p>
      <p className="rise rise-d1 mt-6 break-keep font-serif text-lg font-light leading-9 text-hanji">
        숨을 고르는 자리를
        <br />
        마련하고 있습니다.
      </p>
      <p className="rise rise-d2 mt-4 break-keep text-[13px] leading-7 text-hanji-dim">
        화두를 들기 전, 마음을 가라앉히는 짧은 호흡.
        <br />곧 문을 엽니다.
      </p>

      <span className="rise rise-d2 mt-7 rounded-full border border-gold/40 px-4 py-1.5 text-[11px] tracking-[0.3em] text-gold-soft">
        곧
      </span>

      <Link
        href="/settings"
        className="rise rise-d3 mt-12 border border-ink-3 px-7 py-2.5 text-xs tracking-[0.25em] text-hanji-dim transition-colors hover:border-gold/40 hover:text-hanji"
      >
        내 도량으로
      </Link>
    </div>
  );
}
