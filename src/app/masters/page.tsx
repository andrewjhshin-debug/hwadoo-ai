import type { Metadata } from "next";
import { Quote } from "@/components/icons";

export const metadata: Metadata = {
  title: "선지식의 한마디 — 화두",
};

// 선지식의 한마디 — 비워 둔 방. 내용은 다시 설계될 예정.
export default function MastersPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rise opacity-50">
        <Quote className="h-8 w-8 text-gold-soft" />
      </div>
      <h1 className="rise rise-d1 mt-8 text-xs tracking-[0.5em] text-gold-soft">
        善知識 · 선지식의 한마디
      </h1>
      <p className="rise rise-d1 mt-7 font-serif text-lg font-light leading-9 text-hanji">
        스승들의 말을 고르고 있습니다.
      </p>
      <p className="rise rise-d2 mt-3 text-[13px] text-hanji-dim">
        곧 이 방이 채워집니다.
      </p>
    </div>
  );
}
