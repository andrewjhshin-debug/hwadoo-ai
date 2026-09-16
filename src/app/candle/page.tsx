// ────────────────────────────────────────────────────────────────
// 법당 — 초 공양과 회향의 등. 살림은 CandleHall 이 맡는다.
// ────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import CandleHall from "@/components/CandleHall";

export const metadata: Metadata = {
  title: "초 공양 — 이름 하나를 걸어 두는 자리",
  description:
    "연꽃 한 송이로 초를 켭니다. 이름과 기원 한 줄을 적으면 사흘 동안 법당에 탑니다. 공덕을 회향하면 함께 켜는 초가 밝아집니다.",
};

export default function CandlePage() {
  return <CandleHall />;
}
