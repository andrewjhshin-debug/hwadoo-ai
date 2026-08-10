import type { Metadata } from "next";
import { Brush } from "@/components/icons";

export const metadata: Metadata = {
  title: "사유의 방 — 화두",
};

// 사유의 방 — 비워 둔 방. 내용은 다시 설계될 예정.
export default function RoomPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rise opacity-50">
        <Brush className="h-8 w-8 text-gold-soft" />
      </div>
      <h1 className="rise rise-d1 mt-8 text-xs tracking-[0.5em] text-gold-soft">
        思惟之房 · 사유의 방
      </h1>
      <p className="rise rise-d1 mt-7 font-serif text-lg font-light leading-9 text-hanji">
        이 방은 아직 비어 있습니다.
      </p>
      <p className="rise rise-d2 mt-3 text-[13px] text-hanji-dim">
        곧 문이 열립니다.
      </p>
    </div>
  );
}
