import type { Metadata } from "next";

// 목탁과 염주 — "use client" 페이지라 여기(레이아웃)서 제목·설명을 단다
export const metadata: Metadata = {
  title: "목탁과 염주 — 손끝의 수행 | 화두",
  description:
    "목탁을 두드리고 염주 108알을 굴리는 디지털 수행 도구 — 소리와 함께 마음을 고릅니다.",
  alternates: { canonical: "/moktak" },
  openGraph: {
    title: "목탁과 염주 — 손끝의 수행 | 화두",
    description: "목탁을 두드리고 염주 108알을 굴리는 디지털 수행 도구.",
    url: "/moktak",
  },
};

export default function MoktakLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
