// ────────────────────────────────────────────────────────────────
// 법당 — 초 공양과 회향의 등. 살림은 CandleHall 이 맡는다.
// ────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import CandleHall from "@/components/CandleHall";

export const metadata: Metadata = {
  title: "초 공양 — 이름 하나를 걸어 두는 자리",
  description:
    "연꽃 한 송이로 초를 켭니다. 이름과 태어난 해, 기원 한 줄을 적으면 마흔아흐레 동안 법당에 탑니다.",
};

export default function CandlePage() {
  return <CandleHall />;
}
