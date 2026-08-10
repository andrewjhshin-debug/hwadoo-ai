import Link from "next/link";
import Enso from "@/components/Enso";

// 404 — 길이 끊긴 곳도 하나의 화두다.
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rise opacity-70">
        <Enso size={110} />
      </div>
      <p className="rise rise-d1 mt-8 text-xs tracking-[0.5em] text-gold-soft">
        404 · 길이 끊긴 곳
      </p>
      <p className="rise rise-d1 mt-6 font-serif text-lg font-light leading-9 text-hanji">
        찾으시는 길이 없습니다.
      </p>
      <p className="rise rise-d2 mt-2 text-[13px] leading-7 text-hanji-dim">
        길이 끊긴 자리에서, 물음은 시작됩니다.
      </p>
      <Link
        href="/"
        className="btn-obang rise rise-d3 mt-10 px-8 py-3 text-[13px] tracking-[0.2em] text-hanji transition-opacity hover:opacity-90"
      >
        도량으로 돌아가다
      </Link>
    </div>
  );
}
