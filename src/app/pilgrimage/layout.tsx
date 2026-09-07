import type { Metadata } from "next";

// 절로(순례) — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "절로 — 전국 사찰 135곳 지도 | 화두",
  description:
    "가까운 절을 지도에서 찾아 직접 가 보세요. 지역별 사찰 지도와 템플스테이 정보 — 산문은 누구에게나 열려 있습니다.",
  alternates: { canonical: "/pilgrimage" },
  openGraph: {
    title: "절로 — 전국 사찰 135곳 지도 | 화두",
    description:
      "가까운 절을 지도에서 찾아 직접 가 보세요. 지역별 사찰 지도와 템플스테이 정보.",
    url: "/pilgrimage",
  },
};

export default function PilgrimageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
